import CryptoJS from 'crypto-js'

const SECRET_KEY = 'your-secret-key-here'

// 加密函数
export function encrypt(text) {
  console.log('[Crypto] 开始加密，内容长度:', text.length)
  try {
    // 添加标记表示这是加密的内容
    const markedText = 'ENCRYPTED:' + text
    const encrypted = CryptoJS.AES.encrypt(markedText, SECRET_KEY).toString()
    console.log('[Crypto] 加密成功')
    return encrypted
  } catch (error) {
    console.error('[Crypto] 加密失败:', error)
    throw new Error('加密失败: ' + error.message)
  }
}

// 解密函数
export function decrypt(text) {
  console.log('[Crypto] 开始解密，内容长度:', text.length)
  try {
    // 首先检查是否是加密的内容
    const decrypted = CryptoJS.AES.decrypt(text, SECRET_KEY)
    const utf8Text = decrypted.toString(CryptoJS.enc.Utf8)
    
    // 检查是否包含加密标记
    if (!utf8Text.startsWith('ENCRYPTED:')) {
      console.log('[Crypto] 内容未加密，返回原始内容')
      return text
    }
    
    // 移除加密标记并返回实际内容
    const actualContent = utf8Text.substring(10)
    console.log('[Crypto] 解密成功，内容长度:', actualContent.length)
    return actualContent
  } catch (error) {
    console.log('[Crypto] 解密失败，返回原始内容:', error)
    return text
  }
} 