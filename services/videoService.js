const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

let activeFfmpegProcess = null;
let stopRequested = false;

async function ensureFfmpegAvailable() {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new Error('Binary FFmpeg tidak tersedia. Pastikan dependensi ffmpeg-static terpasang.');
  }

  if (!ffprobePath || !fs.existsSync(ffprobePath)) {
    throw new Error('Binary FFprobe tidak tersedia. Pastikan dependensi ffprobe-static terpasang.');
  }
}

function getVideoMetadata(videoPath) {
  if (!fs.existsSync(videoPath)) {
    throw new Error('File video tidak ditemukan.');
  }

  try {
    const jsonOutput = execFileSync(ffprobePath, [
      '-v', 'error',
      '-print_format', 'json',
      '-show_entries', 'format=duration',
      '-show_streams',
      videoPath
    ], { encoding: 'utf8' });

    const metadata = JSON.parse(jsonOutput);
    const duration = Number(metadata.format?.duration);
    const videoStream = (metadata.streams || []).find((stream) => stream.codec_type === 'video');

    if (videoStream && Number.isFinite(duration) && duration > 0) {
      const width = Number(videoStream.width);
      const height = Number(videoStream.height);

      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        return { duration, width, height };
      }
    }
  } catch (error) {
    // fallback to simpler probe if JSON output is incomplete or invalid
  }

  const durationOutput = execFileSync(ffprobePath, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    videoPath
  ], { encoding: 'utf8' });
  const duration = Number(durationOutput.trim());

  const dimensionsOutput = execFileSync(ffprobePath, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    videoPath
  ], { encoding: 'utf8' });

  const [widthRaw, heightRaw] = dimensionsOutput.trim().split(/\r?\n/);
  const width = Number(widthRaw);
  const height = Number(heightRaw);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Tidak dapat membaca durasi video dari file ini.');
  }

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Tidak dapat membaca dimensi video dari file ini.');
  }

  return { duration, width, height };
}

function getVideoDuration(videoPath) {
  return getVideoMetadata(videoPath).duration;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    stopRequested = false;
    const process = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    activeFfmpegProcess = process;
    let stderr = '';

    process.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    process.on('error', (error) => {
      activeFfmpegProcess = null;
      reject(error);
    });

    process.on('close', (code) => {
      activeFfmpegProcess = null;
      if (stopRequested) {
        reject(new Error('Proses dihentikan oleh pengguna.'));
        return;
      }

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg gagal dengan kode ${code}: ${stderr.trim()}`));
      }
    });
  });
}

function stopSplit() {
  if (!activeFfmpegProcess || activeFfmpegProcess.killed) {
    return false;
  }

  stopRequested = true;

  try {
    if (activeFfmpegProcess.stdin && !activeFfmpegProcess.stdin.destroyed) {
      activeFfmpegProcess.stdin.write('q');
      activeFfmpegProcess.stdin.end();
    }
  } catch (error) {
    // ignore if stdin is unavailable
  }

  setTimeout(() => {
    if (activeFfmpegProcess && !activeFfmpegProcess.killed) {
      try {
        activeFfmpegProcess.kill('SIGKILL');
      } catch (error) {
        // ignore kill failure
      }
    }
  }, 3000);

  return true;
}

async function splitVideo({ videoPath, segmentMinutes, outputFolder, orientation = 'landscape', progressCallback }) {
  if (!fs.existsSync(videoPath)) {
    throw new Error('File video input tidak ditemukan.');
  }

  if (!fs.existsSync(outputFolder)) {
    throw new Error('Folder output tidak ditemukan.');
  }

  const segmentSeconds = Number(segmentMinutes) * 60;
  if (!Number.isFinite(segmentSeconds) || segmentSeconds <= 0) {
    throw new Error('Durasi potong harus lebih dari 0 menit.');
  }

  if (!['portrait', 'landscape'].includes(orientation)) {
    throw new Error('Orientasi output tidak valid. Pilih portrait atau landscape.');
  }

  const metadata = getVideoMetadata(videoPath);
  const totalDuration = metadata.duration;
  const totalSegments = Math.max(1, Math.ceil(totalDuration / segmentSeconds));
  const baseName = path.parse(videoPath).name.replace(/\s+/g, '_');
  const padLength = String(totalSegments).length;
  const outputFiles = [];

  for (let index = 0; index < totalSegments; index += 1) {
    const segmentIndex = index + 1;
    const startSeconds = index * segmentSeconds;
    const remainingSeconds = totalDuration - startSeconds;
    const currentDuration = Math.min(segmentSeconds, remainingSeconds);
    const suffix = orientation === 'portrait' ? 'portrait' : 'landscape';
    const outputFileName = `${baseName}-${suffix}-part-${String(segmentIndex).padStart(padLength, '0')}.mp4`;
    const outputPath = path.join(outputFolder, outputFileName);

    progressCallback?.({ current: segmentIndex, total: totalSegments, fileName: outputFileName });

    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-ss', String(startSeconds),
      '-i', videoPath,
      '-t', String(currentDuration)
    ];

    if (orientation === 'portrait') {
      const targetWidth = 1080;
      const targetHeight = 1920;
      const sourceWidth = metadata.width;
      const sourceHeight = metadata.height;
      const targetAspect = targetWidth / targetHeight;
      let cropWidth;
      let cropHeight;

      if (sourceWidth / sourceHeight >= targetAspect) {
        cropHeight = sourceHeight;
        cropWidth = Math.round(sourceHeight * targetAspect);
      } else {
        cropWidth = sourceWidth;
        cropHeight = Math.round(sourceWidth / targetAspect);
      }

      const cropX = Math.round((sourceWidth - cropWidth) / 2);
      const cropY = Math.round((sourceHeight - cropHeight) / 2);
      const filter = `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY},scale=${targetWidth}:${targetHeight}`;

      args.push('-vf', filter);
    }

    args.push(
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'fast',
      '-y',
      outputPath
    );

    try {
      await runFfmpeg(args);
      outputFiles.push(outputPath);
    } catch (error) {
      if (stopRequested && fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch (cleanupError) {
          // ignore cleanup failure
        }
      }
      throw error;
    }
  }

  return { outputFiles, totalSegments };
}

module.exports = {
  ensureFfmpegAvailable,
  getVideoDuration,
  splitVideo,
  stopSplit
};
