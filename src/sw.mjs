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
    self.addEventListener('fetch', event => {
      event.respondWith(this.createResponse(event.request))
    })
  }

  async createResponse (req) {
    let url = req.url
    const root = this.base + 'debug/'
    if ((url + '/').startsWith(root)) {
      url = url.split('?')[0].split('#')[0]

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
      return fetch(url)
    }
  }
}

const main = new Main()
main.main()
