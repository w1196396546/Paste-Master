const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 使用 ImageMagick 转换图标
const convert = () => {
  const sourcePath = path.join(__dirname, '../public/icons/icon.svg');
  const targetPath = path.join(__dirname, '../public/icons/icon.png');

  // 使用 ImageMagick 的 convert 命令
  const command = `magick convert "${sourcePath}" -resize 256x256 "${targetPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('转换失败:', error);
      // 如果 ImageMagick 不可用，尝试复制预设的 PNG 文件
      const defaultIconPath = path.join(__dirname, '../public/icons/default-icon.png');
      if (fs.existsSync(defaultIconPath)) {
        fs.copyFileSync(defaultIconPath, targetPath);
        console.log('已使用默认图标');
      } else {
        console.error('无法找到默认图标');
      }
      return;
    }
    console.log('图标转换成功');
  });
};

convert(); 