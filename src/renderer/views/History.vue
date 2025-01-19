<template>
  <div class="history">
    <div class="toolbar mb-4">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :shortcuts="dateShortcuts"
        @change="handleDateChange"
      />
      <el-button type="danger" @click="handleBatchDelete" :disabled="!selectedItems.length">
        批量删除
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredHistoryItems"
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getCategoryType(row.category)">
            {{ getCategoryLabel(row.category) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="内容" min-width="300">
        <template #default="{ row }">
          <div class="content-preview" @click="copyToClipboard(row)">
            <template v-if="row.category === 'image'">
              <img :src="row.content" :alt="row.title || '图片'" class="preview-image">
            </template>
            <template v-else-if="row.category === 'code'">
              <div class="code-preview">
                <el-icon><Document /></el-icon>
                <span class="preview-text">{{ getDecryptedContent(row) }}</span>
              </div>
            </template>
            <template v-else-if="row.category === 'link'">
              <div class="link-preview">
                <el-icon><Link /></el-icon>
                <a :href="getDecryptedContent(row)" target="_blank" class="preview-text">{{ getDecryptedContent(row) }}</a>
              </div>
            </template>
            <template v-else>
              <div class="text-preview">
                <el-icon><ChatLineSquare /></el-icon>
                <span class="preview-text">{{ getDecryptedContent(row) }}</span>
              </div>
            </template>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="timestamp" label="时间" width="180" sortable>
        <template #default="{ row }">
          {{ formatTime(row.timestamp) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button
              type="primary"
              :icon="CopyDocument"
              circle
              @click.stop="copyToClipboard(row)"
            />
            <el-button
              type="danger"
              :icon="Delete"
              circle
              @click.stop="removeItem(row.id)"
            />
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container mt-4">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="totalItems"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'HistoryPage'
}
</script>

<script setup>
import { ref, computed } from 'vue'
import { useClipboardStore } from '../../store/clipboard'
import { CopyDocument, Delete, Document, Link, ChatLineSquare } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const clipboardStore = useClipboardStore()
const loading = ref(false)
const dateRange = ref([])
const selectedItems = ref([])
const currentPage = ref(1)
const pageSize = ref(20)

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
]

// 根据日期筛选的历史记录
const filteredHistoryItems = computed(() => {
  let items = clipboardStore.clipboardItems

  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    items = items.filter(item => {
      const itemDate = dayjs(item.timestamp)
      return itemDate.isAfter(start) && itemDate.isBefore(end)
    })
  }

  // 分页
  const startIndex = (currentPage.value - 1) * pageSize.value
  return items.slice(startIndex, startIndex + pageSize.value)
})

// 总条目数
const totalItems = computed(() => {
  let items = clipboardStore.clipboardItems
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    items = items.filter(item => {
      const itemDate = dayjs(item.timestamp)
      return itemDate.isAfter(start) && itemDate.isBefore(end)
    })
  }
  return items.length
})

// 处理日期变化
function handleDateChange() {
  currentPage.value = 1
}

// 处理选择变化
function handleSelectionChange(selection) {
  selectedItems.value = selection
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedItems.value.length) return

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedItems.value.length} 条记录吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    selectedItems.value.forEach(item => {
      clipboardStore.removeClipboardItem(item.id)
    })
    
    ElMessage.success('批量删除成功')
    selectedItems.value = []
  } catch {
    // 用户取消操作
  }
}

// 处理页码变化
function handleCurrentChange(val) {
  currentPage.value = val
}

// 处理每页条数变化
function handleSizeChange(val) {
  pageSize.value = val
  currentPage.value = 1
}

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
  console.log('[History] 开始复制到剪贴板:', item.id)
  const content = clipboardStore.getDecryptedContent(item)
  
  try {
    if (!window.electron) {
      throw new Error('electron API 未初始化')
    }
    
    console.log('[History] 发送复制请求到主进程')
    window.electron.ipcRenderer.send('set-clipboard-content', content)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('[History] 复制失败:', error)
    ElMessage.error('复制失败，请重试')
  }
}

// 删除单个项目
async function removeItem(id) {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    clipboardStore.removeClipboardItem(id)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消操作
  }
}

// 获取解密内容
function getDecryptedContent(item) {
  return clipboardStore.getDecryptedContent(item)
}
</script>

<style scoped>
.history {
  padding: 20px;
  height: calc(100vh - 140px); /* 减去头部高度 */
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-shrink: 0; /* 防止压缩 */
}

.el-table {
  flex: 1;
  overflow: auto;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
  background-color: var(--background-color);
  position: sticky;
  bottom: 0;
  z-index: 10;
  flex-shrink: 0; /* 防止压缩 */
}

.content-preview {
  max-width: 500px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.content-preview:hover {
  background-color: #f5f7fa;
}

.preview-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.code-preview, .link-preview, .text-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.code-preview {
  font-family: monospace;
  color: #666;
}

.link-preview a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.link-preview a:hover {
  text-decoration: underline;
}

.el-icon {
  flex-shrink: 0;
}

.preview-image {
  max-height: 50px;
  max-width: 100px;
  object-fit: contain;
}

@media (max-width: 768px) {
  .history {
    padding: 10px;
    height: calc(100vh - 120px);
  }

  .toolbar {
    flex-direction: column;
    gap: 10px;
  }

  .content-preview {
    max-width: 200px;
  }
}
</style> 