const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [16, 24, 32, 48, 64, 128, 256, 512]
const iconPath = path.join(__dirname, '../public/icons/icon.svg')
const outputDir = path.join(__dirname, '../public/icons')

async function generateIcons() {
  try {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 读取SVG文件
    const svgBuffer = fs.readFileSync(iconPath)

    // 生成不同尺寸的PNG
    for (const size of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
      
      console.log(`Generated ${size}x${size} icon`)
    }

    // 生成主图标文件
    await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toFile(path.join(outputDir, 'icon.png'))
    
    console.log('Generated main icon.png')

    // 生成 ICO 文件 (Windows)
    const images = await Promise.all(
      sizes.map(async size => {
        const buffer = await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer()
        return { input: buffer, size }
      })
    )

    console.log('Icon generation completed successfully')
  } catch (error) {
    console.error('Error generating icons:', error)
  }
}

generateIcons() 