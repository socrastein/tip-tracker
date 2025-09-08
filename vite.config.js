import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue({
    include: [/\.vue$/],
    script: {
      // Add more detailed source mapping
      defineModel: true,
      propsDestructure: true
    },
    // Better error reporting
    template: {
      compilerOptions: {
        whitespace: 'preserve'
      }
    }
  })],
  base: '/tip-tracker/',
  define: {
    // Enable more detailed Vue debugging
    __VUE_PROD_DEVTOOLS__: process.env.NODE_ENV === 'development',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
    'process.env.NODE_ENV': JSON.stringify('production')
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


