/* global __BUILD_TIMESTAMP__ */
import * as idb from './assets/idb.mjs'
// importScripts('./src/idb.js')

class Main {
  constructor () {
    // TODO DB定義をメインスクリプトと共通化
    this.namespace = location.pathname.slice(1, location.pathname.lastIndexOf('/'))
    this.base = location.protocol + '//' + location.host + '/' + this.namespace + '/'
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
          base + 'dist/main.js',
          base + 'dist/1.js',
          base + 'dist/191.js',
          base + 'dist/498.js',
          base + 'dist/588.js',
          base + 'dist/834.js',
          base + 'resources/app.webmanifest',
          base + 'resources/blank.txt',
          base + 'resources/icons/icon-32.png',
          base + 'resources/icons/icon-192.png',
          base + 'resources/icons/icon-512.png',
          base + 'resources/vendor/MaterialIcons-Regular.ttf'
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
      const url = req.url.split('?')[0].split('#')[0]

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
