<template>
  <div class="app-container">
    <div class="title-bar" :class="{ 'mac': isMacOS }">
      <div class="drag-area"></div>
      <div class="window-controls" v-if="!isMacOS">
        <el-button class="control-btn minimize" text @click="minimizeWindow">
          <el-icon><Minus /></el-icon>
        </el-button>
        <el-button class="control-btn maximize" text @click="maximizeWindow">
          <el-icon><FullScreen /></el-icon>
        </el-button>
        <el-button class="control-btn close" text @click="closeWindow">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>
    <el-container>
      <el-aside width="200px">
        <div class="sidebar">
          <div class="logo">
            <img src="/icons/icon.svg" alt="Plate Logo">
            <span>Plate</span>
          </div>
          <el-menu
            :router="true"
            :default-active="$route.path"
            class="menu"
          >
            <el-menu-item index="/">
              <el-icon><Document /></el-icon>
              <span>剪贴板</span>
            </el-menu-item>
            <el-menu-item index="/history">
              <el-icon><Timer /></el-icon>
              <span>历史记录</span>
            </el-menu-item>
            <el-menu-item index="/settings">
              <el-icon><Setting /></el-icon>
              <span>设置</span>
            </el-menu-item>
          </el-menu>
        </div>
      </el-aside>
      <el-container>
        <el-header height="60px">
          <div class="header-content">
            <div class="search-box">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索剪贴板内容..."
                prefix-icon="Search"
                clearable
                @input="handleSearch"
              />
            </div>
            <div class="user-actions">
              <el-button type="primary" @click="clearClipboard">
                清空剪贴板
              </el-button>
            </div>
          </div>
        </el-header>
        <el-main>
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Document, Timer, Setting, Minus, FullScreen, Close } from '@element-plus/icons-vue'
import { useClipboardStore } from './store/clipboard'
import { ElMessageBox } from 'element-plus'

const clipboardStore = useClipboardStore()
const searchKeyword = ref('')

// 判断是否为 macOS 平台
const isMacOS = computed(() => {
  return window.electron && window.electron.platform === 'darwin'
})

const handleSearch = () => {
  clipboardStore.searchKeyword = searchKeyword.value
}

const clearClipboard = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空剪贴板历史记录吗？此操作不可恢复。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    clipboardStore.clearHistory()
  } catch {
    // 用户取消操作
  }
}

// 窗口控制函数
const minimizeWindow = () => {
  if (window.electron) {
    window.electron.ipcRenderer.send('window-control', 'minimize')
  }
}

const maximizeWindow = () => {
  if (window.electron) {
    window.electron.ipcRenderer.send('window-control', 'maximize')
  }
}

const closeWindow = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要关闭应用吗？应用将在后台继续运行。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    )
    if (window.electron) {
      window.electron.ipcRenderer.send('window-control', 'close')
    }
  } catch {
    // 用户取消操作
  }
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.title-bar {
  height: 32px;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--border-color);
  padding-left: 10px;
}

/* macOS 特定样式 */
.title-bar.mac {
  height: 28px;
  padding-left: 80px; /* 为 macOS 的红绿灯按钮留出空间 */
}

.drag-area {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
}

.window-controls {
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;
}

/* Windows/Linux 特定样式 */
.control-btn {
  width: 46px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  margin: 0;
  padding: 0;
  transition: all 0.3s;
}

.control-btn:hover {
  background-color: var(--el-color-info-light-8);
}

.control-btn.minimize:hover {
  background-color: var(--el-color-info-light-5);
}

.control-btn.maximize:hover {
  background-color: var(--el-color-primary-light-5);
}

.control-btn.close:hover {
  background-color: #ff4d4f;
  color: #fff;
}

.sidebar {
  height: 100%;
  background-color: #fff;
  border-right: 1px solid var(--border-color);
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
}

.logo img {
  width: 32px;
  height: 32px;
  margin-right: 10px;
  filter: invert(45%) sepia(97%) saturate(1318%) hue-rotate(198deg) brightness(96%) contrast(96%);
}

.logo span {
  font-size: 20px;
  font-weight: bold;
  color: var(--primary-color);
}

.menu {
  border-right: none;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
}

.search-box {
  width: 300px;
}

.el-main {
  background-color: var(--background-color);
  padding: 20px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .el-aside {
    width: 64px !important;
  }

  .logo span {
    display: none;
  }

  .search-box {
    width: 200px;
  }
}
</style>
