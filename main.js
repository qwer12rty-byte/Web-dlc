const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const https = require('https');

let mainWindow;

const CURRENT_VERSION = '1.6';
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

const { spawn } = require('child_process');
const { dialog } = require('electron');

ipcMain.handle('launch-mc', async () => {
    try {
        const home = os.homedir();
        const tlBase = path.join(home, 'AppData', 'Roaming', '.tlauncher', 'legacy', 'Minecraft', 'game');
        const versionsDir = path.join(tlBase, 'versions');
        const runDir = path.join(home, 'AppData', 'Roaming', '.minecraft', 'run');

        const exeDir = path.dirname(app.getPath('exe'));
        const parentDir = path.dirname(exeDir);
        let javaPath = null;
        const jreCandidates = [
            path.join(parentDir, 'wyvern-jre'),
            path.join(exeDir, 'jre'),
            path.join(parentDir, 'jre')
        ];
        for (const jc of jreCandidates) {
            if (fs.existsSync(jc)) {
                const entries = fs.readdirSync(jc).filter(e => fs.statSync(path.join(jc, e)).isDirectory());
                if (entries.length > 0) {
                    const p = path.join(jc, entries[0], 'bin', 'java.exe');
                    if (fs.existsSync(p)) { javaPath = p; break; }
                }
            }
        }
        if (!javaPath) return { success: false, error: 'Java 21 not found' };

        let fabricDir = null;
        for (const c of ['Fabric 1.21.4', 'Fabric 1.21.11']) {
            const p = path.join(versionsDir, c);
            if (fs.existsSync(path.join(p, c + '.json'))) { fabricDir = p; break; }
        }
        if (!fabricDir) return { success: false, error: 'Fabric version not found' };

        const verName = path.basename(fabricDir);
        const json = JSON.parse(fs.readFileSync(path.join(fabricDir, verName + '.json'), 'utf8'));
        const jarPath = path.join(fabricDir, verName + '.jar');

        const libsDir = path.join(tlBase, 'libraries');
        const classpath = [];
        const seenArtifacts = {};

        function parseVer(v) {
            const num = v.split(/[+]/)[0];
            const parts = num.split('.').map(s => parseInt(s, 10) || 0);
            return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
        }

        for (const lib of json.libraries) {
            if (lib.name) {
                const parts = lib.name.split(':');
                const key = parts[0] + ':' + parts[1];
                const ver = parts[2];
                if (seenArtifacts[key]) {
                    if (parseVer(ver) <= parseVer(seenArtifacts[key].ver)) continue;
                    const idx = classpath.indexOf(seenArtifacts[key].path);
                    if (idx !== -1) classpath.splice(idx, 1);
                }
                const filePath = parts[0].replace(/\./g, '/') + '/' + parts[1] + '/' + parts[2] + '/' + parts[1] + '-' + parts[2] + '.jar';
                const localPath = path.join(libsDir, filePath);
                if (fs.existsSync(localPath)) {
                    classpath.push(localPath);
                    seenArtifacts[key] = { ver, path: localPath };
                }
            }
        }
        classpath.push(jarPath);

        const userData = loadUserData();
        const username = userData.login || 'WEB DLC';
        const uuid = userData.uid || '00000000000000000000000000000000';

        const nativesDir = path.join(fabricDir, 'natives');
        fs.mkdirSync(nativesDir, { recursive: true });
        fs.mkdirSync(runDir, { recursive: true });

        const args = [
            '-Xmx2G', '-Xms512M',
            '-Dfile.encoding=UTF8',
            '-Djava.net.preferIPv4Stack=true',
            '--add-opens=java.base/java.lang=ALL-UNNAMED',
            '--add-opens=java.base/java.time=ALL-UNNAMED',
            '--add-opens=java.base/java.io=ALL-UNNAMED',
            '--add-opens=java.base/java.nio=ALL-UNNAMED',
            '--add-opens=java.base/java.nio.file=ALL-UNNAMED',
            '--add-opens=java.base/java.util=ALL-UNNAMED',
            '--add-opens=java.base/java.util.regex=ALL-UNNAMED',
            '--add-opens=java.base/sun.nio.ch=ALL-UNNAMED',
            '--add-opens=java.base/sun.nio.fs=ALL-UNNAMED',
            '--add-opens=java.base/sun.security.ssl=ALL-UNNAMED',
            '--add-opens=java.desktop/java.awt=ALL-UNNAMED',
            '--add-opens=java.desktop/sun.awt.image=ALL-UNNAMED',
            '--add-opens=java.desktop/sun.java2d=ALL-UNNAMED',
            '--add-opens=java.desktop/javax.swing=ALL-UNNAMED',
            '--add-modules', 'jdk.zipfs',
            '-Djava.library.path=' + nativesDir,
            '-Djna.tmpdir=' + nativesDir,
            '-Dorg.lwjgl.system.SharedLibraryExtractPath=' + nativesDir,
            '-Dio.netty.native.workdir=' + nativesDir,
            '-Dminecraft.launcher.brand=WEB-DLC',
            '-Dminecraft.launcher.version=' + CURRENT_VERSION,
            '-cp', classpath.join(';'),
            json.mainClass,
            '--username', username,
            '--version', verName,
            '--gameDir', runDir,
            '--assetsDir', path.join(tlBase, 'assets'),
            '--assetIndex', '1.21',
            '--uuid', uuid,
            '--accessToken', '0',
            '--userType', 'mojang',
            '--versionType', 'release',
            '--width', '854',
            '--height', '480'
        ];

        fs.writeFileSync(path.join(runDir, 'launch_log.txt'),
            'java: ' + javaPath + '\nclasspath entries: ' + classpath.length + '\nmainClass: ' + json.mainClass + '\nverName: ' + verName + '\n',
            'utf8'
        );

        const child = spawn(javaPath, args, {
            cwd: runDir,
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderr = '';
        child.stderr.on('data', d => { stderr += d; });
        child.stdout.on('data', () => {});
        child.on('error', (err) => {
            dialog.showErrorBox('Launch Error', 'Failed to start: ' + err.message);
        });
        child.on('exit', (code) => {
            if (code !== 0 && stderr) {
                fs.writeFileSync(path.join(runDir, 'launch_error.txt'), stderr, 'utf8');
                dialog.showErrorBox('MC Error (exit ' + code + ')\n\n' + stderr.substring(0, 2000));
            }
        });
        child.unref();

        return { success: true, pid: child.pid };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
