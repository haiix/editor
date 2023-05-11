/* global __BUILD_TIMESTAMP__ */
import * as idb from './assets/idb.mjs'
// importScripts('./src/idb.js')

class Main {
  constructor () {
    // TODO DB定義をメインスクリプトと共通化
    this.namespace = location.pathname.slice(1, location.pathname.lastIndexOf('/'))
    this.base = location.protocol + '//' + location.host + '/' + (this.namespace === '' ? '' : this.namespace + '/')
    this.dbSchema = {
      name: this.namespace,
      version: 1,
      onupgradeneeded (db, tx, version) {
        if (version < 1) {
          db.createObjectStore('files', { keyPath: 'path' })
          // db.createObjectStore('settings', { keyPath: 'key' })
        }
      }
    }
  }

  main () {
    const base = this.base
    self.addEventListener('install', event => {
      console.log(__BUILD_TIMESTAMP__)
      event.waitUntil(async function (main) {
        const urls = [
          base,
          base + 'dist/8.js',
          base + 'dist/75.js',
          base + 'dist/123.js',
          base + 'dist/134.js',
          base + 'dist/288.js',
          base + 'dist/377.js',
          base + 'dist/401.js',
          base + 'dist/571.js',
          base + 'dist/712.js',
          base + 'dist/717.js',
          base + 'dist/834.js',
          base + 'dist/css.worker.js',
          base + 'dist/editor.worker.js',
          base + 'dist/fa2cc0ab9f0bec2b3365.ttf',
          base + 'dist/html.worker.js',
          base + 'dist/main.js',
          base + 'dist/ts.worker.js',
          base + 'resources/app.webmanifest',
          base + 'resources/blank.txt',
          base + 'resources/icons/icon-32.png',
          base + 'resources/icons/icon-192.png',
          base + 'resources/icons/icon-512.png',
          base + 'resources/vendor/MaterialIcons-Regular.ttf',
          'https://cdn.jsdelivr.net/npm/typescript@4.6.4/lib/typescript.min.js'
        ]
        const cache = await caches.open(main.namespace)
        await cache.addAll(urls)
      }(this))
    })
    self.addEventListener('fetch', event => {
      event.respondWith(this.createResponse(event.request))
    })
  }

  async createResponse (req) {
    const root = this.base + 'debug/'
    if ((req.url + '/').startsWith(root)) {
      let url = self.decodeURI(req.url).split('?')[0].split('#')[0]

      // 拡張子が無いものを「.ts」とみなす
      if (url.slice(-1) !== '/' && !url.slice(url.lastIndexOf('/') + 1).includes('.')) {
        url += '.ts'
      }

      const fileData = await idb.tx(this.dbSchema, ['files'], 'readonly', tx =>
        idb.cursor({
          index: tx.objectStore('files').index('path'),
          range: IDBKeyRange.only(url.slice(root.length) + (url.slice(-1) === '/' ? 'index.html' : '')),
          forEach: value => value
        })
      )

      let res = null
      let resHeader = null
      if (!fileData) {
        resHeader = { status: 404 }
      } else if (!fileData.file) {
        resHeader = { status: 301, headers: { Location: url + '/' } }
      } else {
        res = fileData.file
      }
      return new Response(res, resHeader)
    } else {
      const cache = await caches.open(this.namespace)
      return (await cache.match(req)) ?? (await fetch(req))
    }
  }
}

const main = new Main()
main.main()
