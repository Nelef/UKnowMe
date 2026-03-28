const { defineConfig } = require('@vue/cli-service')

const backendHttpTarget = 'http://127.0.0.1:8080'
const backendWsTarget = 'ws://127.0.0.1:8080'
const devServerSocketPath = '/_ukm_hmr'

module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  devServer: {
    // Avoid colliding with backend WebSocket endpoints proxied under `/ws`.
    client: {
      webSocketURL: {
        pathname: devServerSocketPath,
      },
    },
    webSocketServer: {
      type: 'ws',
      options: {
        path: devServerSocketPath,
      },
    },
    proxy: {
      '/member': {
        target: backendHttpTarget,
        changeOrigin: true,
      },
      '/maching': {
        target: backendHttpTarget,
        changeOrigin: true,
      },
      '/feature': {
        target: backendHttpTarget,
        changeOrigin: true,
      },
      '/room': {
        target: backendHttpTarget,
        changeOrigin: true,
      },
      '/avatar': {
        target: backendHttpTarget,
        changeOrigin: true,
      },
      '/notice': {
        target: backendHttpTarget,
        changeOrigin: true,
      },
      '/session': {
        target: backendHttpTarget,
        changeOrigin: true,
      },
      '/report': {
        target: backendHttpTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: backendWsTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
