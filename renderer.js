const translations = {
    ru: {
        nav_home: 'Главная',
        nav_accounts: 'Аккаунты',
        nav_settings: 'Настройки',
        nav_exit: 'Выход',
        card_client: 'Клиент',
        profile_title: 'Профиль',
        profile_login: 'Логин',
        profile_group: 'Группа',
        group_user: 'Пользователь',
        settings_title: 'Настройки',
        detail_back: 'НАЗАД \u27A1',
        detail_desc: 'Мы создали для вас лучший клиент, который даст вам огромное преимущество в игре. В этом клиенте огромный функционал, который подойдет под все популярные сервера майнкрафт. В данный момент этот клиент находится в активном бета-тестировании, и это значит, что он может часто обновляться, чтобы ваш игровой опыт стал еще лучше.',
        detail_launch: 'ЗАПУСТИТЬ',
        settings_version: 'Версия',
        settings_update: 'Обновления',
        settings_check_update: 'Проверить',
        update_available: 'Доступно обновление',
        update_latest: 'Уже последняя версия',
        update_error: 'Ошибка проверки',
        dlc_label: 'DLC мод',
        dlc_local: 'Локально',
        dlc_check: 'Проверить DLC',
        dlc_new: 'Новая версия',
        dlc_install: 'Установить',
        dlc_installing: 'Установка...',
        dlc_installed: 'DLC установлен',
        dlc_up_to_date: 'DLC актуален',
        dlc_update_available: 'Доступно обновление DLC',
        dlc_install_error: 'Ошибка установки DLC',
        dlc_check_error: 'Ошибка проверки DLC'
    },
    en: {
        nav_home: 'Home',
        nav_accounts: 'Accounts',
        nav_settings: 'Settings',
        nav_exit: 'Exit',
        card_client: 'Client',
        profile_title: 'Profile',
        profile_login: 'Login',
        profile_group: 'Group',
        group_user: 'User',
        settings_title: 'Settings',
        detail_back: 'BACK \u27A1',
        detail_desc: 'We created the best client for you that will give you a huge advantage in the game. This client has a huge amount of features that will suit all popular minecraft servers. Currently this client is in active beta testing, which means it can be updated frequently to make your gaming experience even better.',
        detail_launch: 'LAUNCH',
        settings_version: 'Version',
        settings_update: 'Updates',
        settings_check_update: 'Check',
        update_available: 'Update available',
        update_latest: 'Already up to date',
        update_error: 'Check error',
        dlc_label: 'DLC mod',
        dlc_local: 'Local',
        dlc_check: 'Check DLC',
        dlc_new: 'New version',
        dlc_install: 'Install',
        dlc_installing: 'Installing...',
        dlc_installed: 'DLC installed',
        dlc_up_to_date: 'DLC up to date',
        dlc_update_available: 'DLC update available',
        dlc_install_error: 'DLC install error',
        dlc_check_error: 'DLC check error'
    }
};

let currentLang = 'ru';

function setLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });

    document.querySelectorAll('[data-i18n-value]').forEach(el => {
        const key = el.getAttribute('data-i18n-value');
        if (t[key]) el.textContent = t[key];
    });

    if (lang === 'ru') {
        document.getElementById('langFlag').innerHTML = '&#127479;&#127482;';
        document.getElementById('langText').textContent = 'Русский';
    } else {
        document.getElementById('langFlag').innerHTML = '&#127468;&#127463;';
        document.getElementById('langText').textContent = 'English';
    }

    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === lang);
    });

    window.electronAPI.saveUserData({ lang });
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;

        if (page === 'exit') {
            window.electronAPI.close();
            return;
        }

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('page-' + page);
        if (target) target.classList.add('active');
    });
});

const langSelector = document.getElementById('langSelector');
const langDropdown = document.getElementById('langDropdown');

langSelector.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('open');
});

document.addEventListener('click', () => {
    langDropdown.classList.remove('open');
});

document.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
        e.stopPropagation();
        setLanguage(opt.dataset.lang);
        langDropdown.classList.remove('open');
    });
});

async function loadProfile() {
    const data = await window.electronAPI.getUserData();
    document.getElementById('p-uid').textContent = data.uid;
    document.getElementById('p-login').value = data.login;
    document.getElementById('p-group').textContent = translations[currentLang].group_user;
    document.getElementById('p-hwid').textContent = data.hwid;

    if (data.lang) setLanguage(data.lang);
}

document.getElementById('p-login').addEventListener('change', async function () {
    const data = await window.electronAPI.getUserData();
    data.login = this.value || 'WEB DLC';
    await window.electronAPI.saveUserData(data);
});

loadProfile();

async function autoCheckDlc() {
    try {
        const result = await window.electronAPI.checkDlcUpdate();
        if (result.hasUpdate) {
            const status = document.getElementById('dlcStatus');
            const installRow = document.getElementById('dlcInstallRow');
            document.getElementById('dlc-version').textContent = result.remoteVersion;
            status.textContent = translations[currentLang].dlc_update_available + ': v' + result.remoteVersion;
            status.className = 'update-status';
            installRow.style.display = 'flex';
        }
    } catch (e) {}
}
autoCheckDlc();

document.getElementById('clientCard').addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-client-detail').classList.add('active');
});

document.getElementById('detailBack').addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-home').classList.add('active');
});

document.getElementById('detailLaunch').addEventListener('click', async () => {
    const btn = document.getElementById('detailLaunch');
    btn.disabled = true;
    btn.querySelector('span:last-child').textContent = translations[currentLang].dlc_installing || 'Запуск...';

    const result = await window.electronAPI.launchMc();
    btn.disabled = false;
    btn.querySelector('span:last-child').textContent = translations[currentLang].detail_launch;

    if (result.success) {
        window.electronAPI.close();
    } else {
        alert('Ошибка запуска: ' + result.error);
    }
});

async function initVersion() {
    const ver = await window.electronAPI.getCurrentVersion();
    document.getElementById('settings-version').textContent = ver;
}

document.getElementById('checkUpdateBtn').addEventListener('click', async () => {
    const status = document.getElementById('updateStatus');
    const btn = document.getElementById('checkUpdateBtn');
    const installRow = document.getElementById('launcherInstallRow');
    btn.disabled = true;
    btn.textContent = '...';
    status.textContent = '';
    status.className = 'update-status';
    if (installRow) installRow.style.display = 'none';

    const result = await window.electronAPI.checkUpdate();
    btn.disabled = false;

    if (result.error) {
        status.textContent = translations[currentLang].update_error || 'Ошибка проверки';
        status.className = 'update-status error';
        btn.textContent = translations[currentLang].settings_check_update || 'Проверить';
    } else if (result.hasUpdate) {
        status.textContent = (translations[currentLang].update_available || 'Доступно обновление') + ': v' + result.version;
        status.className = 'update-status';
        btn.textContent = translations[currentLang].settings_check_update || 'Проверить';
        if (installRow && result.url) {
            installRow.style.display = 'flex';
            window._pendingUpdateUrl = result.url;
        }
    } else {
        status.textContent = translations[currentLang].update_latest || 'Уже последняя версия';
        status.className = 'update-status success';
        btn.textContent = translations[currentLang].settings_check_update || 'Проверить';
    }
});

const launcherInstallBtn = document.getElementById('launcherInstallBtn');
if (launcherInstallBtn) {
    launcherInstallBtn.addEventListener('click', async () => {
        if (!window._pendingUpdateUrl) return;
        launcherInstallBtn.disabled = true;
        launcherInstallBtn.textContent = '...';
        await window.electronAPI.installUpdate(window._pendingUpdateUrl);
    });
}

initVersion();

async function initDlcStatus() {
    const status = await window.electronAPI.getDlcStatus();
    document.getElementById('dlc-local').textContent = status.localVersion;
    document.getElementById('dlc-version').textContent = status.localVersion;
}

document.getElementById('checkDlcBtn').addEventListener('click', async () => {
    const status = document.getElementById('dlcStatus');
    const btn = document.getElementById('checkDlcBtn');
    const installRow = document.getElementById('dlcInstallRow');
    btn.disabled = true;
    btn.textContent = '...';
    status.textContent = '';
    status.className = 'update-status';
    installRow.style.display = 'none';

    const result = await window.electronAPI.checkDlcUpdate();
    btn.disabled = false;
    btn.textContent = translations[currentLang].dlc_check;

    if (result.error) {
        status.textContent = translations[currentLang].dlc_check_error;
        status.className = 'update-status error';
    } else if (result.hasUpdate) {
        document.getElementById('dlc-version').textContent = result.remoteVersion;
        status.textContent = translations[currentLang].dlc_update_available + ': v' + result.remoteVersion;
        status.className = 'update-status';
        installRow.style.display = 'flex';
    } else {
        document.getElementById('dlc-version').textContent = result.remoteVersion;
        status.textContent = translations[currentLang].dlc_up_to_date;
        status.className = 'update-status success';
    }
});

document.getElementById('installDlcBtn').addEventListener('click', async () => {
    const status = document.getElementById('dlcStatus');
    const btn = document.getElementById('installDlcBtn');
    const installRow = document.getElementById('dlcInstallRow');
    btn.disabled = true;
    btn.textContent = translations[currentLang].dlc_installing;
    status.textContent = '';
    status.className = 'update-status';

    const result = await window.electronAPI.installDlc();
    btn.disabled = false;
    btn.textContent = translations[currentLang].dlc_install;

    if (result.success) {
        status.textContent = translations[currentLang].dlc_installed + ' (v' + result.version + ')';
        status.className = 'update-status success';
        installRow.style.display = 'none';
        document.getElementById('dlc-local').textContent = result.version;
        document.getElementById('dlc-version').textContent = result.version;
    } else {
        status.textContent = translations[currentLang].dlc_install_error + ': ' + result.error;
        status.className = 'update-status error';
    }
});

initDlcStatus();
