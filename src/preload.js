const { contextBridge, ipcRenderer } = require('electron')

console.log('[Preload] 预加载脚本开始运行')

// 定义要暴露的 API
const electronAPI = {
  platform: process.platform,
  ipcRenderer: {
    send: (channel, data) => {
      console.log('[Preload] ipcRenderer.send:', channel, {
        data: channel.includes('clipboard') ? '(clipboard data...)' : data
      })
      const validChannels = [
        'get-settings',
        'save-settings',
        'get-clipboard-history',
        'save-clipboard-history',
        'clear-clipboard-history',
        'get-clipboard-content',
        'set-clipboard-content',
        'window-control'
      ]
      if (validChannels.includes(channel)) {
        console.log('[Preload] 发送消息到主进程:', channel)
        ipcRenderer.send(channel, data)
      } else {
        console.warn('[Preload] 无效的通道:', channel)
      }
    },
    on: (channel, func) => {
      console.log('[Preload] ipcRenderer.on:', channel)
      const validChannels = [
        'clipboard-change',
        'settings-loaded',
        'clipboard-history',
        'clipboard-content',
        'settings-saved',
        'clipboard-history-saved'
      ]
      if (validChannels.includes(channel)) {
        console.log('[Preload] 添加事件监听器:', channel)
        const subscription = (_event, ...args) => {
          console.log('[Preload] 接收到事件:', channel, {
            args: channel.includes('clipboard') ? '(clipboard data...)' : args
          })
          func(...args)
        }
        ipcRenderer.on(channel, subscription)
        return () => {
          console.log('[Preload] 移除事件监听器:', channel)
          ipcRenderer.removeListener(channel, subscription)
        }
      } else {
        console.warn('[Preload] 尝试监听无效的通道:', channel)
      }
    },
    once: (channel, func) => {
      console.log('[Preload] ipcRenderer.once:', channel)
      const validChannels = [
        'settings-loaded',
        'clipboard-history',
        'clipboard-content',
        'settings-saved',
        'clipboard-history-saved'
      ]
      if (validChannels.includes(channel)) {
        console.log('[Preload] 添加一次性事件监听器:', channel)
        const subscription = (_event, ...args) => {
          console.log('[Preload] 接收到一次性事件:', channel, {
            args: channel.includes('clipboard') ? '(clipboard data...)' : args
          })
          func(...args)
        }
        ipcRenderer.once(channel, subscription)
      } else {
        console.warn('[Preload] 尝试添加无效的一次性监听器:', channel)
      }
    },
    removeAllListeners: (channel) => {
      console.log('[Preload] ipcRenderer.removeAllListeners:', channel)
      const validChannels = [
        'clipboard-change',
        'settings-loaded',
        'clipboard-history',
        'clipboard-content'
      ]
      if (validChannels.includes(channel)) {
        console.log('[Preload] 移除所有监听器:', channel)
        ipcRenderer.removeAllListeners(channel)
      } else {
        console.warn('[Preload] 尝试移除无效通道的监听器:', channel)
      }
    }
  }
}

// 暴露 API 到渲染进程
try {
  console.log('[Preload] 开始暴露 API')
  if (process.contextIsolated) {
    console.log('[Preload] 使用 contextBridge 暴露 API')
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } else {
    console.log('[Preload] 使用 global 暴露 API')
    global.electron = electronAPI
  }
  console.log('[Preload] API 暴露成功')
} catch (error) {
  console.error('[Preload] API 暴露失败:', error)
}

// 验证 API 是否可用
process.once('loaded', () => {
  console.log('[Preload] 进程加载完成')
  console.log('[Preload] electron API 是否可用:', !!global.electron)
})

console.log('[Preload] 预加载脚本加载完成') 