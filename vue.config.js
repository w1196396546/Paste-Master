const { defineConfig } = require('@vue/cli-service')
const path = require('path')

module.exports = defineConfig({
  transpileDependencies: true,
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html'
    },
    quickAccess: {
      entry: 'src/quick-access.js',
      template: 'public/quick-access.html',
      filename: 'quick-access.html'
    }
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: 'src/preload.js',
      mainProcessFile: 'src/main/background.js',
      mainProcessWatch: ['src/main'],
      builderOptions: {
        appId: 'com.plate.app',
        productName: 'Plate',
        directories: {
          output: 'dist_electron'
        },
        win: {
          icon: 'public/icons/icon.svg',
          target: [
            {
              target: 'nsis',
              arch: ['x64']
            }
          ]
        },
        mac: {
          icon: 'public/icons/icon.svg'
        },
        linux: {
          icon: 'public/icons/icon.svg'
        },
        files: [
          "**/*",
          "src/preload.js",
          "public/icons/*"
        ]
      }
    }
  }
})
