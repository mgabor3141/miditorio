import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import svgr from 'vite-plugin-svgr'
import { passthroughImageService } from 'astro/config'

export default defineConfig({
  site: 'https://miditorio.com',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [react()],
  image: {
    service: passthroughImageService(),
  },
  vite: {
    plugins: [svgr({ svgrOptions: { icon: true } })],
    resolve: {
      alias: [
        {
          find: /^@\//,
          replacement: `${new URL('./', import.meta.url).pathname}`,
        },
      ],
    },
  },
})
