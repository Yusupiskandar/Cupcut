const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

async function ensureFfmpegAvailable() {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new Error('Binary FFmpeg tidak tersedia. Pastikan dependensi ffmpeg-static terpasang.');
  }

  if (!ffprobePath || !fs.existsSync(ffprobePath)) {
    throw new Error('Binary FFprobe tidak tersedia. Pastikan dependensi ffprobe-static terpasang.');
  }
}

function getVideoDuration(videoPath) {
  if (!fs.existsSync(videoPath)) {
    throw new Error('File video tidak ditemukan.');
  }

  const output = execFileSync(ffprobePath, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    videoPath
  ], { encoding: 'utf8' });

  const duration = Number(output.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Tidak dapat membaca durasi video dari file ini.');
  }

  return duration;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    process.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    process.on('error', (error) => reject(error));
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg gagal dengan kode ${code}: ${stderr.trim()}`));
      }
    });
  });
}

async function splitVideo({ videoPath, segmentMinutes, outputFolder, progressCallback }) {
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

  const totalDuration = getVideoDuration(videoPath);
  const totalSegments = Math.max(1, Math.ceil(totalDuration / segmentSeconds));
  const baseName = path.parse(videoPath).name.replace(/\s+/g, '_');
  const padLength = String(totalSegments).length;
  const outputFiles = [];

  for (let index = 0; index < totalSegments; index += 1) {
    const segmentIndex = index + 1;
    const startSeconds = index * segmentSeconds;
    const remainingSeconds = totalDuration - startSeconds;
    const currentDuration = Math.min(segmentSeconds, remainingSeconds);
    const outputFileName = `${baseName}-part-${String(segmentIndex).padStart(padLength, '0')}.mp4`;
    const outputPath = path.join(outputFolder, outputFileName);

    progressCallback?.({ current: segmentIndex, total: totalSegments, fileName: outputFileName });

    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-ss', String(startSeconds),
      '-i', videoPath,
      '-t', String(currentDuration),
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'fast',
      '-y',
      outputPath
    ];

    await runFfmpeg(args);
    outputFiles.push(outputPath);
  }

  return { outputFiles, totalSegments };
}

module.exports = {
  ensureFfmpegAvailable,
  getVideoDuration,
  splitVideo
};
