const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const https = require('https');

let mainWindow;

const CURRENT_VERSION = '1.0.0';
const UPDATE_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/version.json';

function getDataPath() {
    return path.join(app.getPath('userData'), 'user.json');
}

function generateHwid() {
    const raw = os.hostname() + os.userInfo().username + os.platform() + os.arch();
    return crypto.createHash('sha1').update(raw).digest('hex');
}

function loadUserData() {
    const p = getDataPath();
    if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    const hwid = generateHwid();
    const uid = Math.floor(100000 + Math.random() * 900000);
    const data = { login: 'WEB DLC', group: 'Пользователь', hwid, uid: String(uid) };
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    return data;
}

function saveUserData(data) {
    fs.writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf8');
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Cache-Control': 'no-cache' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 850,
        height: 550,
        frame: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        transparent: false,
        backgroundColor: '#1a1028'
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('window-close', () => {
    mainWindow.close();
});

ipcMain.handle('get-user-data', () => {
    return loadUserData();
});

ipcMain.handle('save-user-data', (event, data) => {
    const existing = loadUserData();
    const merged = { ...existing, ...data };
    saveUserData(merged);
    return true;
});

ipcMain.handle('get-current-version', () => {
    return CURRENT_VERSION;
});

ipcMain.handle('check-update', async () => {
    try {
        const remote = await fetchJson(UPDATE_URL);
        const hasUpdate = remote.version !== CURRENT_VERSION;
        return { hasUpdate, version: remote.version, url: remote.url || null, changelog: remote.changelog || '' };
    } catch (e) {
        return { hasUpdate: false, error: e.message };
    }
});
