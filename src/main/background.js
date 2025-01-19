import { app, protocol, BrowserWindow, ipcMain, clipboard, Tray, Menu, nativeImage } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import path from 'path'
import Store from 'electron-store'

const isDevelopment = process.env.NODE_ENV !== 'production'
const store = new Store({
  name: 'plate-data',
  defaults: {
    settings: {
      syncEnabled: true,
      encryptEnabled: true,
      maxHistoryItems: 100,
      syncInterval: 30,
      retentionPeriod: 30,
      maxImageSize: 500
    },
    clipboardItems: [],
    shortcuts: {
      quickAccess: process.platform === 'darwin' ? 'Command+Shift+V' : 'Control+Shift+V'
    }
  }
})

// 全局变量
let mainWindow
let tray
let isQuitting = false
let clipboardWatcher
let quickAccessWindow = null

// 创建主窗口
async function createWindow() {
  const iconPath = isDevelopment
    ? path.join(process.cwd(), 'public/icons/icon.png')
    : path.join(__dirname, '../public/icons/icon.png')

  console.log('[Main] 窗口图标路径:', iconPath)
  console.log('[Main] 开始创建主窗口')
  
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: isDevelopment
        ? path.join(process.cwd(), 'src/preload.js')
        : path.join(__dirname, '../preload.js'),
      webSecurity: true,
      sandbox: false,
      devTools: true
    },
    frame: false,
    show: true,
    icon: iconPath,
    transparent: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    // macOS 特定设置
    ...(process.platform === 'darwin' ? {
      trafficLightPosition: { x: 10, y: 10 },
      vibrancy: 'under-window',
      visualEffectState: 'active'
    } : {})
  })

  // 打开开发者工具
  mainWindow.webContents.openDevTools()

  console.log('[Main] 主窗口已创建，preload路径:', isDevelopment
    ? path.join(process.cwd(), 'src/preload.js')
    : path.join(__dirname, '../preload.js'))
  console.log('[Main] 主窗口已创建，准备加载URL')

  // 监听加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] 窗口加载失败:', errorCode, errorDescription)
  })

  // 监听渲染进程加载完成
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] 渲染进程加载完成')
    try {
      // 开始监听剪贴板
      console.log('[Main] 准备启动剪贴板监听')
      watchClipboard()
      console.log('[Main] 剪贴板监听启动完成')
    } catch (error) {
      console.error('[Main] 启动剪贴板监听失败:', error)
      console.error('[Main] 错误堆栈:', error.stack)
    }
  })

  // 监听渲染进程准备就绪
  mainWindow.webContents.on('dom-ready', () => {
    console.log('[Main] DOM 准备就绪')
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    console.log('[Main] 开发环境：加载开发服务器URL:', process.env.WEBPACK_DEV_SERVER_URL)
    await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
  } else {
    console.log('[Main] 生产环境：加载本地文件')
    createProtocol('app')
    mainWindow.loadURL('app://./index.html')
  }

  // 窗口关闭时的处理
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

// 创建托盘图标
function createTray() {
  try {
    const iconPath = isDevelopment
      ? path.join(process.cwd(), 'public/icons/icon.png')
      : path.join(__dirname, '../public/icons/icon.png')
    
    console.log('[Main] 托盘图标路径:', iconPath)
    // 根据平台调整图标大小
    const icon = nativeImage.createFromPath(iconPath).resize({ 
      width: process.platform === 'darwin' ? 18 : 16, 
      height: process.platform === 'darwin' ? 18 : 16 
    })
    tray = new Tray(icon)
    
    // 根据平台设置不同的菜单项
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => mainWindow.show()
      },
      {
        type: 'separator'
      },
      process.platform === 'darwin' ? {
        label: '服务',
        role: 'services',
      } : null,
      process.platform === 'darwin' ? {
        type: 'separator'
      } : null,
      {
        label: process.platform === 'darwin' ? '退出 Plate' : '退出',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ].filter(Boolean))  // 过滤掉 null 项

    // macOS 特有的设置
    if (process.platform === 'darwin') {
      app.dock.setIcon(nativeImage.createFromPath(iconPath))
      tray.setContextMenu(contextMenu)
    } else {
      // Windows 和 Linux 的右键菜单
      tray.setContextMenu(contextMenu)
      // 左键点击显示窗口
      tray.on('click', () => mainWindow.show())
    }

    tray.setToolTip('Plate 剪贴板管理器')
  } catch (error) {
    console.error('[Main] 创建托盘图标失败:', error)
    console.error('[Main] 错误详情:', error.stack)
  }
}

// 将图片转换为Base64
function imageToBase64(image) {
  return image.toDataURL()
}

// 判断是否为链接
function isValidUrl(text) {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// 判断是否为代码
function isCodeContent(text) {
  if (!text || typeof text !== 'string') return false

  // 检查是否包含常见的编程语言关键字
  const codePatterns = [
    /^(function|class|import|export|const|let|var|if|for|while)\s/,
    /{[\s\S]*}/,
    /\(\s*\)\s*=>/,
    /^[a-zA-Z]+\s+[a-zA-Z_$][0-9a-zA-Z_$]*\s*\(/,
    /^#include/,
    /^package\s/,
    /^using\s/,
    /^public\s/,
    /^private\s/,
    /^protected\s/
  ]

  // 检查是否包含多行代码结构
  const lines = text.split('\n')
  if (lines.length > 2) {
    const indentedLines = lines.filter(line => /^\s+/.test(line))
    if (indentedLines.length > 1) return true
  }

  // 检查是否匹配代码模式
  return codePatterns.some(pattern => pattern.test(text.trim()))
}

// 监听剪贴板变化
function watchClipboard() {
  let lastText = clipboard.readText()
  let lastImage = clipboard.readImage()

  clipboardWatcher = setInterval(async () => {
    try {
      const newText = clipboard.readText()
      const newImage = clipboard.readImage()
      
      // 检查是否真的发生了变化
      const textChanged = newText && newText !== lastText
      const imageChanged = !newImage.isEmpty() && (lastImage.isEmpty() || newImage.toDataURL() !== lastImage.toDataURL())

      if (!textChanged && !imageChanged) return

      // 获取活跃窗口信息
      const activeWin = BrowserWindow.getFocusedWindow()
      let sourceApp = '未知来源'
      
      // 如果没有找到活跃窗口，尝试获取所有窗口
      if (!activeWin) {
        const windows = BrowserWindow.getAllWindows()
        for (const win of windows) {
          if (!win.isMinimized()) {
            const title = win.getTitle()
            if (title && title !== 'Plate') {
              sourceApp = title
              break
            }
          }
        }
      } else {
        sourceApp = activeWin.getTitle()
      }

      console.log('[Main] 检测到剪贴板变化:', {
        hasText: !!newText,
        hasImage: !newImage.isEmpty(),
        textChanged,
        imageChanged,
        sourceApp
      })

      // 处理文本变化
      if (textChanged) {
        // 判断内容类型
        let category = 'text'
        if (isValidUrl(newText)) {
          category = 'link'
        } else if (isCodeContent(newText)) {
          category = 'code'
        }

        const clipboardItem = {
          id: Date.now(),
          category: category,
          content: newText,
          timestamp: new Date().toISOString(),
          sourceApp: sourceApp
        }

        // 发送到渲染进程
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('[Main] 发送变化到渲染进程:', {
            id: clipboardItem.id,
            category: clipboardItem.category,
            sourceApp: clipboardItem.sourceApp
          })
          mainWindow.webContents.send('clipboard-change', clipboardItem)

          // 更新本地存储
          const items = store.get('clipboardItems', [])
          items.unshift(clipboardItem)
          store.set('clipboardItems', items)
        }
        
        lastText = newText
      }

      // 处理图片变化
      if (imageChanged) {
        const clipboardItem = {
          id: Date.now(),
          category: 'image',
          content: newImage.toDataURL(),
          timestamp: new Date().toISOString(),
          sourceApp: sourceApp
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard-change', clipboardItem)
          
          const items = store.get('clipboardItems', [])
          items.unshift(clipboardItem)
          store.set('clipboardItems', items)
        }

        lastImage = newImage
      }
    } catch (error) {
      console.error('[Main] 处理剪贴板变化时出错:', error)
    }
  }, 1000) // 每秒检查一次
}

// 创建快速访问窗口
function createQuickAccessWindow() {
  if (quickAccessWindow) {
    quickAccessWindow.show()
    return
  }

  const display = require('electron').screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  quickAccessWindow = new BrowserWindow({
    width: 380,
    height: 600,
    x: Math.floor(width - 400),
    y: Math.floor(height / 2 - 300),
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: isDevelopment
        ? path.join(process.cwd(), 'src/preload.js')
        : path.join(__dirname, '../preload.js'),
      webSecurity: true,
      sandbox: false
    }
  })

  // 移除菜单栏
  quickAccessWindow.setMenu(null)

  // 加载独立的页面
  const quickAccessURL = isDevelopment
    ? process.env.WEBPACK_DEV_SERVER_URL + 'quickAccess.html'
    : 'app://./quickAccess.html'

  console.log('[QuickAccess] 加载页面:', quickAccessURL)
  
  quickAccessWindow.loadURL(quickAccessURL).catch(error => {
    console.error('[QuickAccess] 加载页面失败:', error)
  })

  // 开发环境打开开发者工具
  if (isDevelopment) {
    // quickAccessWindow.webContents.openDevTools()
  }

  // 窗口失去焦点时自动隐藏
  quickAccessWindow.on('blur', () => {
    quickAccessWindow.hide()
  })

  // 窗口关闭时清理引用
  quickAccessWindow.on('closed', () => {
    quickAccessWindow = null
  })

  // 准备好后显示窗口
  quickAccessWindow.once('ready-to-show', () => {
    quickAccessWindow.show()
  })
}

// 获取默认快捷键
function getDefaultShortcut() {
  // 根据不同操作系统返回默认快捷键
  return process.platform === 'darwin'
    ? 'Command+Shift+V'  // macOS
    : 'Control+Shift+V'  // Windows/Linux
}

// 转换快捷键格式
function convertShortcutToElectron(shortcut) {
  if (!shortcut) return ''
  
  // 将快捷键字符串分割成数组
  const parts = shortcut.split('+').map(part => part.trim())
  
  // 转换修饰键
  const modifiers = []
  const mainKey = parts[parts.length - 1]
  
  // 处理修饰键
  parts.slice(0, -1).forEach(part => {
    const lower = part.toLowerCase()
    if (lower === 'control' || lower === 'ctrl') modifiers.push('CommandOrControl')
    else if (lower === 'command' || lower === 'cmd') modifiers.push('CommandOrControl')
    else if (lower === 'alt') modifiers.push('Alt')
    else if (lower === 'shift') modifiers.push('Shift')
  })
  
  // 确保有主键
  if (!mainKey) return ''
  
  // 组合成 Electron 格式的快捷键
  return [...modifiers, mainKey].join('+')
}

// 注册全局快捷键
function registerGlobalShortcuts() {
  const { globalShortcut } = require('electron')
  
  // 先注销所有快捷键
  globalShortcut.unregisterAll()
  
  try {
    // 从存储中获取快捷键配置，如果没有则使用默认值
    const quickAccessShortcut = store.get('shortcuts.quickAccess')
    
    // 如果没有存储的快捷键，设置并存储默认值
    if (!quickAccessShortcut) {
      const defaultShortcut = getDefaultShortcut()
      store.set('shortcuts.quickAccess', defaultShortcut)
      console.log('[Shortcut] 设置默认快捷键:', defaultShortcut)
    }
    
    // 获取最终使用的快捷键
    const finalShortcut = quickAccessShortcut || getDefaultShortcut()
    console.log('[Shortcut] 正在注册快捷键:', finalShortcut)
    
    // 转换快捷键格式
    const electronShortcut = convertShortcutToElectron(finalShortcut)
    console.log('[Shortcut] 转换后的快捷键格式:', electronShortcut)
    
    const ret = globalShortcut.register(electronShortcut, () => {
      console.log('[Shortcut] 触发快速访问快捷键')
      if (quickAccessWindow && quickAccessWindow.isVisible()) {
        console.log('[Shortcut] 隐藏快速访问窗口')
        quickAccessWindow.hide()
      } else {
        console.log('[Shortcut] 创建/显示快速访问窗口')
        createQuickAccessWindow()
      }
    })

    if (!ret) {
      console.error('[Shortcut] 快捷键注册失败')
      // 如果注册失败，重置为默认快捷键
      const defaultShortcut = getDefaultShortcut()
      store.set('shortcuts.quickAccess', defaultShortcut)
      console.log('[Shortcut] 重置为默认快捷键:', defaultShortcut)
      // 尝试重新注册默认快捷键
      const defaultElectronShortcut = convertShortcutToElectron(defaultShortcut)
      globalShortcut.register(defaultElectronShortcut, () => {
        if (quickAccessWindow && quickAccessWindow.isVisible()) {
          quickAccessWindow.hide()
        } else {
          createQuickAccessWindow()
        }
      })
    } else {
      console.log('[Shortcut] 快捷键注册成功')
    }
  } catch (error) {
    console.error('[Shortcut] 快捷键注册错误:', error)
    // 发生错误时，重置为默认快捷键
    const defaultShortcut = getDefaultShortcut()
    store.set('shortcuts.quickAccess', defaultShortcut)
    console.log('[Shortcut] 错误后重置为默认快捷键:', defaultShortcut)
  }
}

// 应用初始化
app.on('ready', async () => {
  try {
    console.log('[Main] 应用准备就绪，开始创建窗口')
    
    await createWindow()
    console.log('[Main] 主窗口创建完成')
    
    console.log('[Main] 开始创建托盘图标')
    createTray()
    console.log('[Main] 托盘图标创建完成')

    console.log('[Main] 注册全局快捷键')
    registerGlobalShortcuts()
    console.log('[Main] 全局快捷键注册完成')
  } catch (error) {
    console.error('[Main] 应用初始化失败:', error)
  }
})

// 窗口激活
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().then(() => {
      mainWindow.webContents.on('did-finish-load', () => {
        console.log('窗口重新加载完成，开始监听剪贴板')
        watchClipboard()
      })
    })
  }
})

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出
app.on('before-quit', () => {
  isQuitting = true
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher)
  }
})

// 应用退出前清理
app.on('will-quit', () => {
  // 注销所有快捷键
  const { globalShortcut } = require('electron')
  globalShortcut.unregisterAll()
})

// 处理快速访问窗口的关闭请求
ipcMain.on('close-quick-access', () => {
  if (quickAccessWindow) {
    quickAccessWindow.hide()
  }
})

// 开发环境的特殊处理
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

// IPC 通信处理
ipcMain.on('get-clipboard-content', (event) => {
  console.log('获取剪贴板内容')
  const content = {
    text: clipboard.readText(),
    image: clipboard.readImage().isEmpty() ? null : imageToBase64(clipboard.readImage())
  }
  event.reply('clipboard-content', content)
})

ipcMain.on('set-clipboard-content', (event, content) => {
  console.log('设置剪贴板内容:', content)
  if (content.startsWith('data:image/')) {
    // 处理Base64图片
    const base64Data = content.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const image = nativeImage.createFromBuffer(buffer)
    clipboard.writeImage(image)
  } else {
    // 处理文本内容
    clipboard.writeText(content)
  }
})

// 设置相关
ipcMain.on('save-settings', (event, settings) => {
  console.log('[Main] 收到保存设置请求:', settings)
  store.set('settings', settings)
  event.reply('settings-saved', true)
  console.log('[Main] 设置已保存')
})

ipcMain.on('get-settings', (event) => {
  console.log('[Main] 收到获取设置请求')
  const settings = store.get('settings')
  event.reply('settings-loaded', settings)
  console.log('[Main] 已发送设置:', settings)
})

// 剪贴板历史记录
ipcMain.on('get-clipboard-history', (event) => {
  console.log('[Main] 收到获取剪贴板历史请求')
  const items = store.get('clipboardItems', [])
  console.log('[Main] 历史记录详细内容:', JSON.stringify(items, null, 2))
  event.reply('clipboard-history', items)
  console.log('[Main] 已发送剪贴板历史:', items.length, '条记录')
})

ipcMain.on('save-clipboard-history', (event, items) => {
  console.log('[Main] 收到保存剪贴板历史请求:', items.length, '条记录')
  store.set('clipboardItems', items)
  event.reply('clipboard-history-saved', true)
  console.log('[Main] 剪贴板历史已保存')
})

ipcMain.on('clear-clipboard-history', (event) => {
  console.log('[Main] 收到清空剪贴板历史请求')
  store.set('clipboardItems', [])
  event.reply('clipboard-history', [])
  console.log('[Main] 剪贴板历史已清空')
})

ipcMain.on('window-control', (event, command) => {
  if (!mainWindow) return

  switch (command) {
    case 'minimize':
      mainWindow.minimize()
      break
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
      break
    case 'close':
      mainWindow.hide()
      break
  }
})

// 添加 IPC 处理程序
ipcMain.on('update-shortcut', (event, { key, shortcut }) => {
  console.log('[Main] 更新快捷键:', key, shortcut)
  
  try {
    // 保存新的快捷键配置
    store.set(`shortcuts.${key}`, shortcut)
    console.log('[Main] 快捷键已保存到存储:', shortcut)
    
    // 重新注册快捷键
    registerGlobalShortcuts()
    
    event.reply('shortcut-updated', { success: true })
  } catch (error) {
    console.error('[Main] 更新快捷键失败:', error)
    event.reply('shortcut-updated', { success: false, error: error.message })
  }
})

ipcMain.on('get-shortcuts', (event) => {
  try {
    const shortcuts = {
      quickAccess: store.get('shortcuts.quickAccess', getDefaultShortcut())
    }
    console.log('[Main] 获取快捷键配置:', shortcuts)
    event.reply('shortcuts-loaded', shortcuts)
  } catch (error) {
    console.error('[Main] 获取快捷键配置失败:', error)
    event.reply('shortcuts-loaded', { quickAccess: getDefaultShortcut() })
  }
}) 