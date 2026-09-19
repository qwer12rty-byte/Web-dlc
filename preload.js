const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close'),
    getUserData: () => ipcRenderer.invoke('get-user-data'),
    saveUserData: (data) => ipcRenderer.invoke('save-user-data', data),
    getCurrentVersion: () => ipcRenderer.invoke('get-current-version'),
    checkUpdate: () => ipcRenderer.invoke('check-update')
});
