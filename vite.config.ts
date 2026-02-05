import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // ✅ ADD THIS LEGACY PLUGIN BLOCK
    legacy({
      // This creates a build compatible with Windows 7 browsers (Chrome 87+, Firefox 78+)
      targets: ['chrome >= 87', 'firefox >= 78', 'edge >= 88', 'defaults', 'not IE 11'],
      // Helps ensure complex features work on old browsers
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'] 
    }),
  ],
})