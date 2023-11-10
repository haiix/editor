import { ZipReader, ZipWriter, BlobReader, BlobWriter } from '@zip.js/zip.js'
import TDialog, { openFile, Prompt } from './assets/ui/TDialog.mjs'
import style from './assets/style.mjs'

const EXT = '.zip'

const ukey = 'my-save-dialog'
style(`
  .${ukey}-body label {
    display: block;
    white-space: nowrap;
    height: 24px;
  }
  .${ukey}-body label > span {
    display: inline-block;
    width: 100px;
  }
  .${ukey}-body details {
    margin-top: 8px;
  }
  .${ukey}-body summary {
    height: 24px;
    color: #08E;
    cursor: pointer;
  }
  .${ukey}-body summary:hover {
    text-decoration: underline;
  }
`)

const saveDialog = TDialog.create(class extends TDialog {
  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    this.form.name.value = attr.arguments[1]
    const password = attr.arguments[2]
    if (password) {
      this.form.password.value = password
      this.form['confirm-password'].value = password
      this.details.open = true
    }
  }

  titleTemplate () {
    return 'プロジェクトを保存'
  }

  bodyTemplate () {
    return `
      <form id="form" class="${ukey}-body" style="padding: 10px;" onsubmit="event.preventDefault()">
        <label>
          <span>ファイル名:</span>
          <input name="name" /> .zip
        </label>
        <details id="details">
          <summary tabindex="-1">オプション</summary>
          <label>
            <span>パスワード:</span>
            <input type="password" name="password" autocomplete="none" />
          </label>
          <label>
            <span>パスワード(確認):</span>
            <input type="password" name="confirm-password" autocomplete="none" />
          </label>
        </details>
      </form>
    `
  }

  buttonsTemplate () {
    return `
      <button onclick="return this.handleOK(event)">OK</button>
      <button onclick="return this.handleCancel(event)">キャンセル</button>
    `
  }

  handleOK (event) {
    this.resolve(Array.from(this.form.elements).reduce((obj, elem) => {
      obj[elem.name] = elem.value
      return obj
    }, {}))
  }
})

export const passwordPrompt = TDialog.create(class extends Prompt {
  bodyTemplate () {
    return `
      <form onsubmit="event.preventDefault()">
        <p id="text" style="white-space: pre-wrap;"></p>
        <input id="input" type="password" name="password" autocomplete="none" />
      </form>
    `
  }
})

export default class EZip {
  constructor (setting) {
    this.setting = setting
  }

  async save (callback) {
    const name = this.setting.fileName.endsWith('.zip') ? this.setting.fileName.slice(0, -4) : this.setting.fileName
    const formValues = await saveDialog('', name, this.setting.password)
    if (!formValues) return false

    if (formValues.password !== formValues['confirm-password']) {
      throw new Error('パスワードが一致しません')
    }

    const zipFileName = (formValues.name || 'untitled') + (formValues.name.endsWith(EXT) ? '' : EXT)
    const zipFilePassword = formValues.password

    const inputFiles = await callback()

    const zipBlob = await this.createEncryptedZipBlob(zipFilePassword, inputFiles)

    this.downloadFile(zipFileName, zipBlob)

    this.setting.fileName = zipFileName
    this.setting.password = zipFilePassword

    return true
  }

  async createEncryptedZipBlob (password, inputFiles) {
    const innerZipBlob = await this.createZip(inputFiles, { level: password ? 0 : 5 })
    return password ? await this.createZip([{ path: 'encrypted.zip', file: innerZipBlob }], { password, level: 5 }) : innerZipBlob
  }

  async createZip (inputFiles, options) {
    const blobWriter = new BlobWriter('application/zip')
    const writer = new ZipWriter(blobWriter, options)
    for (const fileData of inputFiles) {
      const file = fileData.file
      const foptions = {}
      foptions.directory = !file
      await writer.add(fileData.path, file ? new BlobReader(file) : null, foptions)
    }
    await writer.close()
    return await blobWriter.getData()
  }

  async downloadFile (name, blob) {
    const url = URL.createObjectURL(blob)
    TDialog.createElement(`<a href="${url}" download="${name}"></a>`).click()
    URL.revokeObjectURL(url)
  }

  async load (event) {
    const zipFile = await openFile(EXT)
    if (!zipFile) return

    this.setting.fileName = zipFile.name

    return await this.readEncryptedZipFile(zipFile)
  }

  async readEncryptedZipFile (zipFile) {
    try {
      const files = await this.readZip(zipFile)
      return files.length === 1 && files[0].path === 'encrypted.zip' ? await this.readZip(files[0].file) : files
    } catch (error) {
      throw new Error('ファイルを開けません:\n' + error.message)
    }
  }

  async readZip (zipFile, options = {}) {
    const reader = new ZipReader(new BlobReader(zipFile))
    const entries = await reader.getEntries()

    // SJIS
    for (const entry of entries) {
      if (!entry.filenameUTF8 && entry.msDosCompatible) {
        const decoder = new TextDecoder('windows-31j')
        entry.filename = decoder.decode(entry.rawFilename)
        entry.filenameUTF8 = true
      }
    }

    // 最上位のフォルダーは取り除く
    let prefix = ''
    for (const entry of entries) {
      const i = entry.filename.indexOf('/')
      if (prefix === '') {
        if (i < 0) break
        prefix = entry.filename.slice(0, i + 1)
      } else {
        if (i < 0 || entry.filename.slice(0, i + 1) !== prefix) {
          prefix = ''
          break
        }
      }
    }

    return await Promise.all(
      entries.filter(entry => !entry.directory && entry.filename !== prefix).map(async function (entry) {
        if (!options.password && entry.encrypted) {
          const password = await passwordPrompt('パスワードを入力してください。')
          if (password == null) return
          options.password = password
          this.setting.password = password
        }

        const path = (entry.filename.slice(-1) === '/' ? entry.filename.slice(0, -1) : entry.filename).slice(prefix.length)

        const file = entry.directory ? null : await entry.getData(new BlobWriter(this.getMimeFromExt(entry.filename)), options)
        return { path, file }
      }.bind(this))
    )
  }

  // TODO 共通化
  getMimeFromExt (fileName) {
    const ext = fileName.slice(fileName.lastIndexOf('.') + 1)
    return {
      js: 'text/javascript',
      mjs: 'text/javascript',
      css: 'text/css',
      html: 'text/html',
      htm: 'text/html',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      xml: 'application/xml',
      pdf: 'application/pdf',
      bmp: 'image/bmp',
      gif: 'image/gif',
      ico: 'image/vnd.microsoft.icon',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      svg: 'image/svg+xml',
      tif: 'image/tiff',
      tiff: 'image/tiff',
      webp: 'image/webp',
      m3u: 'audio/x-mpegurl',
      m4a: 'audio/x-m4a',
      mid: 'audio/midi',
      midi: 'audio/midi',
      mp3: 'audio/mpeg',
      oga: 'audio/ogg',
      ogg: 'audio/ogg',
      wav: 'audio/wav',
      weba: 'audio/webm',
      avi: 'video/x-msvideo',
      mp4: 'video/mp4',
      mpg: 'video/mpeg',
      mpeg: 'video/mpeg',
      ogv: 'video/ogg',
      webm: 'video/webm'
    }[ext] ?? null
  }
}
