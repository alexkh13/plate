import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  ssr: {
    // Exclude heavy AI libraries from SSR bundle (client-only)
    noExternal: [],
    external: [
      '@tensorflow/tfjs',
      '@tensorflow-models/coco-ssd',
      '@mlc-ai/web-llm',
      '@google/generative-ai',
      'colorthief',
    ],
  },
})

export default config
