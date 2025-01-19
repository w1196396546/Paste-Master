<template>
  <div class="home">
    <div class="category-filter mb-4">
      <el-radio-group v-model="currentCategory" size="large">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button v-for="category in categories" :key="category" :label="category">
          {{ getCategoryLabel(category) }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <div class="clipboard-list">
      <el-empty v-if="filteredItems.length === 0" description="暂无剪贴板内容" />
      
      <el-card v-for="item in filteredItems" :key="item.id" class="clipboard-item mb-3">
        <template #header>
          <div class="item-header">
            <el-tag :type="getCategoryType(item.category)">
              {{ getCategoryLabel(item.category) }}
            </el-tag>
            <span class="timestamp">{{ formatTime(item.timestamp) }}</span>
          </div>
        </template>
        
        <div class="item-content" @click="copyToClipboard(item)">
          <template v-if="item.category === 'image'">
            <img :src="item.content" :alt="item.title || '图片'" class="preview-image">
          </template>
          <template v-else-if="item.category === 'code'">
            <div class="code-content">
              <div class="code-header">
                <el-icon><Document /></el-icon>
                <span>代码片段</span>
              </div>
              <pre><code>{{ getDecryptedContent(item) }}</code></pre>
            </div>
          </template>
          <template v-else-if="item.category === 'link'">
            <div class="link-content">
              <el-icon><Link /></el-icon>
              <a :href="getDecryptedContent(item)" target="_blank">{{ getDecryptedContent(item) }}</a>
            </div>
          </template>
          <template v-else>
            <div class="text-content">
              <el-icon><ChatLineSquare /></el-icon>
              <p>{{ getDecryptedContent(item) }}</p>
            </div>
          </template>
        </div>

        <div class="item-actions mt-3">
          <el-button-group>
            <el-button type="primary" @click="copyToClipboard(item)" :icon="CopyDocument">
              复制
            </el-button>
            <el-button type="danger" @click="removeItem(item.id)" :icon="Delete">
              删除
            </el-button>
          </el-button-group>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage'
}
</script>

<script setup>
import { ref, computed } from 'vue'
import { useClipboardStore } from '../../store/clipboard'
import { CopyDocument, Delete, Document, Link, ChatLineSquare } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const clipboardStore = useClipboardStore()
const currentCategory = ref('all')

const categories = computed(() => clipboardStore.categories)
const filteredItems = computed(() => {
  let items = clipboardStore.filteredItems
  if (currentCategory.value !== 'all') {
    items = items.filter(item => item.category === currentCategory.value)
  }
  return items
})

// 获取分类标签
function getCategoryLabel(category) {
  const labels = {
    text: '文本',
    image: '图片',
    code: '代码',
    link: '链接'
  }
  return labels[category] || category
}

// 获取分类标签类型
function getCategoryType(category) {
  const types = {
    text: '',
    image: 'success',
    code: 'warning',
    link: 'info'
  }
  return types[category] || ''
}

// 格式化时间
function formatTime(timestamp) {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

// 复制到剪贴板
async function copyToClipboard(item) {
  console.log('[Home] 开始复制到剪贴板:', {
    id: item.id,
    category: item.category,
    hasContent: !!item.content
  })
  
  try {
    if (!window.electron) {
      console.error('[Home] electron API 未初始化')
      throw new Error('electron API 未初始化')
    }

    const content = clipboardStore.getDecryptedContent(item)
    if (!content) {
      console.error('[Home] 获取解密内容失败')
      throw new Error('获取内容失败')
    }
    
    console.log('[Home] 发送复制请求到主进程')
    window.electron.ipcRenderer.send('set-clipboard-content', content)
    
    // 等待一段时间确保内容被复制
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 验证复制是否成功
    window.electron.ipcRenderer.send('get-clipboard-content')
    window.electron.ipcRenderer.once('clipboard-content', (newContent) => {
      console.log('[Home] 验证复制结果:', {
        success: item.category === 'image' ? 
          !!newContent.image : 
          newContent.text === content
      })
    })
    
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('[Home] 复制失败:', error)
    ElMessage.error('复制失败：' + error.message)
  }
}

// 删除项目
function removeItem(id) {
  clipboardStore.removeClipboardItem(id)
  ElMessage.success('已删除')
}

// 获取解密内容
function getDecryptedContent(item) {
  return clipboardStore.getDecryptedContent(item)
}
</script>

<style scoped>
.home {
  max-width: 800px;
  margin: 0 auto;
  height: calc(100vh - 180px); /* 减去头部和其他元素的高度 */
  display: flex;
  flex-direction: column;
}

.category-filter {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  flex-shrink: 0; /* 防止压缩 */
}

.clipboard-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px; /* 为滚动条留出空间 */
}

.clipboard-item {
  cursor: pointer;
  transition: all 0.3s ease;
}

.clipboard-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timestamp {
  color: var(--text-color-secondary);
  font-size: 12px;
}

.item-content {
  max-height: 200px;
  overflow-y: auto;
  padding: 0; /* 移除原有的padding */
  background-color: transparent; /* 移除原有的背景色 */
  border-radius: 4px;
}

.item-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.preview-image {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
}

.code-content {
  background-color: #f6f8fa;
  border-radius: 6px;
  font-family: monospace;
}

.code-header {
  padding: 8px 12px;
  background-color: #f1f1f1;
  border-bottom: 1px solid #e1e4e8;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
}

.code-content pre {
  padding: 12px;
  margin: 0;
  overflow-x: auto;
}

.link-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.link-content a {
  color: var(--el-color-primary);
  text-decoration: none;
  word-break: break-all;
}

.link-content a:hover {
  text-decoration: underline;
}

.text-content {
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
}

.text-content p {
  margin: 0;
  word-break: break-all;
}

.el-icon {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .home {
    padding: 0 10px;
    height: calc(100vh - 160px);
  }

  .category-filter {
    overflow-x: auto;
    padding-bottom: 10px;
  }
}
</style> 