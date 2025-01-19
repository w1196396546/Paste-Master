import { defineStore } from 'pinia'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { encrypt, decrypt } from '../utils/crypto'
import { autoCompressImage } from '../utils/image'

// 获取ipcRenderer
function getIpcRenderer() {
  console.log('[Clipboard Store] 尝试获取 ipcRenderer')
  console.log('[Clipboard Store] window.electron:', window.electron)
  
  if (window.electron && window.electron.ipcRenderer) {
    console.log('[Clipboard Store] 成功获取 ipcRenderer')
    return window.electron.ipcRenderer
  }
  console.error('[Clipboard Store] 获取 ipcRenderer 失败')
  return null
}

export const useClipboardStore = defineStore('clipboard', () => {
  const settings = ref({
    syncEnabled: true,
    encryptEnabled: true,
    maxHistoryItems: 100,
    syncInterval: 30,
    retentionPeriod: 30,
    maxImageSize: 500
  })

  const clipboardItems = ref([])
  const categories = ref(['text', 'image', 'code', 'link'])
  const currentCategory = ref('all')
  const searchKeyword = ref('')

  // 计算属性
  const filteredItems = computed(() => {
    console.log('[Clipboard Store] 过滤项目，当前项数:', clipboardItems.value.length)
    if (!searchKeyword.value) {
      console.log('[Clipboard Store] 无搜索关键词，返回所有项目')
      return clipboardItems.value
    }
    
    const keyword = searchKeyword.value.toLowerCase()
    console.log('[Clipboard Store] 搜索关键词:', keyword)
    return clipboardItems.value.filter(item => {
      const content = getDecryptedContent(item)
      console.log('[Clipboard Store] 项目内容:', content)
      return content.toLowerCase().includes(keyword)
    })
  })

  // 初始化store
  async function init() {
    console.log('[Clipboard Store] 开始初始化')
    const ipcRenderer = getIpcRenderer()
    
    if (!ipcRenderer) {
      console.error('[Clipboard Store] 初始化失败：ipcRenderer 未找到')
      return
    }

    try {
      console.log('[Clipboard Store] 开始获取设置')
      // 获取设置
      ipcRenderer.send('get-settings')
      ipcRenderer.once('settings-loaded', (loadedSettings) => {
        console.log('[Clipboard Store] 已加载设置:', loadedSettings)
        settings.value = loadedSettings
      })

      console.log('[Clipboard Store] 开始获取历史记录')
      // 获取历史记录
      ipcRenderer.send('get-clipboard-history')
      ipcRenderer.once('clipboard-history', (items) => {
        console.log('[Clipboard Store] 已加载历史记录，数量:', items ? items.length : 0)
        clipboardItems.value = items || []
      })

      console.log('[Clipboard Store] 开始监听剪贴板变化')
      // 监听剪贴板变化
      const unsubscribe = ipcRenderer.on('clipboard-change', (newItem) => {
        console.log('[Clipboard Store] 检测到剪贴板变化:', newItem)
        addClipboardItem(newItem)
      })

      // 在组件卸载时取消订阅
      onUnmounted(() => {
        console.log('[Clipboard Store] 取消剪贴板变化监听')
        unsubscribe()
      })

    } catch (error) {
      console.error('[Clipboard Store] 初始化过程中出错:', error)
    }
  }

  // 添加剪贴板项
  async function addClipboardItem(item) {
    console.log('[Clipboard Store] 开始添加剪贴板项:', {
      id: item.id,
      category: item.category,
      hasContent: !!item.content,
      contentLength: item.content?.length
    })
    
    if (!item || !item.content) {
      console.error('[Clipboard Store] 无效的剪贴板项')
      return
    }

    try {
      let processedItem = {
        id: item.id,
        category: item.category,
        content: item.content,
        timestamp: item.timestamp
      }

      // 如果是图片且需要压缩
      if (item.category === 'image' && settings.value.maxImageSize) {
        console.log('[Clipboard Store] 开始压缩图片')
        processedItem.content = await autoCompressImage(item.content, settings.value.maxImageSize)
        console.log('[Clipboard Store] 图片压缩完成')
      }

      // 如果启用了加密且不是图片
      if (settings.value.encryptEnabled && item.category !== 'image') {
        console.log('[Clipboard Store] 开始加密内容')
        processedItem.content = await encrypt(item.content)
        console.log('[Clipboard Store] 内容加密完成')
      }

      console.log('[Clipboard Store] 添加到历史记录')
      clipboardItems.value.unshift(processedItem)
      console.log('[Clipboard Store] 当前历史记录数量:', clipboardItems.value.length)

      // 限制历史记录数量
      if (settings.value.maxHistoryItems && clipboardItems.value.length > settings.value.maxHistoryItems) {
        console.log('[Clipboard Store] 裁剪超出的历史记录')
        clipboardItems.value = clipboardItems.value.slice(0, settings.value.maxHistoryItems)
        console.log('[Clipboard Store] 裁剪后的历史记录数量:', clipboardItems.value.length)
      }

      // 准备要保存的数据
      const itemsToSave = clipboardItems.value.map(item => ({
        id: item.id,
        category: item.category,
        content: item.content,
        timestamp: item.timestamp
      }))

      // 保存到本地存储
      console.log('[Clipboard Store] 保存到本地存储')
      const ipcRenderer = getIpcRenderer()
      if (ipcRenderer) {
        console.log('[Clipboard Store] 保存历史记录:', itemsToSave.length, '条记录')
        ipcRenderer.send('save-clipboard-history', itemsToSave)
        console.log('[Clipboard Store] 本地存储保存完成')
      } else {
        console.error('[Clipboard Store] 无法获取 ipcRenderer')
      }

    } catch (error) {
      console.error('[Clipboard Store] 添加剪贴板项时出错:', error)
      throw new Error('添加失败: ' + error.message)
    }
  }

  // 获取解密内容
  function getDecryptedContent(item) {
    console.log('[Clipboard Store] 开始获取解密内容:', {
      id: item?.id,
      category: item?.category,
      hasContent: !!item?.content,
      contentLength: item?.content?.length,
      isEncrypted: settings.value.encryptEnabled
    })

    try {
      if (!item) {
        console.error('[Clipboard Store] 项目为空')
        return ''
      }

      if (!item.content) {
        console.error('[Clipboard Store] 项目内容为空')
        return ''
      }

      // 图片内容直接返回
      if (item.category === 'image') {
        console.log('[Clipboard Store] 返回图片内容')
        return item.content
      }

      // 如果启用了加密，尝试解密
      if (settings.value.encryptEnabled && item.category !== 'image') {
        try {
          console.log('[Clipboard Store] 尝试解密内容')
          const decrypted = decrypt(item.content)
          console.log('[Clipboard Store] 解密成功，内容长度:', decrypted.length)
          return decrypted
        } catch (error) {
          // 如果解密失败，可能是未加密的内容
          console.warn('[Clipboard Store] 解密失败，返回原始内容:', error)
          return item.content
        }
      }

      // 未加密的内容直接返回
      console.log('[Clipboard Store] 返回未加密的原始内容')
      return item.content
    } catch (error) {
      console.error('[Clipboard Store] 获取解密内容时出错:', error)
      return ''
    }
  }

  // 移除剪贴板项
  function removeClipboardItem(id) {
    console.log('[Clipboard Store] 移除剪贴板项:', id)
    
    try {
      // 过滤掉要删除的项目
      clipboardItems.value = clipboardItems.value.filter(item => item.id !== id)
      
      // 准备要保存的数据
      const itemsToSave = clipboardItems.value.map(item => ({
        id: item.id,
        category: item.category,
        content: item.content,
        timestamp: item.timestamp
      }))
      
      // 保存到本地存储
      const ipcRenderer = getIpcRenderer()
      if (ipcRenderer) {
        console.log('[Clipboard Store] 保存更新后的历史记录:', itemsToSave.length, '条记录')
        ipcRenderer.send('save-clipboard-history', itemsToSave)
        console.log('[Clipboard Store] 本地存储已更新')
      } else {
        console.error('[Clipboard Store] 无法获取 ipcRenderer')
      }
    } catch (error) {
      console.error('[Clipboard Store] 删除剪贴板项时出错:', error)
      throw new Error('删除失败: ' + error.message)
    }
  }

  // 清空历史记录
  function clearHistory() {
    console.log('[Clipboard Store] 清空历史记录')
    clipboardItems.value = []
    
    // 保存到本地存储
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      ipcRenderer.send('clear-clipboard-history')
      console.log('[Clipboard Store] 本地存储已清空')
    }
  }

  // 更新设置
  function updateSettings(newSettings) {
    console.log('[Clipboard Store] 更新设置:', newSettings)
    // 更新本地状态
    settings.value = { ...settings.value, ...newSettings }
    
    // 保存到本地存储
    const ipcRenderer = getIpcRenderer()
    if (ipcRenderer) {
      // 只发送必要的设置属性
      const settingsToSave = {
        syncEnabled: settings.value.syncEnabled,
        encryptEnabled: settings.value.encryptEnabled,
        maxHistoryItems: settings.value.maxHistoryItems,
        syncInterval: settings.value.syncInterval,
        retentionPeriod: settings.value.retentionPeriod,
        maxImageSize: settings.value.maxImageSize
      }
      ipcRenderer.send('save-settings', settingsToSave)
      console.log('[Clipboard Store] 设置已保存到本地存储')
    }
  }

  // 在组件挂载时初始化
  onMounted(() => {
    console.log('[Clipboard Store] 组件挂载，开始初始化')
    init()
  })

  return {
    settings,
    clipboardItems,
    categories,
    currentCategory,
    searchKeyword,
    filteredItems,
    addClipboardItem,
    removeClipboardItem,
    clearHistory,
    updateSettings,
    getDecryptedContent
  }
}) 