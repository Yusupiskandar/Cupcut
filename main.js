const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { ensureFfmpegAvailable, getVideoDuration, splitVideo, stopSplit } = require('./services/videoService');

function createWindow() {
  const win = new BrowserWindow({
    width: 880,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
  win.removeMenu();
}

app.whenReady().then(async () => {
  try {
    await ensureFfmpegAvailable();
  } catch (error) {
    dialog.showErrorBox('FFmpeg tidak ditemukan', `${error.message}\n\nPastikan FFmpeg dan FFprobe terpasang dan PATH sudah diatur.`);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('select-video', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Pilih file video',
    properties: ['openFile'],
    filters: [
      { name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'flv', 'ts'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Pilih folder output',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('check-ffmpeg', async () => {
  await ensureFfmpegAvailable();
  return true;
});

ipcMain.handle('read-video-metadata', async (_, videoPath) => {
  const durationSeconds = await getVideoDuration(videoPath);
  return durationSeconds;
});

ipcMain.handle('start-split', async (event, { videoPath, segmentMinutes, outputFolder, orientation }) => {
  return splitVideo({
    videoPath,
    segmentMinutes,
    outputFolder,
    orientation,
    progressCallback: (progress) => {
      event.sender.send('split-progress', progress);
    }
  });
});

ipcMain.handle('stop-split', async () => {
  const stopped = stopSplit();
  return stopped;
});
