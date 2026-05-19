const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectVideo: () => ipcRenderer.invoke('select-video'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  checkFfmpeg: () => ipcRenderer.invoke('check-ffmpeg'),
  readVideoMetadata: (videoPath) => ipcRenderer.invoke('read-video-metadata', videoPath),
  startSplit: (options) => ipcRenderer.invoke('start-split', options),
  stopSplit: () => ipcRenderer.invoke('stop-split'),
  onProgress: (callback) => ipcRenderer.on('split-progress', (_, progress) => callback(progress))
});
