import express from 'express';
import cors from 'cors';
import net from 'net';
import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Пути к конфигам
const CONFIG_PATHS = {
    channels: join(__dirname, 'config', 'channels.json'),
    pbis: join(__dirname, 'config', 'pbis.json'),
    settings: join(__dirname, 'config', 'settings.json')
};

// Путь к статике
const STATIC_PATH = join(__dirname, 'static');
const ICONS_PATH = join(STATIC_PATH, 'img');

// Проверка наличия статики
const hasStaticBuild = existsSync(join(STATIC_PATH, 'index.html'));

// ============ Загрузка и сохранение конфигов ============
const loadConfig = async (type) => {
    try {
        const data = await readFile(CONFIG_PATHS[type], 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`❌ Ошибка загрузки ${type}:`, error.message);
        throw error;
    }
};

const saveConfig = async (type, data) => {
    try {
        await writeFile(CONFIG_PATHS[type], JSON.stringify(data, null, 2), 'utf-8');
        console.log(`✅ ${type} сохранен`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка сохранения ${type}:`, error.message);
        throw error;
    }
};

// ============ Синхронизация иконок ============
let isSyncing = false;
let lastSyncTime = null;
let syncStats = null;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const syncIcons = async () => {
    if (isSyncing) {
        console.log('⚠️ Синхронизация уже запущена');
        return;
    }

    isSyncing = true;
    lastSyncTime = new Date();

    try {
        console.log('🔄 Начинаем синхронизацию иконок...');

        // Создаем папку если нужно
        if (!existsSync(ICONS_PATH)) {
            await mkdir(ICONS_PATH, { recursive: true });
        }

        // Загружаем конфиг каналов
        const channels = await loadConfig('channels');
        console.log(`📋 Загружено ${channels.length} каналов`);

        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;
        const errors = [];

        for (const channel of channels) {
            if (!channel.img) {
                skipCount++;
                continue;
            }

            const iconUrl = `http://epg.one/img/${channel.img}.png`;
            const iconPath = join(ICONS_PATH, `${channel.img}.png`);

            // Проверяем существование
            if (existsSync(iconPath)) {
                skipCount++;
                continue;
            }

            // Загружаем с повторными попытками
            let loaded = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const response = await axios.get(iconUrl, {
                        responseType: 'arraybuffer',
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    const contentType = response.headers['content-type'];
                    if (!contentType || !contentType.startsWith('image/')) {
                        throw new Error(`Неверный тип контента: ${contentType}`);
                    }

                    await writeFile(iconPath, response.data);
                    loaded = true;
                    successCount++;
                    console.log(`✅ ${channel.img} - загружено (${(response.data.length / 1024).toFixed(1)} KB)`);
                    break;

                } catch (error) {
                    if (attempt < 3) {
                        await delay(500);
                    } else {
                        errors.push({ img: channel.img, error: error.message });
                        failCount++;
                        console.log(`❌ ${channel.img} - ошибка: ${error.message}`);
                    }
                }
            }

            await delay(300);
        }

        syncStats = {
            success: successCount,
            fail: failCount,
            skip: skipCount,
            errors: errors,
            total: channels.length,
            timestamp: new Date().toISOString()
        };

        console.log('');
        console.log(`✅ Успешно: ${successCount}`);
        console.log(`❌ Ошибок: ${failCount}`);
        console.log(`⏭️ Пропущено: ${skipCount}`);

        return syncStats;

    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error.message);
        throw error;
    } finally {
        isSyncing = false;
    }
};

const getSyncStatus = async () => {
    try {
        let iconCount = 0;
        let iconSize = 0;

        if (existsSync(ICONS_PATH)) {
            const files = await readdir(ICONS_PATH);
            const pngFiles = files.filter(f => f.endsWith('.png'));
            iconCount = pngFiles.length;

            for (const file of pngFiles) {
                const filePath = join(ICONS_PATH, file);
                const stats = await stat(filePath);
                iconSize += stats.size;
            }
        }

        const channels = await loadConfig('channels');
        const totalChannels = channels.filter(c => c.img).length;

        return {
            isSyncing,
            lastSyncTime,
            stats: syncStats,
            icons: {
                count: iconCount,
                totalNeeded: totalChannels,
                progress: totalChannels > 0 ? Math.round((iconCount / totalChannels) * 100) : 0,
                size: (iconSize / 1024 / 1024).toFixed(2) + ' MB'
            }
        };
    } catch (error) {
        return {
            isSyncing,
            lastSyncTime,
            error: error.message,
            icons: {
                count: 0,
                totalNeeded: 0,
                progress: 0,
                size: '0 MB'
            }
        };
    }
};

// ============ Middleware ============
app.use(cors());
app.use(express.json());

// Раздача статики (если есть сборка)
if (hasStaticBuild) {
    console.log('📁 Раздача статических файлов из:', STATIC_PATH);
    app.use(express.static(STATIC_PATH));
}

// ============ API маршруты ============

// GET маршруты
app.get('/api/channels', async (req, res) => {
    try {
        const data = await loadConfig('channels');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load channels' });
    }
});

app.get('/api/pbis', async (req, res) => {
    try {
        const data = await loadConfig('pbis');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load PBIs' });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const data = await loadConfig('settings');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

app.get('/api/sync-status', async (req, res) => {
    try {
        const status = await getSyncStatus();
        res.json(status);
    } catch (error) {
        console.error('Status error:', error);
        // Возвращаем базовый статус даже при ошибке
        res.json({
            isSyncing: false,
            lastSyncTime: null,
            error: error.message,
            icons: {
                count: 0,
                totalNeeded: 0,
                progress: 0,
                size: '0 MB'
            }
        });
    }
});

// ============ ВАЖНО: BULK маршруты должны быть ПЕРЕД динамическими ============

// МАССОВОЕ СОХРАНЕНИЕ (bulk) - ДОЛЖНЫ БЫТЬ ПЕРВЫМИ!
app.put('/api/channels/bulk', async (req, res) => {
    try {
        const channels = req.body;

        if (!Array.isArray(channels)) {
            return res.status(400).json({ error: 'Expected array of channels' });
        }

        for (const channel of channels) {
            if (!channel.num || !channel.name) {
                return res.status(400).json({ error: 'Each channel must have num and name' });
            }
        }

        await saveConfig('channels', channels);
        res.json({ success: true, message: `${channels.length} channels saved` });
    } catch (error) {
        console.error('Bulk save error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/pbis/bulk', async (req, res) => {
    try {
        const pbis = req.body;

        if (!Array.isArray(pbis)) {
            return res.status(400).json({ error: 'Expected array of PBIs' });
        }

        for (const pbi of pbis) {
            if (!pbi.num || !pbi.host) {
                return res.status(400).json({ error: 'Each PBI must have num and host' });
            }
        }

        await saveConfig('pbis', pbis);
        res.json({ success: true, message: `${pbis.length} PBIs saved` });
    } catch (error) {
        console.error('Bulk save error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sync-icons', async (req, res) => {
    try {
        // Запускаем синхронизацию в фоне
        syncIcons().then(() => {
            console.log('✅ Синхронизация иконок завершена');
        }).catch(err => {
            console.error('❌ Ошибка синхронизации:', err);
        });

        res.json({
            success: true,
            message: 'Синхронизация иконок запущена в фоновом режиме'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST маршруты (создание)
app.post('/api/channels', async (req, res) => {
    try {
        const channels = await loadConfig('channels');
        const newChannel = { ...req.body, num: channels.length + 1 };
        channels.push(newChannel);
        await saveConfig('channels', channels);
        res.json(newChannel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pbis', async (req, res) => {
    try {
        const pbis = await loadConfig('pbis');
        const newPbi = {
            ...req.body,
            num: pbis.length + 1,
            password: req.body.password || '12345'
        };
        pbis.push(newPbi);
        await saveConfig('pbis', pbis);
        res.json(newPbi);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ДИНАМИЧЕСКИЕ маршруты (с параметрами) - ПОСЛЕ BULK ============

// PUT маршруты (обновление отдельных записей)
app.put('/api/channels/:num', async (req, res) => {
    try {
        const num = parseInt(req.params.num);
        const channels = await loadConfig('channels');
        const index = channels.findIndex(c => c.num === num);

        if (index === -1) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        channels[index] = { ...channels[index], ...req.body, num };
        await saveConfig('channels', channels);
        res.json(channels[index]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/pbis/:num', async (req, res) => {
    try {
        const num = parseInt(req.params.num);
        const pbis = await loadConfig('pbis');
        const index = pbis.findIndex(p => p.num === num);

        if (index === -1) {
            return res.status(404).json({ error: 'PBI not found' });
        }

        pbis[index] = { ...pbis[index], ...req.body, num };
        await saveConfig('pbis', pbis);
        res.json(pbis[index]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        await saveConfig('settings', req.body);
        res.json(req.body);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE маршруты
app.delete('/api/channels/:num', async (req, res) => {
    try {
        const num = parseInt(req.params.num);
        const channels = await loadConfig('channels');
        const filtered = channels.filter(c => c.num !== num);

        if (filtered.length === channels.length) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        await saveConfig('channels', filtered);
        res.json({ success: true, message: 'Channel deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/pbis/:num', async (req, res) => {
    try {
        const num = parseInt(req.params.num);
        const pbis = await loadConfig('pbis');
        const filtered = pbis.filter(p => p.num !== num);

        if (filtered.length === pbis.length) {
            return res.status(404).json({ error: 'PBI not found' });
        }

        await saveConfig('pbis', filtered);
        res.json({ success: true, message: 'PBI deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ Telnet reboot ============
app.post('/api/reboot', async (req, res) => {
    const { host, password: customPassword } = req.body;

    if (!host) {
        return res.status(400).json({ error: 'Host is required' });
    }

    try {
        const settings = await loadConfig('settings');
        const {
            user = 'root',
            password: defaultPassword = '11',
            pbiPassword = '12345',
            port = 23,
            timeout = 10000
        } = settings.telnet || {};

        const password = customPassword || defaultPassword;

        console.log(`🔑 Используем пароль для ${host}: ${password === '12345' ? 'PBI' : 'стандартный'}`);

        await rebootDevice(host, port, user, password, timeout);
        res.json({ success: true, message: `Device ${host} rebooted` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ Telnet функция ============
function rebootDevice(host, port, user, password, timeout) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let buffer = '';
        let isAuthenticated = false;
        let isRebooted = false;
        let timeoutId;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            client.destroy();
        };

        timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('Connection timeout'));
        }, timeout);

        client.connect(port, host, () => {
            console.log(`🔗 Connected to ${host}:${port}`);
        });

        client.on('data', (data) => {
            const chunk = data.toString();
            buffer += chunk;

            if (!isAuthenticated) {
                if (buffer.includes('login:')) {
                    client.write(user + '\r\n');
                    buffer = '';
                } else if (buffer.includes('Password:')) {
                    client.write(password + '\r\n');
                    buffer = '';
                    isAuthenticated = true;
                    console.log(`🔐 Authenticated to ${host}`);
                }
            } else if (!isRebooted) {
                if (buffer.includes('#') || buffer.includes('>') || buffer.includes('$')) {
                    client.write('reboot\r\n');
                    isRebooted = true;
                    buffer = '';

                    setTimeout(() => {
                        cleanup();
                        console.log(`✅ Reboot command sent to ${host}`);
                        resolve();
                    }, 1500);
                }
            }
        });

        client.on('error', (err) => {
            cleanup();
            reject(new Error(`Telnet error: ${err.message}`));
        });
    });
}

// ============ SPA fallback (для любых маршрутов, кроме /api) ============
if (hasStaticBuild) {
    // Это должен быть последний маршрут
    app.get(/^\/(?!api).*/, (req, res) => {
        res.sendFile(join(STATIC_PATH, 'index.html'));
    });
}

// ============ Запуск сервера ============
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Config paths:`);
    console.log(`   - Channels: ${CONFIG_PATHS.channels}`);
    console.log(`   - PBIs: ${CONFIG_PATHS.pbis}`);
    console.log(`   - Settings: ${CONFIG_PATHS.settings}`);

    if (hasStaticBuild) {
        console.log(`📁 Static files: ${STATIC_PATH}`);
        console.log(`🌐 Open http://localhost:${PORT} in browser`);
    } else {
        console.log(`⚠️  Static build not found. Run: cd frontend && npm run build:backend`);
        console.log(`🌐 API available at http://localhost:${PORT}/api`);
    }
    console.log('');
});