import * as idb from './assets/idb.mjs'

export default class IdbFile {
  constructor (name) {
    this.firstTime = false
    this.dbSchema = {
      name,
      version: 1,
      onupgradeneeded: (db, tx, version) => {
        if (version < 1) {
          this.firstTime = true
          const store = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true })
          store.createIndex('path', 'path', { unique: true })
        }
      }
    }
    this.workspace = 'workspace1/'
  }

  initWorkSpaces () {
    return idb.tx(this.dbSchema, ['files'], 'readwrite', tx => {
      const store = tx.objectStore('files')
      for (let i = 1; i <= 4; i++) {
        idb.add(store, { path: 'workspace' + i, label: 'ワークスペース' + i, setting: { fileName: '', password: '' } })
      }
    })
  }

  async getAllWorkSpaces () {
    const workSpaces = []
    await idb.tx(this.dbSchema, ['files'], 'readonly', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        forEach: fileData => {
          if (!fileData.path.includes('/')) {
            if (!fileData.setting) fileData.setting = { fileName: '', password: '' }
            workSpaces.push(fileData)
          }
        }
      })
    ))
    return workSpaces
  }

  async getAllFoldersAndFiles () {
    const folders = []
    const files = []
    await idb.tx(this.dbSchema, ['files'], 'readonly', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.lowerBound(this.workspace),
        forEach: fileData => {
          if (!(fileData.path).startsWith(this.workspace)) return false
          fileData = Object.assign({}, fileData, { path: fileData.path.slice(this.workspace.length) })
          if (fileData.file) {
            files.push(fileData)
          } else {
            folders.push(fileData)
          }
        }
      })
    ))
    return { folders, files }
  }

  async getAllFiles () {
    const inputFiles = []
    await idb.tx(this.dbSchema, ['files'], 'readonly', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.lowerBound(this.workspace),
        forEach: fileData => {
          if (!fileData.path.startsWith(this.workspace)) return false
          fileData = Object.assign({}, fileData, { path: fileData.path.slice(this.workspace.length) })
          inputFiles.push(fileData)
        }
      })
    ))
    return inputFiles
  }

  async addFiles (fileDataList) {
    await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => {
      const store = tx.objectStore('files')
      for (const fileData of fileDataList) {
        const _fileData = Object.assign({}, fileData, { path: this.workspace + fileData.path })
        idb.put(store, _fileData)
      }
    })
  }

  async removeFile (path) {
    const removedPaths = []
    await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.lowerBound(this.workspace + path),
        forEach: (fileData, cursor) => {
          if (!(fileData.path + '/').startsWith(this.workspace + path + '/')) return false
          // console.log('rm ' + fileData.path)
          cursor.delete(fileData)
          removedPaths.push(fileData.path.slice(this.workspace.length))
        }
      })
    ))
    return removedPaths
  }

  removeAllFiles () {
    return idb.tx(this.dbSchema, ['files'], 'readwrite', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.lowerBound(this.workspace),
        forEach: (fileData, cursor) => {
          if (!(fileData.path).startsWith(this.workspace)) return false
          cursor.delete()
        }
      })
    ))
  }

  async moveFile (prevPath, newPath) {
    const movedPaths = []
    await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.lowerBound(this.workspace + prevPath),
        forEach: (fileData, cursor) => {
          if (!(fileData.path + '/').startsWith(this.workspace + prevPath + '/')) return false
          const _prev = fileData.path
          const _new = this.workspace + newPath + fileData.path.slice((this.workspace + prevPath).length)

          // console.log('mv ' + _prev + ' ' + _new)

          fileData.path = _new
          if (fileData.file) {
            const prevType = this.getFileType(_prev)
            const newType = this.getFileType(_new)
            if (prevType !== newType) {
              fileData.file = new Blob([fileData.file], { type: newType })
            }
          }
          cursor.update(fileData)

          movedPaths.push([_prev.slice(this.workspace.length), _new.slice(this.workspace.length)])
        }
      })
    ))
    return movedPaths
  }

  putFile (path, file) {
    return idb.tx(this.dbSchema, ['files'], 'readwrite', tx => {
      return idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.only(this.workspace + path),
        forEach (value, cursor) {
          value.file = file
          cursor.update(value)
        }
      })
    })
  }

  getFile (path) {
    return idb.tx(this.dbSchema, ['files'], 'readonly', tx => idb.cursor({
      index: tx.objectStore('files').index('path'),
      range: IDBKeyRange.only(this.workspace + path),
      forEach: value => value ? value.file : null
    }))
  }

  putWorkSpaceSetting (setting) {
    return idb.tx(this.dbSchema, ['files'], 'readwrite', tx => {
      return idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.only(this.workspace.slice(0, -1)),
        forEach (value, cursor) {
          value.setting = setting
          cursor.update(value)
        }
      })
    })
  }

  getWorkSpaceSetting () {
    return idb.tx(this.dbSchema, ['files'], 'readonly', tx => idb.cursor({
      index: tx.objectStore('files').index('path'),
      range: IDBKeyRange.only(this.workspace.slice(0, -1)),
      forEach: value => value.setting ? value.setting : { fileName: '', password: '' }
    }))
  }

  /**
   * ファイル名からMIMEタイプを取得
   * @param {string} name - ファイル名
   * @return {string|null} - MIMEタイプ
   * TODO: sw.jsと共通化
   */
  getFileType (name) {
    const ext = name.slice(name.lastIndexOf('.') + 1)
    return {
      js: 'text/javascript',
      mjs: 'text/javascript',
      css: 'text/css',
      html: 'text/html',
      htm: 'text/html',
      json: 'application/json',
      xml: 'application/xml',
      gif: 'image/gif',
      png: 'image/png',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      svg: 'image/svg+xml',
      txt: 'text/plain',
      md: 'text/markdown'
    }[ext] || null
  }
}
