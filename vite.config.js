import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [vue({
    include: [/\.vue$/],
    script: {
      defineModel: true,
      propsDestructure: true
    },
    template: {
      compilerOptions: {
        whitespace: 'preserve'
      }
    }
  })],
  // Only use base path for production builds
  base: mode === 'production' ? '/tip-tracker/' : '/',
  define: {
    __VUE_PROD_DEVTOOLS__: mode === 'development',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development')
  },
  build: {
    outDir: 'docs',
    sourcemap: mode === 'development',
  },
  css: {
    devSourcemap: mode === 'development',
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
}))


