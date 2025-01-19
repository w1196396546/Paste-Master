// 将图片文件转换为Base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

// 将剪贴板中的图片转换为Base64
export async function clipboardImageToBase64(clipboardItems) {
  for (const item of clipboardItems) {
    if (item.type === 'image/png' || item.type === 'image/jpeg' || item.type === 'image/gif') {
      try {
        const blob = await item.getType('image/png')
        return await fileToBase64(blob)
      } catch (error) {
        console.error('Convert clipboard image failed:', error)
        return null
      }
    }
  }
  return null
}

// 压缩Base64图片
export function compressBase64Image(base64, maxWidth = 800, maxHeight = 600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = base64
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      // 计算缩放比例
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height)
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // 转换为Base64
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
  })
}

// 检查字符串是否为Base64图片
export function isBase64Image(str) {
  if (!str) return false
  try {
    return str.startsWith('data:image/')
  } catch {
    return false
  }
}

// 获取Base64图片的大小（KB）
export function getBase64Size(base64) {
  try {
    const base64Length = base64.split(',')[1].length
    return Math.round((base64Length * 3) / 4 / 1024)
  } catch {
    return 0
  }
}

// 自动压缩Base64图片到指定大小以下
export async function autoCompressImage(base64, maxSizeKB = 500) {
  let quality = 0.9
  let result = base64
  let size = getBase64Size(base64)

  while (size > maxSizeKB && quality > 0.1) {
    quality -= 0.1
    result = await compressBase64Image(base64, 800, 600, quality)
    size = getBase64Size(result)
  }

  return result
} 