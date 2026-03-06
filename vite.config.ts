import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { version } from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  base: "/FlexiHarAnalyzer/",
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
