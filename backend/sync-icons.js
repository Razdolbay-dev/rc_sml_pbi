import axios from 'axios';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Конфигурация
const CONFIG = {
    // URL сервиса с иконками
    ICON_SERVICE: 'http://epg.one/img',
    // Путь для сохранения иконок
    ICONS_PATH: join(__dirname, 'static', 'img'),
    // Путь к конфигу каналов
    CHANNELS_PATH: join(__dirname, 'config', 'channels.json'),
    // Таймаут между запросами (мс)
    REQUEST_DELAY: 500,
    // Максимальное количество попыток
    MAX_RETRIES: 3,
    // Таймаут запроса
    REQUEST_TIMEOUT: 10000
};

// ============ Вспомогательные функции ============
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = (message, type = 'info') => {
    const prefix = {
        'info': 'ℹ️',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️'
    }[type] || 'ℹ️';
    console.log(`${prefix} ${message}`);
};

// ============ Основная функция синхронизации ============
const syncIcons = async () => {
    log('🔄 Начинаем синхронизацию иконок...', 'info');

    try {
        // 1. Проверяем наличие папки для иконок
        if (!existsSync(CONFIG.ICONS_PATH)) {
            await mkdir(CONFIG.ICONS_PATH, { recursive: true });
            log(`Создана папка: ${CONFIG.ICONS_PATH}`, 'info');
        }

        // 2. Загружаем конфиг каналов
        const channelsData = await readFile(CONFIG.CHANNELS_PATH, 'utf-8');
        const channels = JSON.parse(channelsData);
        log(`Загружено ${channels.length} каналов`, 'info');

        // 3. Синхронизируем иконки
        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;

        for (const channel of channels) {
            if (!channel.img) {
                skipCount++;
                continue;
            }

            const iconUrl = `${CONFIG.ICON_SERVICE}/${channel.img}.png`;
            const iconPath = join(CONFIG.ICONS_PATH, `${channel.img}.png`);

            // Проверяем, есть ли уже иконка
            if (existsSync(iconPath)) {
                log(`${channel.img} - уже существует, пропускаем`, 'info');
                skipCount++;
                continue;
            }

            // Загружаем иконку с повторными попытками
            let loaded = false;
            for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
                try {
                    log(`${channel.img} - попытка ${attempt}/${CONFIG.MAX_RETRIES}...`, 'info');

                    const response = await axios.get(iconUrl, {
                        responseType: 'arraybuffer',
                        timeout: CONFIG.REQUEST_TIMEOUT,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    // Проверяем, что это изображение
                    const contentType = response.headers['content-type'];
                    if (!contentType || !contentType.startsWith('image/')) {
                        throw new Error(`Неверный тип контента: ${contentType}`);
                    }

                    // Сохраняем иконку
                    await writeFile(iconPath, response.data);
                    loaded = true;
                    successCount++;
                    log(`${channel.img} - загружено успешно (${(response.data.length / 1024).toFixed(1)} KB)`, 'success');
                    break;

                } catch (error) {
                    if (attempt < CONFIG.MAX_RETRIES) {
                        log(`${channel.img} - ошибка: ${error.message}, повтор через ${CONFIG.REQUEST_DELAY}мс`, 'warning');
                        await delay(CONFIG.REQUEST_DELAY);
                    } else {
                        log(`${channel.img} - не удалось загрузить после ${CONFIG.MAX_RETRIES} попыток: ${error.message}`, 'error');
                        failCount++;
                    }
                }
            }

            // Задержка между запросами, чтобы не перегружать сервер
            await delay(CONFIG.REQUEST_DELAY);
        }

        // 4. Итоги
        log('', 'info');
        log('========== ИТОГИ СИНХРОНИЗАЦИИ ==========', 'info');
        log(`✅ Успешно загружено: ${successCount}`, 'success');
        log(`❌ Не удалось загрузить: ${failCount}`, 'error');
        log(`⏭️ Пропущено (уже есть или нет img): ${skipCount}`, 'info');
        log(`📁 Иконки сохранены в: ${CONFIG.ICONS_PATH}`, 'info');
        log('=========================================', 'info');

    } catch (error) {
        log(`Ошибка синхронизации: ${error.message}`, 'error');
        process.exit(1);
    }
};

// ============ Запуск ============
syncIcons();