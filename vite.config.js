import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue({
    // Include filename in compiled output for better debugging
    include: [/\.vue$/],
    script: {
      // Add more detailed source mapping
      defineModel: true,
      propsDestructure: true
    },
    // Better error reporting
    template: {
      compilerOptions: {
        // Preserve whitespace can help with line mapping
        whitespace: 'preserve'
      }
    }
  })],
  base: '/tip-tracker/',
  define: {
    // Enable more detailed Vue debugging
    __VUE_PROD_DEVTOOLS__: true,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true
  },
  build: {
    outDir: 'docs',
    sourcemap: true,
  },
  css: {
    devSourcemap: true,
  },
  server: {
    sourcemapIgnoreList: false,
  },
  resolve: {
    alias: {
      src: "/src",
      '@': path.resolve(__dirname, 'src')
    }
  }
})


