const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close'),
    getUserData: () => ipcRenderer.invoke('get-user-data'),
    saveUserData: (data) => ipcRenderer.invoke('save-user-data', data),
    getCurrentVersion: () => ipcRenderer.invoke('get-current-version'),
    checkUpdate: () => ipcRenderer.invoke('check-update'),
    installUpdate: (url) => ipcRenderer.invoke('install-update', url),
    checkDlcUpdate: () => ipcRenderer.invoke('check-dlc-update'),
    installDlc: () => ipcRenderer.invoke('install-dlc'),
    getDlcStatus: () => ipcRenderer.invoke('get-dlc-status'),
    getHwid: () => ipcRenderer.invoke('get-hwid'),
    launchMc: () => ipcRenderer.invoke('launch-mc')
});
