import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function seoPlugin() {
  return {
    name: 'vite-plugin-seo-ssr',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '/'
        if (
          req.method === 'GET' &&
          !url.startsWith('/@') &&
          !url.startsWith('/src') &&
          !url.startsWith('/api') &&
          !url.startsWith('/node_modules') &&
          !url.includes('.')
        ) {
          try {
            const [pathname, queryString] = url.split('?')
            const query = {}
            if (queryString) {
              new URLSearchParams(queryString).forEach((val, key) => {
                query[key] = val
              })
            }
            const indexPath = path.resolve(__dirname, 'index.html')
            const rawHtml = fs.readFileSync(indexPath, 'utf-8')
            const { getMetaForRoute, injectMetaTags } = require('../server/services/seoRenderer')
            const meta = getMetaForRoute(pathname, query)
            server
              .transformIndexHtml(url, rawHtml, req.originalUrl)
              .then((transformedHtml) => {
                const finalHtml = injectMetaTags(transformedHtml, meta)
                res.setHeader('Content-Type', 'text/html; charset=utf-8')
                if (meta.isNotFound) {
                  res.statusCode = 404
                }
                res.end(finalHtml)
              })
              .catch(() => next())
            return
          } catch (e) {
            return next()
          }
        }
        next()
      })
    },
    transformIndexHtml(html, ctx) {
      try {
        const reqUrl = ctx.path || ctx.originalUrl || ctx.url || '/'
        const [pathname, queryString] = reqUrl.split('?')
        const query = {}
        if (queryString) {
          new URLSearchParams(queryString).forEach((val, key) => {
            query[key] = val
          })
        }
        const { getMetaForRoute, injectMetaTags } = require('../server/services/seoRenderer')
        const meta = getMetaForRoute(pathname, query)
        return injectMetaTags(html, meta)
      } catch (e) {
        return html
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    seoPlugin()
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

