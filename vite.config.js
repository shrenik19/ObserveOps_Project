import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// __dirname is not defined in an ESM config ("type": "module"), so derive it.
const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  // A GitHub Pages PROJECT site serves from /<repo>/, not from the domain root, so every asset URL
  // needs that prefix. Taken from the environment rather than hardcoded, so the same build works
  // locally, on Pages, and on any host that serves from the root.
  base: process.env.BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        // The app. One page; screens are routes inside it.
        main: resolve(root, 'index.html'),
        // Redirect stubs, kept only so already-published URLs keep working. This list grows when a
        // URL needs preserving — never when a screen is added.
        reportCategories: resolve(root, 'report-categories.html'),
        lama: resolve(root, 'lama.html'),
      },
    },
  },
})
