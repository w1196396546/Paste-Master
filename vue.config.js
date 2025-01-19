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
        asar: true,
        win: {
          target: [
            {
              target: 'nsis',
              arch: ['x64']
            }
          ]
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: "Plate"
        },
        files: [
          "dist_electron/**/*",
          "node_modules/**/*",
          "package.json"
        ],
        extraResources: [
          {
            from: "src/main",
            to: "app/src/main"
          },
          {
            from: "src/preload.js",
            to: "app/src/preload.js"
          }
        ]
      }
    }
  }
})
