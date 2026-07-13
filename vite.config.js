import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    viteSingleFile(), // inlines all JS/CSS → single self-contained HTML for HtmlService
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: Infinity,
    chunkSizeWarningLimit: Infinity,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
