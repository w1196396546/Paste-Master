<template>
  <div class="settings">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <h3>通用设置</h3>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="settings"
        label-width="120px"
        @submit.prevent="saveSettings"
      >
        <!-- 同步设置 -->
        <el-form-item label="云端同步">
          <el-switch
            v-model="settings.syncEnabled"
            active-text="开启"
            inactive-text="关闭"
          />
          <div class="setting-description">
            开启后将自动同步剪贴板内容到云端
          </div>
        </el-form-item>

        <el-form-item label="同步间隔">
          <el-input-number
            v-model="settings.syncInterval"
            :min="5"
            :max="3600"
            :step="5"
            :disabled="!settings.syncEnabled"
          />
          <span class="ml-2">秒</span>
          <div class="setting-description">
            设置自动同步的时间间隔
          </div>
        </el-form-item>

        <!-- 安全设置 -->
        <el-form-item label="内容加密">
          <el-switch
            v-model="settings.encryptEnabled"
            active-text="开启"
            inactive-text="关闭"
          />
          <div class="setting-description">
            开启后将对剪贴板内容进行加密存储
          </div>
        </el-form-item>

        <!-- 存储设置 -->
        <el-form-item label="历史记录数量">
          <el-input-number
            v-model="settings.maxHistoryItems"
            :min="10"
            :max="1000"
            :step="10"
          />
          <span class="ml-2">条</span>
          <div class="setting-description">
            设置最大保存的历史记录数量
          </div>
        </el-form-item>

        <el-form-item label="保留时间">
          <el-input-number
            v-model="settings.retentionPeriod"
            :min="1"
            :max="365"
            :step="1"
          />
          <span class="ml-2">天</span>
          <div class="setting-description">
            设置历史记录的保留时间
          </div>
        </el-form-item>

        <!-- 快捷键设置 -->
        <el-form-item label="快捷键">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="快速访问">
              <div class="shortcut-setting">
                <el-tag>{{ shortcuts.quickAccess }}</el-tag>
                <el-button type="primary" link @click="showHotkeyDialog">
                  修改快捷键
                </el-button>
              </div>
              <div class="setting-description">
                按下快捷键可快速打开剪贴板历史，选择内容后自动复制并关闭
              </div>
            </el-descriptions-item>
          </el-descriptions>
        </el-form-item>

        <!-- 保存按钮 -->
        <el-form-item>
          <el-button type="primary" @click="saveSettings">
            保存设置
          </el-button>
          <el-button @click="resetSettings">
            重置默认
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 快捷键设置对话框 -->
    <el-dialog
      v-model="showHotkeysDialog"
      title="设置快速访问快捷键"
      width="500px"
    >
      <el-form label-width="120px">
        <el-form-item label="当前快捷键">
          <el-input
            v-model="tempShortcut"
            placeholder="点击输入新的快捷键"
            readonly
            @keydown="recordHotkey"
          />
          <div class="setting-description">
            按下组合键设置新的快捷键，按 ESC 取消
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelHotkeyEdit">取消</el-button>
          <el-button type="primary" @click="saveHotkeys">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 关于信息 -->
    <el-card class="settings-card mt-4">
      <template #header>
        <div class="card-header">
          <h3>关于</h3>
        </div>
      </template>
      <div class="about-content">
        <p>Plate 剪贴板管理器</p>
        <p>版本：v{{ version }}</p>
        <p class="mt-2">
          <el-button type="primary" link @click="checkUpdate">
            检查更新
          </el-button>
        </p>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'SettingsPage'
}
</script>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useClipboardStore } from '../../store/clipboard'
import { ElMessage } from 'element-plus'
import pkg from '../../../package.json'

const clipboardStore = useClipboardStore()
const version = pkg.version
const showHotkeysDialog = ref(false)

// 设置表单
const settings = reactive({
  ...clipboardStore.settings
})

const shortcuts = ref({
  quickAccess: ''
})

// 临时存储编辑中的快捷键
const tempShortcut = ref('')

// 加载快捷键设置
async function loadShortcuts() {
  if (!window.electron) return
  
  window.electron.ipcRenderer.send('get-shortcuts')
  window.electron.ipcRenderer.once('shortcuts-loaded', (loadedShortcuts) => {
    console.log('Loaded shortcuts:', loadedShortcuts)
    if (loadedShortcuts) {
      shortcuts.value = { ...loadedShortcuts }
      console.log('Updated shortcuts:', shortcuts.value)
    }
  })
}

// 显示快捷键设置对话框
function showHotkeyDialog() {
  tempShortcut.value = shortcuts.value.quickAccess || ''
  showHotkeysDialog.value = true
}

// 取消快捷键编辑
function cancelHotkeyEdit() {
  showHotkeysDialog.value = false
}

// 记录快捷键
function recordHotkey(event) {
  event.preventDefault()
  
  // ESC 键取消编辑
  if (event.key === 'Escape') {
    tempShortcut.value = shortcuts.value.quickAccess
    return
  }
  
  // Tab 键忽略
  if (event.key === 'Tab') return

  const { ctrlKey, shiftKey, altKey, metaKey, key } = event
  const keys = []
  
  if (window.electron?.platform === 'darwin') {
    if (metaKey) keys.push('Command')
  } else {
    if (ctrlKey) keys.push('Control')
  }
  if (shiftKey) keys.push('Shift')
  if (altKey) keys.push('Alt')
  
  // 只添加有效的主键
  if (key.length === 1) {
    keys.push(key.toUpperCase())
  } else if (!['Control', 'Shift', 'Alt', 'Meta', 'Escape'].includes(key)) {
    keys.push(key)
  }

  // 至少需要一个修饰键和一个主键
  if (keys.length > 1) {
    tempShortcut.value = keys.join('+')
  }
}

// 保存快捷键设置
async function saveHotkeys() {
  if (!window.electron || !tempShortcut.value) return

  try {
    console.log('Saving shortcut:', tempShortcut.value)
    window.electron.ipcRenderer.send('update-shortcut', {
      key: 'quickAccess',
      shortcut: tempShortcut.value
    })

    window.electron.ipcRenderer.once('shortcut-updated', ({ success, error }) => {
      console.log('Shortcut update response:', { success, error })
      if (success) {
        // 更新显示的快捷键
        shortcuts.value.quickAccess = tempShortcut.value
        console.log('Updated shortcuts:', shortcuts.value)
        // 关闭对话框
        showHotkeysDialog.value = false
        // 显示成功消息
        ElMessage.success('快捷键设置已保存')
        // 重新加载快捷键设置以确保同步
        loadShortcuts()
      } else {
        console.error('Failed to update shortcut:', error)
        ElMessage.error(`快捷键设置失败: ${error || '未知错误'}`)
      }
    })
  } catch (error) {
    console.error('Save hotkeys failed:', error)
    ElMessage.error('保存快捷键失败')
  }
}

// 在组件挂载时加载快捷键设置
onMounted(() => {
  loadShortcuts()
  // 添加事件监听，当快捷键更新时重新加载
  if (window.electron) {
    window.electron.ipcRenderer.on('shortcuts-loaded', (loadedShortcuts) => {
      if (loadedShortcuts) {
        shortcuts.value = loadedShortcuts
      }
    })
  }
})

// 保存设置
async function saveSettings() {
  try {
    // 只传递需要的设置属性
    const plainSettings = {
      syncEnabled: settings.syncEnabled,
      encryptEnabled: settings.encryptEnabled,
      maxHistoryItems: settings.maxHistoryItems,
      syncInterval: settings.syncInterval,
      retentionPeriod: settings.retentionPeriod,
      maxImageSize: settings.maxImageSize
    }
    clipboardStore.updateSettings(plainSettings)
    ElMessage.success('设置已保存')
  } catch (error) {
    console.error('Save settings failed:', error)
    ElMessage.error('保存设置失败')
  }
}

// 重置设置
function resetSettings() {
  Object.assign(settings, {
    syncEnabled: true,
    encryptEnabled: true,
    maxHistoryItems: 100,
    syncInterval: 30,
    retentionPeriod: 30
  })
  ElMessage.success('已重置为默认设置')
}

// 检查更新
async function checkUpdate() {
  ElMessage.info('正在检查更新...')
  // TODO: 实现检查更新逻辑
}
</script>

<style scoped>
.settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  height: calc(100vh - 140px); /* 减去头部和标题栏的高度 */
  overflow-y: auto; /* 添加垂直滚动 */
}

.settings-card {
  background-color: #fff;
  border-radius: 8px;
  margin-bottom: 20px; /* 添加底部间距 */
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky; /* 让卡片头部固定 */
  top: 0;
  background: #fff;
  z-index: 1;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.setting-description {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

.about-content {
  text-align: center;
  padding: 20px 0;
}

.about-content p {
  margin: 8px 0;
  color: var(--text-color-secondary);
}

/* 响应式布局优化 */
@media (max-width: 768px) {
  .settings {
    padding: 10px;
    height: calc(100vh - 120px);
  }

  :deep(.el-form-item__label) {
    float: none;
    display: block;
    text-align: left;
    margin-bottom: 8px;
  }

  :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}

.shortcut-setting {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style> 