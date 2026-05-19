const selectVideoButton = document.getElementById('select-video');
const selectOutputButton = document.getElementById('select-output-folder');
const startSplitButton = document.getElementById('start-split');
const videoPathText = document.getElementById('video-path');
const outputPathText = document.getElementById('output-path');
const durationInput = document.getElementById('segment-duration');
const orientationSelect = document.getElementById('output-orientation');
const statusBox = document.getElementById('status');
const progressBox = document.getElementById('progress');
const resultsBox = document.getElementById('results');

let selectedVideoPath = null;
let selectedOutputFolder = null;
let ffmpegReady = false;

function setStatus(message, type = 'info') {
  statusBox.textContent = `Status: ${message}`;
  statusBox.className = `status-box ${type}`;
}

function appendResult(message) {
  const entry = document.createElement('div');
  entry.textContent = message;
  resultsBox.appendChild(entry);
}

async function initialize() {
  try {
    await window.api.checkFfmpeg();
    setStatus('FFmpeg terdeteksi, aplikasi siap digunakan.', 'success');
    ffmpegReady = true;
  } catch (error) {
    setStatus('FFmpeg tidak ditemukan. Pastikan FFmpeg dan FFprobe terpasang di PATH.', 'error');
    ffmpegReady = false;
    startSplitButton.disabled = true;
  }
}

selectVideoButton.addEventListener('click', async () => {
  const path = await window.api.selectVideo();
  if (!path) return;
  selectedVideoPath = path;
  videoPathText.textContent = path;
  setStatus('File video dipilih. Silakan pilih folder output dan mulai proses.', 'info');
});

selectOutputButton.addEventListener('click', async () => {
  const folder = await window.api.selectOutputFolder();
  if (!folder) return;
  selectedOutputFolder = folder;
  outputPathText.textContent = folder;
  setStatus('Folder output dipilih. Siap memproses video.', 'info');
});

startSplitButton.addEventListener('click', async () => {
  if (!ffmpegReady) {
    setStatus('FFmpeg tidak tersedia, proses dibatalkan.', 'error');
    return;
  }

  if (!selectedVideoPath) {
    setStatus('Pilih file video terlebih dahulu.', 'error');
    return;
  }

  if (!selectedOutputFolder) {
    setStatus('Pilih folder output terlebih dahulu.', 'error');
    return;
  }

  const segmentMinutes = Number(durationInput.value);
  if (!segmentMinutes || segmentMinutes <= 0) {
    setStatus('Durasi potong harus berupa angka lebih dari 0.', 'error');
    return;
  }

  const orientation = orientationSelect.value;
  if (!['portrait', 'landscape'].includes(orientation)) {
    setStatus('Pilih orientasi output yang valid.', 'error');
    return;
  }

  statusBox.scrollIntoView({ behavior: 'smooth' });
  progressBox.textContent = '';
  resultsBox.innerHTML = '';
  setStatus('Memulai proses splitting video...', 'info');
  startSplitButton.disabled = true;

  try {
    const result = await window.api.startSplit({
      videoPath: selectedVideoPath,
      segmentMinutes,
      outputFolder: selectedOutputFolder,
      orientation
    });

    setStatus(`Selesai. ${result.outputFiles.length} file ${orientation} berhasil dibuat.`, 'success');
    appendResult(`Total file: ${result.outputFiles.length}`);
    result.outputFiles.forEach((filePath) => appendResult(filePath));
  } catch (error) {
    setStatus(error.message || 'Terjadi kesalahan saat memproses video.', 'error');
    appendResult(error.message || String(error));
  } finally {
    startSplitButton.disabled = false;
  }
});

window.api.onProgress((progress) => {
  progressBox.textContent = `Memproses bagian ${progress.current} dari ${progress.total} — ${progress.fileName}`;
});

initialize();
