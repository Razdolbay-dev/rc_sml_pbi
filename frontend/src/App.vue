<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
              RC
            </div>
            <h1 class="text-xl font-bold text-gray-900">
              Управление приставками
            </h1>
          </div>
          <div class="flex items-center gap-3">
            <button
                @click="activeView = 'main'"
                class="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                :class="activeView === 'main' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-gray-100'"
            >
              Главная
            </button>
            <button
                @click="activeView = 'admin'"
                class="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                :class="activeView === 'admin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-gray-100'"
            >
              Админка
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main View -->
    <main v-if="activeView === 'main'" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Tabs -->
      <div class="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
        <button
            @click="activeTab = 'channels'"
            class="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200"
            :class="activeTab === 'channels'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
            : 'text-gray-600 hover:bg-gray-100'"
        >
          <span class="flex items-center justify-center gap-2">
            📡 Каналы
            <span class="text-xs bg-white/20 px-2 py-0.5 rounded-full">{{ channels.length }}</span>
          </span>
        </button>
        <button
            @click="activeTab = 'pbis'"
            class="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200"
            :class="activeTab === 'pbis'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
            : 'text-gray-600 hover:bg-gray-100'"
        >
          <span class="flex items-center justify-center gap-2">
            🖥️ PBI
            <span class="text-xs bg-white/20 px-2 py-0.5 rounded-full">{{ pbis.length }}</span>
          </span>
        </button>
      </div>

      <!-- Channels Grid -->
      <div v-if="activeTab === 'channels'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        <div
            v-for="channel in channels"
            :key="channel.num"
            class="channel-card"
            :class="{
            'offline': !channel.host,
            'rebooting': channel.rebooting
          }"
            @click="rebootDevice(channel)"
        >
          <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl overflow-hidden">
            <img
                v-if="channel.img"
                :src="`/images/${channel.img}.png`"
                :alt="channel.name"
                class="w-full h-full object-cover"
                @error="handleImageError"
            />
            <span v-else class="text-4xl">📡</span>
          </div>
          <div class="space-y-0.5">
            <div class="text-xs font-semibold text-gray-400">#{{ channel.num }}</div>
            <div class="text-sm font-semibold text-gray-900 truncate" :title="channel.name">
              {{ channel.name }}
            </div>
            <div class="text-xs font-mono text-gray-500 truncate">
              {{ channel.host || 'Нет IP' }}
            </div>
          </div>
          <div v-if="!channel.host" class="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Нет IP
          </div>
          <div v-if="channel.rebooting" class="absolute top-2 right-2 text-2xl text-orange-500 animate-spin-slow">
            ⟳
          </div>
        </div>
      </div>

      <!-- PBI Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
            v-for="pbi in pbis"
            :key="pbi.num"
            class="pbi-card"
            :class="{ 'rebooting': pbi.rebooting }"
            @click="rebootDevice(pbi)"
        >
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                PBI #{{ pbi.num }}
              </span>
              <span class="text-xs font-mono text-gray-500">{{ pbi.host }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full" title="Пароль PBI">
                🔑 {{ pbi.password || '12345' }}
              </span>
              <div v-if="pbi.rebooting" class="text-2xl text-orange-500 animate-spin-slow">
                ⟳
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-1">
            <span
                v-for="ch in pbi.channels"
                :key="ch"
                class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
            >
              {{ ch }}
            </span>
          </div>
        </div>
      </div>
    </main>

    <!-- Admin View -->
    <main v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900">⚙️ Редактирование конфигурации</h2>
          <button
              @click="saveAllConfigs"
              :disabled="isSaving"
              class="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSaving">⏳ Сохранение...</span>
            <span v-else>💾 Сохранить всё</span>
          </button>
        </div>

        <!-- Tabs for admin -->
        <div class="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
              v-for="tab in adminTabs"
              :key="tab.key"
              @click="adminActiveTab = tab.key"
              class="flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200"
              :class="adminActiveTab === tab.key
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:bg-white/50'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Channels Editor -->
        <div v-if="adminActiveTab === 'channels'">
          <div class="flex justify-between items-center mb-4">
            <p class="text-sm text-gray-600">Всего каналов: {{ editedChannels.length }}</p>
            <button
                @click="addChannel"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
            >
              Добавить канал
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Изображение</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(channel, index) in editedChannels" :key="channel.num">
                <td class="px-4 py-3 text-sm text-gray-900">{{ channel.num }}</td>
                <td class="px-4 py-3">
                  <input
                      v-model="channel.name"
                      class="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Название"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                      v-model="channel.host"
                      class="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="IP адрес"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                      v-model="channel.img"
                      class="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="Имя файла (без .png)"
                  />
                </td>
                <td class="px-4 py-3">
                  <button
                      @click="deleteChannel(index)"
                      class="text-red-600 hover:text-red-800 font-medium"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- PBIs Editor -->
        <div v-if="adminActiveTab === 'pbis'">
          <div class="flex justify-between items-center mb-4">
            <p class="text-sm text-gray-600">Всего PBI: {{ editedPbis.length }}</p>
            <button
                @click="addPbi"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
            >
              Добавить PBI
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пароль</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Каналы</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(pbi, index) in editedPbis" :key="pbi.num">
                <td class="px-4 py-3 text-sm text-gray-900">{{ pbi.num }}</td>
                <td class="px-4 py-3">
                  <input
                      v-model="pbi.host"
                      class="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="IP адрес"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                      v-model="pbi.password"
                      class="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="Пароль (по умолч. 12345)"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                      v-model="pbi.channelsString"
                      @input="updatePbiChannels(index)"
                      class="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Каналы через запятую"
                  />
                </td>
                <td class="px-4 py-3">
                  <button
                      @click="deletePbi(index)"
                      class="text-red-600 hover:text-red-800 font-medium"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Settings Editor -->
        <div v-if="adminActiveTab === 'settings'">
          <div class="space-y-4 max-w-2xl">
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="font-semibold text-gray-900 mb-3">🔐 Telnet настройки</h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Пользователь</label>
                  <input
                      v-model="editedSettings.telnet.user"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Пароль (каналы)</label>
                  <input
                      v-model="editedSettings.telnet.password"
                      type="password"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Пароль (PBI)</label>
                  <input
                      v-model="editedSettings.telnet.pbiPassword"
                      type="password"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p class="text-xs text-gray-500 mt-1">Используется если у PBI не указан свой пароль</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Порт</label>
                  <input
                      v-model.number="editedSettings.telnet.port"
                      type="number"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Таймаут (мс)</label>
                  <input
                      v-model.number="editedSettings.telnet.timeout"
                      type="number"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="message" :class="messageType === 'success' ? 'toast-success' : 'toast-error'">
        {{ message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';

// ============ Состояние ============
const activeView = ref('main');
const activeTab = ref('channels');
const adminActiveTab = ref('channels');
const message = ref('');
const messageType = ref('success');
const isSaving = ref(false);

// Основные данные
const channels = ref([]);
const pbis = ref([]);
const settings = ref({});

// Редактируемые данные
const editedChannels = ref([]);
const editedPbis = ref([]);
const editedSettings = ref({});

// Админские вкладки
const adminTabs = [
  { key: 'channels', label: '📡 Каналы' },
  { key: 'pbis', label: '🖥️ PBI' },
  { key: 'settings', label: '⚙️ Настройки' }
];

// ============ Вычисляемые свойства ============
const activeChannels = computed(() => {
  return channels.value.filter(ch => ch.host).length;
});

// ============ Загрузка данных ============
const loadData = async () => {
  try {
    const [channelsRes, pbisRes, settingsRes] = await Promise.all([
      axios.get('/api/channels'),
      axios.get('/api/pbis'),
      axios.get('/api/settings').catch(() => ({ data: { telnet: { user: 'root', password: '11', pbiPassword: '12345', port: 23, timeout: 10000 } } }))
    ]);

    channels.value = channelsRes.data.map(ch => ({ ...ch, rebooting: false }));
    pbis.value = pbisRes.data.map(p => ({
      ...p,
      rebooting: false,
      channelsString: p.channels.join(', '),
      password: p.password || '12345'
    }));
    settings.value = settingsRes.data;

    resetEdits();
  } catch (error) {
    console.error('Load error:', error);
    showMessage('❌ Ошибка загрузки данных', 'error');
  }
};

const resetEdits = () => {
  editedChannels.value = JSON.parse(JSON.stringify(channels.value));
  editedPbis.value = JSON.parse(JSON.stringify(pbis.value));
  editedSettings.value = JSON.parse(JSON.stringify(settings.value));
};

// ============ CRUD операции ============
const addChannel = () => {
  const maxNum = Math.max(...editedChannels.value.map(c => c.num), 0);
  editedChannels.value.push({
    num: maxNum + 1,
    name: 'Новый канал',
    host: '',
    img: ''
  });
};

const deleteChannel = async (index) => {
  if (!confirm('Удалить канал?')) return;
  editedChannels.value.splice(index, 1);
  // Обновляем номера
  editedChannels.value.forEach((ch, i) => ch.num = i + 1);
};

const addPbi = () => {
  const maxNum = Math.max(...editedPbis.value.map(p => p.num), 0);
  editedPbis.value.push({
    num: maxNum + 1,
    host: '',
    password: '12345',
    channels: [],
    channelsString: ''
  });
};

const deletePbi = async (index) => {
  if (!confirm('Удалить PBI?')) return;
  editedPbis.value.splice(index, 1);
  // Обновляем номера
  editedPbis.value.forEach((p, i) => p.num = i + 1);
};

const updatePbiChannels = (index) => {
  const pbi = editedPbis.value[index];
  pbi.channels = pbi.channelsString.split(',').map(s => s.trim()).filter(s => s);
};

// ============ Сохранение (массовое) ============
const saveAllConfigs = async () => {
  if (isSaving.value) return;

  isSaving.value = true;

  try {
    // Подготавливаем данные
    const channelsToSave = editedChannels.value.map(({ rebooting, ...channel }) => channel);
    const pbisToSave = editedPbis.value.map(({ rebooting, channelsString, ...pbi }) => ({
      ...pbi,
      channels: pbi.channels || pbi.channelsString?.split(',').map(s => s.trim()).filter(s => s) || []
    }));

    // Сохраняем все сразу
    await Promise.all([
      axios.put('/api/channels/bulk', channelsToSave),
      axios.put('/api/pbis/bulk', pbisToSave),
      axios.put('/api/settings', editedSettings.value)
    ]);

    await loadData();
    showMessage('✅ Все конфигурации сохранены!', 'success');
  } catch (error) {
    console.error('Save error:', error);
    const errorMsg = error.response?.data?.error || error.message;
    showMessage(`❌ Ошибка сохранения: ${errorMsg}`, 'error');
  } finally {
    isSaving.value = false;
  }
};

// ============ Управление устройствами ============
const rebootDevice = async (device) => {
  if (device.rebooting) return;

  if (!device.host) {
    showMessage(`❌ У "${device.name || 'PBI'}" нет IP-адреса`, 'error');
    return;
  }

  device.rebooting = true;

  try {
    const password = device.password || undefined;

    await axios.post('/api/reboot', {
      host: device.host,
      password: password
    });

    showMessage(`✅ ${device.name || 'PBI'} перезагружается`, 'success');
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    showMessage(`❌ Ошибка: ${errorMsg}`, 'error');
  } finally {
    setTimeout(() => {
      device.rebooting = false;
    }, 3000);
  }
};

// ============ Вспомогательные функции ============
const showMessage = (text, type = 'success') => {
  message.value = text;
  messageType.value = type;
  setTimeout(() => {
    message.value = '';
  }, 3000);
};

const handleImageError = (event) => {
  event.target.style.display = 'none';
  event.target.parentElement.textContent = '📡';
  event.target.parentElement.className = 'w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl';
};

// ============ Watch ============
watch(activeView, (newVal) => {
  if (newVal === 'admin') {
    resetEdits();
  }
});

// ============ Жизненный цикл ============
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.channel-card {
  @apply bg-white rounded-xl border-2 border-gray-200 p-4 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-green-500 relative;
}

.channel-card.offline {
  @apply opacity-50 cursor-not-allowed;
}

.channel-card.rebooting {
  @apply opacity-60 cursor-not-allowed border-orange-400;
}

.pbi-card {
  @apply bg-white rounded-xl border-2 border-gray-200 p-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-green-500 relative text-left;
}

.pbi-card.rebooting {
  @apply opacity-60 cursor-not-allowed border-orange-400;
}

.toast-success {
  @apply fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-white font-medium z-50 shadow-lg bg-green-500;
}

.toast-error {
  @apply fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-white font-medium z-50 shadow-lg bg-red-500;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* Анимация спиннера */
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin-slow {
  animation: spin-slow 1.5s linear infinite;
}
</style>