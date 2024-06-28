import * as idb from './assets/idb.mjs'

export default class IdbFile {
  /**
   * IDB上にファイル保存用のDBを作成する
   */
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

  /**
   * IDB上にデフォルトのワークスペース4つを作成する
   */
  initWorkSpaces () {
    return idb.tx(this.dbSchema, ['files'], 'readwrite', tx => {
      const store = tx.objectStore('files')
      for (let i = 1; i <= 4; i++) {
        idb.add(store, { path: 'workspace' + i, label: 'ワークスペース' + i, setting: this.createDefaultSetting() })
      }
    })
  }

  /**
   * 全ワークスペースのリストを返す
   * @return workSpaces
   */
  async getAllWorkSpaces () {
    const workSpaces = []
    await idb.tx(this.dbSchema, ['files'], 'readonly', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        forEach: fileData => {
          if (!fileData.path.includes('/')) {
            fileData.setting = this.createDefaultSetting(fileData.setting)
            workSpaces.push(fileData)
          }
        }
      })
    ))
    return workSpaces
  }

  /**
   * 現在のワークスペースにある全フォルダと全ファイルのリストを返す
   * @return { folders, files }
   */
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

  /**
   * 現在のワークスペースにある全ファイルのリストを返す
   * @return inputFiles
   */
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

  /**
   * 複数のファイルをIDBに追加する
   * @param fileDataList
   */
  async addFiles (fileDataList) {
    await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => {
      const store = tx.objectStore('files')
      for (const fileData of fileDataList) {
        const _fileData = Object.assign({}, fileData, { path: this.workspace + fileData.path })
        idb.put(store, _fileData)
      }
    })
  }

  /**
   * ファイルまたはフォルダを削除する
   * @param path
   * @param removePaths 実際に削除されたファイルパスのリスト
   */
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

  /**
   * ワークスペースの全ファイルを削除する
   */
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

  /**
   * ファイルを移動する
   * @param oldPath
   * @param newPath
   * @return movedPaths 実際に移動したpathのリスト
   */
  async moveFile (oldPath, newPath) {
    const movedPaths = []
    await idb.tx(this.dbSchema, ['files'], 'readwrite', tx => (
      idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.lowerBound(this.workspace + oldPath),
        forEach: (fileData, cursor) => {
          if (!(fileData.path + '/').startsWith(this.workspace + oldPath + '/')) return false
          const _prev = fileData.path
          const _new = this.workspace + newPath + fileData.path.slice((this.workspace + oldPath).length)

          // console.log('mv ' + _prev + ' ' + _new)

          fileData.path = _new
          if (fileData.file) {
            const prevType = this.getFileType(_prev)
            const newType = this.getFileType(_new)
            if (prevType !== newType) {
              fileData.file = new Blob([fileData.file], { type: newType })
              fileData.srcFile = null
            }
          }
          cursor.update(fileData)

          movedPaths.push([_prev.slice(this.workspace.length), _new.slice(this.workspace.length)])
        }
      })
    ))
    return movedPaths
  }

  /**
   * ファイルを保存する
   * @param path
   * @param file
   */
  putFile (path, file, distFile = null) {
    return idb.tx(this.dbSchema, ['files'], 'readwrite', tx => {
      return idb.cursor({
        index: tx.objectStore('files').index('path'),
        range: IDBKeyRange.only(this.workspace + path),
        forEach (value, cursor) {
          value.file = file
          value.distFile = distFile
          cursor.update(value)
        }
      })
    })
  }

  /**
   * ファイルを取得する
   * @param path
   * @return file
   */
  async getFile (path, isSrc = false) {
    const result = (await idb.tx(this.dbSchema, ['files'], 'readonly', tx =>
      idb.get(tx.objectStore('files').index('path'), this.workspace + path)
    ))
    return (!isSrc && result?.distFile) || result?.file
  }

  /**
   * ワークスペースの設定を保存する
   * @param setting
   */
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

  /**
   * ワークスペースの設定を取得する
   * @return setting
   */
  async getWorkSpaceSetting () {
    const project = (await idb.tx(this.dbSchema, ['files'], 'readonly', tx =>
      idb.get(tx.objectStore('files').index('path'), this.workspace.slice(0, -1))
    ))
    return this.createDefaultSetting(project?.setting)
  }

  /**
   * ワークスペースのデフォルト設定を取得する
   * @return setting
   */
  createDefaultSetting (setting) {
    setting ??= {}
    setting.fileName ??= ''
    setting.password ??= ''
    setting.tabs ??= []
    setting.currentTab ??= null
    return setting
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
      ts: 'text/typescript',
      tsx: 'text/typescript',
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
