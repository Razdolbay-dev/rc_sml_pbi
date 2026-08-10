import express from 'express';
import cors from 'cors';
import net from 'net';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

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

// ============ МАССОВОЕ СОХРАНЕНИЕ ============
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