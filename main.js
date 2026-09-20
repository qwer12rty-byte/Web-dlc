const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const https = require('https');

let mainWindow;

const CURRENT_VERSION = '1.4';
const UPDATE_URL = 'https://raw.githubusercontent.com/qwer12rty-byte/Web-dlc/main/version.json';
const DLC_VERSION_URL = 'https://raw.githubusercontent.com/qwer12rty-byte/Web-dlc/main/dlc_version.json';
const HWID_URL = 'https://raw.githubusercontent.com/qwer12rty-byte/Web-dlc/main/hwids.json';

function getGithubToken() {
    const tokenPath = path.join(__dirname, '.token');
    if (fs.existsSync(tokenPath)) {
        return fs.readFileSync(tokenPath, 'utf8').trim();
    }
    return '';
}

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

    ensureHwidRegistered().then(() => {
        mainWindow.loadFile('index.html');
    });
}

async function ensureHwidRegistered() {
    try {
        const data = loadUserData();
        const hwid = data.hwid;
        const remote = await fetchJson(HWID_URL);
        if (!remote.hwids) remote.hwids = [];
        if (!remote.hwids.includes(hwid)) {
            remote.hwids.push(hwid);
            await uploadHwids(remote.hwids);
        }
    } catch (e) {
    }
}

async function uploadHwids(hwids) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ hwids }, null, 2);
        const token = getGithubToken();
        https.get({
            hostname: 'api.github.com',
            path: '/repos/qwer12rty-byte/Web-dlc/contents/hwids.json',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'WEB-DLC-Launcher'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const file = JSON.parse(data);
                    const putBody = JSON.stringify({
                        message: 'Auto-register HWID',
                        content: Buffer.from(body).toString('base64'),
                        sha: file.sha
                    });
                    const req = https.request({
                        hostname: 'api.github.com',
                        path: '/repos/qwer12rty-byte/Web-dlc/contents/hwids.json',
                        method: 'PUT',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Accept': 'application/vnd.github+json',
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(putBody),
                            'User-Agent': 'WEB-DLC-Launcher'
                        }
                    }, (putRes) => {
                        resolve();
                    });
                    req.on('error', reject);
                    req.write(putBody);
                    req.end();
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
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

function getModsFolder() {
    const home = os.homedir();
    const candidates = [
        path.join(home, 'AppData', 'Roaming', '.minecraft', 'mods'),
        path.join(home, 'AppData', 'Roaming', '.fabric', 'mods'),
        path.join(home, 'AppData', 'Roaming', '.minecraft', 'versions', '1.21.4', 'mods')
    ];
    for (const dir of candidates) {
        if (fs.existsSync(dir)) return dir;
    }
    const fallback = candidates[0];
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
}

function getLocalDlcVersion() {
    const data = loadUserData();
    return data.dlcVersion || '0';
}

function setLocalDlcVersion(ver) {
    const data = loadUserData();
    data.dlcVersion = ver;
    saveUserData(data);
}

ipcMain.handle('check-dlc-update', async () => {
    try {
        const remote = await fetchJson(DLC_VERSION_URL);
        const localVer = getLocalDlcVersion();
        const hasUpdate = remote.version !== localVer;
        return {
            hasUpdate,
            remoteVersion: remote.version,
            localVersion: localVer,
            filename: remote.filename || null,
            url: remote.url || null,
            changelog: remote.changelog || ''
        };
    } catch (e) {
        return { hasUpdate: false, error: e.message };
    }
});

ipcMain.handle('install-dlc', async () => {
    try {
        const remote = await fetchJson(DLC_VERSION_URL);
        if (!remote.url) return { success: false, error: 'No download URL' };

        const modsDir = getModsFolder();
        const dest = path.join(modsDir, remote.filename || 'wyvernpepe.jar');

        await downloadFile(remote.url, dest);
        setLocalDlcVersion(remote.version);
        return { success: true, version: remote.version, path: dest };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-dlc-status', () => {
    return {
        localVersion: getLocalDlcVersion(),
        modsFolder: getModsFolder()
    };
});

ipcMain.handle('get-hwid', () => {
    const data = loadUserData();
    return data.hwid;
});
