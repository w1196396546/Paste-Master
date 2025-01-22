<template>
  <div class="quick-access">
    <div class="header">
      <div class="search-box">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索..."
          class="search-input"
        >
      </div>
      <div class="tabs">
        <span
          v-for="category in categories"
          :key="category"
          class="tab"
          :class="{ active: currentCategory === category }"
          @click="currentCategory = category"
        >
          {{ getCategoryLabel(category) }}
        </span>
      </div>
    </div>

    <div class="list">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="item"
        @click="copyAndClose(item)"
      >
        <div class="item-icon">
          <i v-if="item.category === 'text'" class="icon-text">T</i>
          <i v-else-if="item.category === 'link'" class="icon-link">L</i>
          <i v-else-if="item.category === 'code'" class="icon-code">{}</i>
          <img v-else-if="item.category === 'image'" :src="item.content" class="icon-image">
        </div>
        <div class="item-content">
          <div class="item-preview">
            {{ item.category === 'image' ? '图片' : getDecryptedContent(item) }}
          </div>
          <div class="item-time">{{ formatTime(item.timestamp) }}</div>
        </div>
      </div>

      <div v-if="filteredItems.length === 0" class="empty">
        无匹配内容
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useClipboardStore } from '../../store/clipboard'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { Search, Document, Link, Terminal, Picture, Monitor, Clock } from '@element-plus/icons-vue'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const clipboardStore = useClipboardStore()
const searchKeyword = ref('')
const currentCategory = ref('all')
const categories = ['all', 'text', 'link', 'code', 'image']

// 在组件挂载时初始化store和监听器
onMounted(async () => {
  console.log('[QuickAccess] 组件挂载，开始初始化')
  
  // 获取 ipcRenderer
  if (!window.electron?.ipcRenderer) {
    console.error('[QuickAccess] ipcRenderer 未找到')
    return
  }

  // 获取最新的剪贴板历史
  window.electron.ipcRenderer.send('get-clipboard-history')
  window.electron.ipcRenderer.once('clipboard-history', (items) => {
    console.log('[QuickAccess] 收到历史记录，数量:', items ? items.length : 0)
    clipboardStore.clipboardItems.value = items || []
  })

  // 监听剪贴板变化
  const unsubscribe = window.electron.ipcRenderer.on('clipboard-change', (newItem) => {
    console.log('[QuickAccess] 收到剪贴板变化:', newItem)
    // 检查是否已存在相同ID的项目
    const existingIndex = clipboardStore.clipboardItems.value.findIndex(item => item.id === newItem.id)
    if (existingIndex === -1) {
      clipboardStore.clipboardItems.value.unshift(newItem)
    }
  })
  // 在组件卸载时取消监听
  onUnmounted(() => {
    console.log('[QuickAccess] 组件卸载，取消监听')
    unsubscribe?.()
  })
})

const filteredItems = computed(() => {
  console.log('[QuickAccess] 计算过滤后的项目',clipboardStore.clipboardItems)
  let items = clipboardStore.clipboardItems
  
  // 根据分类过滤
  if (currentCategory.value !== 'all') {
    items = items.filter(item => item.category === currentCategory.value)
  }
  
  // 根据搜索关键词过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    items = items.filter(item => {
      const content = clipboardStore.getDecryptedContent(item)
      return content.toLowerCase().includes(keyword)
    })
  }
  
  return items
})

function getCategoryLabel(category) {
  const labels = {
    all: '全部',
    text: '文本',
    link: '链接',
    code: '代码',
    image: '图片'
  }
  return labels[category] || category
}

function formatTime(timestamp) {
  return dayjs(timestamp).fromNow()
}

function getDecryptedContent(item) {
  return clipboardStore.getDecryptedContent(item)
}

async function copyAndClose(item) {
  try {
    if (!window.electron) {
      throw new Error('electron API 未初始化')
    }

    const content = clipboardStore.getDecryptedContent(item)
    window.electron.ipcRenderer.send('set-clipboard-content', content)
    window.electron.ipcRenderer.send('close-quick-access')
  } catch (error) {
    console.error('复制失败:', error)
  }
}
</script>

<style scoped>
.quick-access {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.header {
  padding: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  -webkit-app-region: drag;
  margin: 0;
  user-select: none;
}

.search-box,
.tabs {
  -webkit-app-region: no-drag;
  user-select: none;
}

.search-box {
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  outline: none;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.02);
}

.search-input:focus {
  border-color: #409EFF;
  background: white;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.tab {
  padding: 4px 8px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.tab:hover {
  background: rgba(0, 0, 0, 0.05);
}

.tab.active {
  background: #409EFF;
  color: white;
}

.list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.item {
  display: flex;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.05);
  margin-right: 12px;
  font-family: monospace;
  color: #666;
}

.icon-image {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 6px;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-preview {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-time {
  font-size: 12px;
  color: #999;
}

.empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

/* 自定义滚动条 */
.list::-webkit-scrollbar {
  width: 4px;
}

.list::-webkit-scrollbar-track {
  background: transparent;
}

.list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-category, .item-source, .item-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-source {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.el-icon {
  font-size: 14px;
}
</style> 