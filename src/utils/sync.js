import axios from 'axios'
import { io } from 'socket.io-client'
import { encrypt, decrypt } from './crypto'

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000'
let socket = null

export class SyncService {
  constructor() {
    this.token = localStorage.getItem('plate_token')
    this.deviceId = localStorage.getItem('plate_device_id') || this._generateDeviceId()
  }

  // 初始化WebSocket连接
  initSocket() {
    if (!this.token) return

    socket = io(API_BASE_URL, {
      auth: {
        token: this.token,
        deviceId: this.deviceId
      }
    })

    socket.on('connect', () => {
      console.log('WebSocket connected')
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    socket.on('clipboard-update', (data) => {
      if (data.deviceId !== this.deviceId) {
        // 处理来自其他设备的更新
        this.handleRemoteUpdate(data)
      }
    })
  }

  // 生成设备ID
  _generateDeviceId() {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('plate_device_id', id)
    return id
  }

  // 用户登录
  async login(username, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      })

      this.token = response.data.token
      localStorage.setItem('plate_token', this.token)
      this.initSocket()
      return response.data
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  // 用户注册
  async register(username, password, email) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username,
        password,
        email
      })
      return response.data
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  // 同步剪贴板内容到云端
  async syncToCloud(clipboardItem) {
    if (!this.token || !socket?.connected) return

    try {
      const encryptedItem = {
        ...clipboardItem,
        content: encrypt(clipboardItem.content),
        deviceId: this.deviceId,
        timestamp: new Date().toISOString()
      }

      await axios.post(`${API_BASE_URL}/clipboard/sync`, encryptedItem, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      })

      // 通知其他设备
      socket.emit('clipboard-update', encryptedItem)
    } catch (error) {
      console.error('Sync to cloud failed:', error)
      throw error
    }
  }

  // 从云端获取剪贴板历史
  async getCloudHistory() {
    if (!this.token) return []

    try {
      const response = await axios.get(`${API_BASE_URL}/clipboard/history`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      })

      return response.data.map(item => ({
        ...item,
        content: decrypt(item.content)
      }))
    } catch (error) {
      console.error('Get cloud history failed:', error)
      throw error
    }
  }

  // 处理来自其他设备的更新
  handleRemoteUpdate(data) {
    // 这个方法将由外部提供回调函数来处理
    if (this.onRemoteUpdate) {
      const decryptedItem = {
        ...data,
        content: decrypt(data.content)
      }
      this.onRemoteUpdate(decryptedItem)
    }
  }

  // 设置远程更新处理器
  setRemoteUpdateHandler(handler) {
    this.onRemoteUpdate = handler
  }

  // 断开连接
  disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  }
}

export const syncService = new SyncService() 