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
          base + 'dist/77.js',
          base + 'dist/100.js',
          base + 'dist/180.js',
          base + 'dist/355.js',
          base + 'dist/392.js',
          base + 'dist/394.js',
          base + 'dist/550.js',
          base + 'dist/569.js',
          base + 'dist/614.js',
          base + 'dist/628.js',
          base + 'dist/658.js',
          base + 'dist/745.js',
          base + 'dist/830.js',
          base + 'dist/843.js',
          base + 'dist/958.js',
          base + 'dist/css.worker.js',
          base + 'dist/editor.worker.js',
          base + 'dist/f6283f7ccaed1249d9eb.ttf',
          base + 'dist/html.worker.js',
          base + 'dist/main.js',
          base + 'dist/ts.worker.js',
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
      let url = self.decodeURI(req.url).split('?')[0].split('#')[0]

      let fileData = await this.getFileData(root, url)

      if (!fileData) {
        // ファイルが存在せず、拡張子が無いものを「.ts」とみなして再検索
        if (url.slice(-1) !== '/' && !url.slice(url.lastIndexOf('/') + 1).includes('.')) {
          url += '.ts'
          fileData = await this.getFileData(root, url)
        }
      }

      let res = null
      let resHeader = null
      if (!fileData) {
        resHeader = { status: 404 }
      } else if (!fileData.file) {
        resHeader = { status: 301, headers: { Location: url + '/' } }
      } else {
        res = fileData.distFile ?? fileData.file
      }
      return new Response(res, resHeader)
    } else {
      const cache = await caches.open(this.namespace)
      return (await cache.match(req)) ?? (await fetch(req))
    }
  }

  getFileData (root, url) {
    return idb.tx(this.dbSchema, ['files'], 'readonly', tx =>
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.only(url.slice(root.length) + (url.slice(-1) === '/' ? 'index.html' : '')),
        forEach: value => value
      })
    )
  }
}

const main = new Main()
main.main()
