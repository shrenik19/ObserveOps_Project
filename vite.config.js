import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// __dirname is not defined in an ESM config ("type": "module"), so derive it.
const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        reportCategories: resolve(root, 'report-categories.html'),
        lama: resolve(root, 'lama.html'),
      },
    },
  },
})
