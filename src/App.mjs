import seq from '@haiix/seq'
import style from './assets/style.mjs'
import * as styleDef from './assets/styledef.mjs'
import hold from './assets/hold.mjs'
import TElement from './assets/ui/TElement.mjs'
import TList from './assets/ui/TList.mjs'
import TSplitter from './assets/ui/TSplitter.mjs'
import TDialog, { alert, confirm, prompt } from './assets/ui/TDialog.mjs'
import './MaterialIcons.mjs'
import { createContextMenu } from './menu.mjs'
import IdbFile from './IdbFile.mjs'
import FileTree from './FileTree.mjs'
import EditorTab from './EditorTab.mjs'
import { ancestorNodes, getIncludingChild } from './util.mjs'

// https://github.com/Microsoft/monaco-editor/issues/926
function switchModelToNewUri (monaco, oldModel, newUri) {
  const newModel = monaco.editor.createModel(
    oldModel.getValue(),
    oldModel.getLanguageId(),
    newUri
  )

  const fsPath = newUri.fsPath // \\filename
  const formatted = newUri.toString() // file:///filename

  const editStacks = oldModel._commandManager._undoRedoService._editStacks

  const newEditStacks = new Map()

  function adjustEditStack (c) {
    c.actual.model = newModel
    c.resourceLabel = fsPath
    c.resourceLabels = [fsPath]
    c.strResource = formatted
    c.strResources = [formatted]
  }

  editStacks.forEach((s) => {
    s.resourceLabel = fsPath
    s.strResource = formatted

    s._future.forEach(adjustEditStack)
    s._past.forEach(adjustEditStack)

    newEditStacks.set(formatted, s)
  })

  newModel._commandManager._undoRedoService._editStacks = newEditStacks

  oldModel.dispose()

  return newModel
}

export default class App extends TElement {
  template () {
    const ukey = 'my-app'
    style(styleDef.ui, styleDef.fullscreen, styleDef.flex)
    style(`
      .${ukey} .select-template-button, .select-template-choices button {
        margin: 0;
        padding: 0;
        border: none;
        text-align: inherit;
        background: inherit;
        color: #06C;
        cursor: pointer;
      }
      .${ukey} .select-template-button:hover, .t-component-ui-dialog a:hover {
        color: #39F;
        text-decoration: underline;
      }
      .select-template-choices {
        margin: 0;
        padding: 0;
        list-style-type: none;
      }
      .select-template-choices button {
        display: inline-block;
        box-sizing: border-box;
        width: 100%;
        padding: 1em;
      }
      .select-template-choices button:hover {
        background: #DEF;
      }
      .${ukey} .m-icon {
        font-size: 18px;
        width: 1em;
      }
      .${ukey} > * {
        overflow: hidden;
      }
      .${ukey} .menubar {
        background: #EEE;
        border-bottom: 1px solid #CCC;
      }
      .${ukey} .menubar > * {
        padding: 2px 8px;
        border: 1px solid transparent;
      }
      .${ukey} .menubar > :hover {
        border: 1px solid #9CF;
        background: #DEF;
      }
      .${ukey} .menubar > .selected {
        border: 1px solid #9CF;
        background: #BDF;
      }
      .${ukey} .side-area {
        width: 160px;
      }
      .${ukey} .side-area > li:not(.current) {
        display: none;
      }
      .${ukey} .side-area-empty {
        justify-content: center;
        align-items: center;
        padding: 0 2em;
      }
      .${ukey} .main-area {
        background: #EEE;
      }
      .${ukey} .main-area > li:not(.current) {
        display: none;
      }
      .${ukey} .main-area-empty {
        justify-content: center;
        align-items: center;
        padding: 0 4em;
      }
      .${ukey} .tab-views {
        overflow: hidden;
      }
      .${ukey} .views {
        background: #EEE;
      }
      .${ukey} .views > li {
        width: 0;
        height: 0;
        min-width: 100%;
        min-height: 100%;
        display: none;
        position: relative;
        z-index: 0;
        overflow: auto;
      }
      .${ukey} .views > li.current {
        display: inline-block;
      }
      .${ukey} .views iframe {
        border: none;
        width: 100%;
        height: calc(100% - 4px);
      }
    `)
    this.uses(FileTree, TSplitter, TList, TList.Item)
    return `
      <div class="${ukey} fullscreen flex column"
        ondragover="return this.handleDragOver(event)"
        ondrop="return this.handleDrop(event)"
        onkeydown="return this.handleKeyDown(event)"
        tabindex="-1"
      >
        <!-- メニュー -->
        <ul id="menubar" class="menubar flex row"
          onmousedown="return this.handleMenuMouseDown(event)"
          onclick="return this.handleMenuClick(event)"
          oncontextmenu="event.preventDefault()"
        >
          <li data-key="workspace">ワークスペース▾</li>
          <li data-key="project">プロジェクト▾</li>
          <li data-key="run" class="flex row">
            <i class="material-icons m-icon" style="color: #0A3;">
              play_circle_outline
            </i>
            実行 (F5)
          </li>
        </ul>

        <div class="flex row fit">
          <t-list id="sideArea" class="flex column side-area"
            oncontextmenu="return this.handleFileTreeContextMenu(event)"
          >
            <t-list-item id="sideAreaEmpty" class="flex column fit side-area-empty">
              <p>
                ファイルツリーが空です。<br />
                このエリアで右クリックメニューを開くか、ウィンドウ外からファイルをドロップしてファイルを追加してください。
                <br />
                <button class="select-template-button" onclick="return this.handleSelectTemplate(event)">ここをクリックして「index.html」を作成することもできます。</button>
              </p>
            </t-list-item>
            <t-list-item id="fileTreeArea" class="flex column fit current">
              <!-- ファイルリスト -->
              <file-tree id="fileTree"
                ondblclick="return this.handleFileTreeDoubleClick(event)"
                onmousedown="return this.handleFileTreeMouseDown(event)"
                onkeydown="return this.handleFileTreeKeyDown(event)"
              />
            </t-list-item>
          </t-list>
          <t-splitter ondrag="return this.handleDragSplitter(event)" />

          <t-list id="mainArea" class="flex column fit main-area">
            <t-list-item id="mainAreaLoading" class="flex column fit main-area-empty current" style="background: white;">
            </t-list-item>
            <t-list-item id="mainAreaEmpty" class="flex column fit main-area-empty">
              <p>左のツリーからファイルを選択し、Enterキー、ダブルクリック、またはこのエリアへドラッグ&ドロップしてファイルを開いてください。</p>
            </t-list-item>
            <!-- タブとエディタ -->
            <t-list-item id="tabViews" class="flex column fit tab-views">
              <t-list id="tabs" class="editor-tabs flex row"
                onchange="return this.handleTabChange(event)"
                onmousedown="return this.handleTabMouseDown(event)"
              ></t-list>
              <t-list id="views" class="views flex fit row"></t-list>
            </t-list-item>
          </t-list>
        </div>
      </div>
    `
  }

  constructor (attr = {}, nodes = []) {
    super()
    this.name = document.title
    this.version = '0.1.0'
    // TODO DB定義をService Workerと共通化
    this.namespace = location.pathname.slice(1, location.pathname.lastIndexOf('/'))
    this.base = location.protocol + '//' + location.host + '/' + (this.namespace === '' ? '' : this.namespace + '/')
    this.idbFile = new IdbFile(this.namespace)

    this.debugWindow = null
    this.projectSetting = null
    this.editorModels = Object.create(null)
  }

  /**
   * 画面表示前処理
   */
  async init () {
    window.addEventListener('beforeunload', this.handleClose.bind(this))
    window.addEventListener('resize', this.resizeEditor.bind(this))

    ;[this.projectSetting] = await Promise.all([
      this.idbFile.getWorkSpaceSetting(),
      this.registerServiceWorker(),
      this.initMonaco()
    ])
  }

  async initMonaco () {
    this.monaco = await import(/* webpackPrefetch: true */ 'monaco-editor/esm/vs/editor/editor.api.js')
    this.monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)
    this.monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      moduleResolution: 2, // this.monaco.languages.typescript.ModuleResolutionKind.NodeJs
      target: 99 // this.monaco.languages.typescript.ScriptTarget.ESNext
    })
  }

  /**
   * 画面表示後処理
   */
  async main () {
    this.typescript = await import(/* webpackPrefetch: true */ 'typescript');
    if (this.idbFile.firstTime) {
      // WorkSpace作成
      await this.idbFile.initWorkSpaces()
      await this.createTemplateFiles(1)
    } else {
      this.refreshFileTreeAndCreateModels()
      await this.restoreTabs()
    }
  }

  handleClose (event) {
    if (this.debugWindow && !this.debugWindow.closed) {
      this.debugWindow.close()
    }
  }

  registerServiceWorker () {
    if (window.navigator.serviceWorker == null) {
      throw new Error('ServiceWorkerが無効です')
    }
    return window.navigator.serviceWorker.register('./sw.js')
  }

  /**
   * ファイルツリー全体をIDBから読み込んで更新する
   */
  async refreshFileTreeAndCreateModels () {
    const { folders, files } = await this.idbFile.getAllFoldersAndFiles()
    this.fileTree.update(folders, files)

    this.createEditorModels(files)

    this.refreshFileTreeArea()
  }

  /**
   * ファイルをIDBに追加する
   */
  async addFile (...fileDataList) {
    // TypeScript
    for (const fileData of fileDataList) {
      const tsFile = await this.tsTranspile(fileData.path, fileData.file)
      if (tsFile != null) {
        fileData.distFile = tsFile
      }
    }

    this.createEditorModels(fileDataList)

    await this.idbFile.addFiles(fileDataList)
    this.fileTree.addFile(fileDataList)
    this.sideArea.current = this.fileTreeArea
  }

  async createEditorModels (files) {
    // モデル作成
    const models = await Promise.all(
      files
        .filter(file => file.path.slice(-3) === '.ts' || file.path.slice(-3) === '.js' || file.path.slice(-4) === '.mjs')
        .map(file => this.createEditorModel(file.path, file.file))
    )
    // モデルのパスを解決した状態で表示を更新する
    for (const model of models) {
      model.setValue(model.getValue())
    }
  }

  /**
   * ツリーで選択されているファイルまたはフォルダーを削除する
   */
  async deleteCurrentFileOrFolder () {
    const path = this.fileTree.getPath()

    const removedPaths = await this.idbFile.removeFile(path)

    for (const path of removedPaths) {
      // Monaco Editorのモデルを破棄する
      if (this.editorModels[path]) {
        this.editorModels[path].dispose()
        delete this.editorModels[path]
      }

      // タブが開いている場合は閉じる
      const tab = this.tabs.get(path)
      if (tab) await this.closeTabs([tab])
    }

    this.fileTree.remove(path)
    this.refreshFileTreeArea()
  }

  /**
   * IDBからファイルをロードして、タブとエディタを追加する
   */
  async openTab (path, toSave = true) {
    if (this.tabs.get(path) == null) {
      // IDBからロード
      const file = await this.idbFile.getFile(path, true)
      if (file != null) {
        const view = new TList.Item({ value: path })
        const tab = new EditorTab({ view, path, file })

        if (file.type.startsWith('image/')) {
          // 画像
          const image = new Image()
          image.src = URL.createObjectURL(file) // TODO close時にrevoke
          image.alt = path
          image.onmousedown = event => event.preventDefault()
          view.appendChild(image)
        } else if (file.type.startsWith('audio/')) {
          // 音声
          const audio = new Audio()
          audio.controls = true
          audio.src = URL.createObjectURL(file) // TODO close時にrevoke
          view.appendChild(audio)
        } else if (file.type.startsWith('video/')) {
          // 動画
          const video = document.createElement('video')
          video.controls = true
          video.src = URL.createObjectURL(file) // TODO close時にrevoke
          view.appendChild(video)
        } else if (file.type === 'application/pdf') {
          const iframe = document.createElement('iframe')
          iframe.title = path
          iframe.src = URL.createObjectURL(file) // TODO close時にrevoke
          view.appendChild(iframe)
        } else {
          await this.createEditor(tab, path)
          tab.editor.focus()
        }

        this.tabs.appendChild(tab)
        this.views.appendChild(view)
      }
    }

    if (toSave) {
      this.tabs.value = path
      this.mainArea.current = this.tabViews
      await this.saveTabs()
    }
  }

  /**
   * ファイルロードのうち、Monaco Editor初期化部分
   */
  async createEditor (tab, path) {
    const model = await this.createEditorModel(path, tab.file)

    // Editor
    tab.editor = this.monaco.editor.create(tab.view.element, { model })
    tab.editor.getModel().onDidChangeContent(event => {
      if (this.tabs.current) this.tabs.current.isModified = true
    })
  }

  createEditorModel (path, file) {
    if (!this.editorModels[path]) {
      this.editorModels[path] = (async function () {
        const model = this.monaco.editor.createModel(
          await file.text(),
          file.type,
          this.monaco.Uri.parse(this.base + 'debug/' + this.idbFile.workspace + path)
        )
        model.updateOptions({ tabSize: 2 })
        this.editorModels[path] = model
        return model
      }.call(this))
    }
    return this.editorModels[path]
  }

  /**
   * エディターリサイズ
   */
  resizeEditor () {
    const item = this.tabs.current
    if (!item) return
    // 一度縮めてやり直さないとなぜか縮小がうまくいかない
    item.view.style = 'width: 0; height: 0;'
    item.editor.layout()
    item.view.style = 'width: 100%; height: 100%;'
    item.editor.layout()
  }

  /**
   * タブを閉じる
   */
  async closeTabs (tabs, toSave = true) {
    let elem = this.tabs.current
    for (const tab of [...tabs]) { // 要素削除のためiteratorを配列に複製しておく
      if (tab === this.tabs.current) {
        elem = tab.previousSibling ?? tab.nextSibling
      }
      this.tabs.removeChild(tab)
      this.views.removeChild(tab.view)
    }
    this.tabs.value = elem?.value
    if (this.tabs.childElementCount === 0) {
      this.mainArea.current = this.mainAreaEmpty
    }
    if (toSave) await this.saveTabs()
  }

  /**
   * 現在開いているタブをIDBに保存する
   */
  async saveTabs () {
    this.projectSetting.tabs = [...seq(this.tabs).map(tab => tab.path)]
    this.projectSetting.currentTab = this.tabs.current?.path
    await this.idbFile.putWorkSpaceSetting(this.projectSetting)
  }

  /**
   * IDBからタブを復元する
   */
  async restoreTabs () {
    for (const path of this.projectSetting.tabs) {
      await this.openTab(path, false)
    }
    if (this.projectSetting.currentTab) {
      await this.openTab(this.projectSetting.currentTab)
    } else {
      this.mainArea.current = this.mainAreaEmpty
    }
  }

  /**
   * エディターの内容をIDBに保存する
   */
  async saveTab (...tabs) {
    for (const tab of tabs) {
      if (!tab.isModified) continue

      const path = tab.path
      const file = new Blob([tab.editor.getValue()], { type: this.idbFile.getFileType(tab.value) })

      // TypeScript
      const distFile = await this.tsTranspile(path, file, tab.editor.getValue())

      // 保存
      await this.idbFile.putFile(path, file, distFile)
      tab.isModified = false
    }
  }

  async tsTranspile (path, file, value = null) {
    if (path.slice(path.lastIndexOf('.')) !== '.ts') return

    if (value == null) {
      value = await file.text()
    }

    // const result = this.typescript.transpile(value, { inlineSourceMap: true, module: 5, sourceMap: true, target: 'ES2018' }, path)
    const result = this.typescript.transpile(value, { inlineSourceMap: false, module: 5, sourceMap: false, target: 'ES2018' }, path)
    return new Blob([result], { type: this.idbFile.getFileType('.js') })
  }

  handleDragOver (event) {
    event.preventDefault()
  }

  handleDrop (event) {
    event.preventDefault()
    return this.addFile(...seq(event.dataTransfer.files).map(file => ({ path: file.name, file: new Blob([file], { type: file.type }) })))
  }

  handleKeyDown (event) {
    // console.log('KeyCode: ' + event.keyCode)
    switch (event.keyCode) {
      case 83: // s
        if (event.ctrlKey) {
          event.preventDefault()
          return this.saveTab(this.tabs.current)
        }
        break
      case 116: // F5
        event.preventDefault()
        return this.run()
    }
  }

  async handleSelectTemplate (event) {
    const result = await TDialog.create(class extends TDialog {
      titleTemplate () {
        return 'テンプレートを選択してください'
      }

      bodyTemplate () {
        return `
          <ul class="select-template-choices">
            <li><button onclick="this.resolve(1)">1. 「index.html」のみ作成</button></li>
            <li><button onclick="this.resolve(2)">2. 「index.html」、「style.css」、「main.ts」を作成</button></li>
          </ul>
        `
      }

      buttonsTemplate () {
        return `
          <button onclick="return this.handleCancel(event)">キャンセル</button>
        `
      }
    })()

    await this.createTemplateFiles(result)
  }

  async createTemplateFiles (id) {
    switch (id) {
      case 1:
        await this.addFile(
          {
            path: 'index.html',
            file: new Blob([`<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>My App</title>
  </head>
  <body>
    <p>Hello, World!</p>
  </body>
</html>
`], { type: 'text/html' })
          }
        )
        await this.openTab('index.html')
        break
      case 2:
        await this.addFile(
          {
            path: 'index.html',
            file: new Blob([`<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>My App</title>
    <link rel="stylesheet" href="style.css">
    <script type="module" src="main"></script>
  </head>
  <body>
  </body>
</html>
`], { type: 'text/html' })
          },
          {
            path: 'style.css',
            file: new Blob([`body {
}
`], { type: 'text/css' })
          },
          {
            path: 'main.ts',
            file: new Blob([`// ここにコードを書く
document.body.innerHTML = '<h1>Hello, World!</h1>';
`], { type: 'text/typescript' })
          }
        )
        await this.openTab('index.html', false)
        await this.openTab('style.css', false)
        await this.openTab('main.ts')
        break
    }
  }

  handleFileTreeKeyDown (event) {
    // console.log('KeyCode: ' + event.keyCode)
    switch (event.keyCode) {
      case 13: // Enter
        return this.command('open')
      case 46: // Delete
        return this.command('delete')
      case 113: // F2
        return this.command('rename')
    }
  }

  handleFileTreeDoubleClick (event) {
    if (event.target.classList.contains('expand-icon')) return // ツリーの展開アイコン
    if (!this.fileTree.currentIsFile) return
    return this.openTab(this.fileTree.getPath())
  }

  async handleFileTreeContextMenu (event) {
    event.preventDefault()
    const disabled = this.fileTree.current == null ? 'class="disabled"' : ''
    const value = await createContextMenu(`
      <div data-value="newFile"><i class="material-icons" style="color: #AAC;">note_add</i>新規ファイル</div>
      <div data-value="newFolder"><i class="material-icons" style="color: #FB8;">create_new_folder</i>新規フォルダー</div>
      <div data-value="rename" ${disabled}><i class="material-icons" style="color: #96C;">drive_file_rename_outline</i>名前の変更</div>
      <div data-value="delete" ${disabled}><i class="material-icons" style="color: #999;">delete</i>削除</div>
    `)(event)
    if (value) await this.command(value)
  }

  async command (command) {
    switch (command) {
      case 'newFile':
      case 'newFolder':
      {
        let parentFolder = this.fileTree.current
        if (parentFolder) {
          if (!parentFolder.isExpandable) parentFolder = parentFolder.parentNode
          if (parentFolder !== this.fileTree) parentFolder.expand()
        }
        const typeName = command === 'newFile' ? 'ファイル' : 'フォルダー'
        let name = ''
        while (true) {
          name = await this.inputFileName(`${typeName}名`, name, `新規${typeName}`)
          if (!name) return
          const type = this.idbFile.getFileType(name)
          const path = this.fileTree.getFolderPath() + name
          const fileData = command === 'newFile' ? { path, file: new Blob([''], { type }) } : { path }
          try {
            await this.addFile(fileData)
            this.fileTree.focus()
            return
          } catch (error) {
            if (error.name === 'ConstraintError') {
              await alert('この場所には同名のファイルまたはフォルダーがあります', 'エラー')
            } else {
              throw error
            }
          }
        }
      }
      case 'rename':
      {
        const oldName = this.fileTree.current.text

        const newName = await this.inputFileName(this.fileTree.currentIsFile ? 'ファイル名' : 'フォルダー名', oldName, '名前の変更')
        if (!newName) return

        let path = this.fileTree.getPath(this.fileTree.current.parentNode)
        if (path !== '') path += '/'
        return this.fileListMove(path + oldName, path + newName)
      }
      case 'delete':
      {
        if (!await confirm((this.fileTree.currentIsFile ? 'ファイル' : 'フォルダー') + ' "' + this.fileTree.current.text + '" を削除しますか?')) break
        return this.deleteCurrentFileOrFolder()
      }
      case 'open':
        if (!this.fileTree.currentIsFile) return
        return this.openTab(this.fileTree.getPath())
      default:
        throw new Error('Undefiend command: ' + command)
    }
  }

  /**
   * ファイル名入力チェック
   */
  async inputFileName (isFile, defaultName, title) {
    do {
      const name = await prompt(isFile + 'を入力してください', defaultName, title)
      if (!name) return ''

      let msg = ''
      if (seq('\\/:*?"<>|').some(c => name.includes(c))) {
        msg = isFile + 'には次の文字は使えません:\n\\ / : * ? " < > |'
      } else if (name === '.' || name === '..') {
        msg = 'その' + isFile + 'を付けることはできません'
      }
      if (!msg) return name

      await alert(msg, '注意')
      defaultName = name
    } while (true)
  }

  /**
   * ファイル移動・リネーム
   */
  async fileListMove (oldPath, newPath) {
    if (oldPath === newPath) return

    if ((newPath + '/').startsWith(oldPath + '/')) {
      await alert('受け側のフォルダーは、送り側フォルダーのサブフォルダーです。', '中断')
      return
    }

    // 受け側のフォルダーに同名のファイルまたはフォルダーがある場合は中断
    if (await this.idbFile.getFile(newPath)) {
      await alert('受け側のフォルダーに同名のファイルまたはフォルダーがあります。', '中断')
      return
    }

    const movedPaths = await this.idbFile.moveFile(oldPath, newPath)

    for (const [_old, _new] of movedPaths) {
      // Monaco Editorのモデルを作り直す
      if (this.editorModels[_old]) {
        this.editorModels[_new] = switchModelToNewUri(this.monaco, this.editorModels[_old], _new)
        delete this.editorModels[_old]
        this.tabs.childNodes.find(tab => tab.value === _old)?.editor.setModel(this.editorModels[_new])
      }

      // タブのパスを更新
      const tab = this.tabs.get(_old)
      if (tab) tab.path = _new
      await this.saveTabs()
    }

    this.fileTree.move(oldPath, newPath)
  }

  async handleFileTreeMouseDown (event) {
    if (event.button === 1) return

    // ドラッグ対象
    const targetItem =
      seq(ancestorNodes(event.target))
        .map(elem => TElement.from(elem))
        .find(item => item instanceof FileTree.Item)
    if (!targetItem) return

    let shadowElem = null
    const dropRects = []
    let dropRect = null
    hold({
      ondragstart: (px, py, modal) => {
        // ドラッグ中の半透明アイコン作成
        shadowElem = TElement.createElement(`
          <div style="position: absolute; text-align: center; opacity: .75;" class="flex column"></div>
        `)
        shadowElem.appendChild(targetItem.element.querySelector('.icon').cloneNode(true))
        shadowElem.appendChild(targetItem.element.querySelector('span').cloneNode(true))
        modal.appendChild(shadowElem)

        // ドロップエリアを求める
        // ツリーアイテム
        ;(function recur (list) {
          for (const item of list) {
            const elem = item.element.firstElementChild
            dropRects.push({ item, elem, rect: elem.getBoundingClientRect() })
            if (item.isExpandable && item.isExpanded) recur(item)
          }
        })(this.fileTree)
        // ツリー
        dropRects.push({ item: this.fileTree, elem: this.fileTree.element, rect: this.fileTree.element.getBoundingClientRect() })
        // エディター
        dropRects.push({ item: null, elem: this.mainArea.element, rect: this.mainArea.element.getBoundingClientRect() })

        this.fileTree.element.blur()
      },
      ondrag: (px, py) => {
        // 半透明アイコンマウスをカーソルの中心に移動
        shadowElem.style.top = py - (shadowElem.clientWidth / 2) + 'px'
        shadowElem.style.left = px - (shadowElem.clientHeight / 2) + 'px'

        // ドロップ対象更新
        const newDropRect = dropRects.find(({ rect }) => px >= rect.left && px < rect.left + rect.width && py >= rect.top && py < rect.top + rect.height)
        if (newDropRect === dropRect) return
        if (dropRect) dropRect.elem.classList.remove('drop-target')
        dropRect = newDropRect
        if (dropRect) dropRect.elem.classList.add('drop-target')
      },
      ondragend: (px, py) => {
        if (dropRect) {
          dropRect.elem.classList.remove('drop-target')

          // エディターへのドロップ
          if (dropRect.elem === this.mainArea.element) {
            if (!this.fileTree.currentIsFile) return
            return this.openTab(this.fileTree.getPath())
          }

          this.fileTree.focus()

          // ドロップ元とドロップ先が同じ場合は何もしない
          if (dropRect.item === targetItem) return

          // ファイル・フォルダ移動
          const oldName = this.fileTree.getPath(targetItem)
          const newName = this.fileTree.getFolderPath(dropRect.item) + targetItem.text
          return this.fileListMove(oldName, newName)
        }
      },
      onerror: error => {
        this.onerror(error)
      }
    })
  }

  async handleTabChange (event) {
    const tab = this.tabs.current
    if (tab) {
      this.views.value = tab.path
      document.title = tab.path + ' - ' + this.name
      if (!tab.editor) return // Editor以外 (画像等)
      requestAnimationFrame(() => {
        this.resizeEditor()
        tab.editor.focus()
      })
    } else {
      document.title = this.name
    }
  }

  async handleTabMouseDown (event) {
    if (event.type === 'mousedown' && event.button !== 0) return
    // 閉じるボタン
    if (event.target.classList.contains('close-button')) {
      event.preventDefault()
      await this.closeTabs([TElement.from(event.target.parentElement)])
      return
    }
    // タブの入れ替え
    let rects, idx, currTab
    const updateRects = () => {
      rects = null
      requestAnimationFrame(() => {
        rects = [...seq(this.tabs).map((tab, idx) => ({ idx, tab, rect: tab.element.getBoundingClientRect() }))]
        idx = seq(this.tabs).indexOf(this.tabs.current)
      })
    }
    updateRects()
    hold({
      ondrag: (px, py) => {
        if (!rects) return
        const target = rects.find(r => px >= r.rect.left && px < r.rect.right && py >= r.rect.top && py < r.rect.bottom)
        if (target == null || target === this.tabs.current) {
          currTab = null
          return
        }
        if (currTab === target.tab) return
        currTab = target.tab
        this.tabs.insertBefore(this.tabs.current, target.idx < idx ? target.tab : target.tab.nextSibling)
        updateRects()
      },
      ondragend: () => {
        this.saveTabs()
      },
      onerror: error => {
        this.onerror(error)
      }
    })
  }

  handleDragSplitter () {
    this.resizeEditor()
  }

  handleMenuMouseDown (event) {
    if (event.button !== 0) return
    const target = getIncludingChild(this.menubar, event.target)
    if (!target) return
    const command = target.dataset.key
    switch (command) {
      case 'workspace':
        return this.showWorkSpaceList(event)
      case 'project':
        return this.showProjectMenu(event)
    }
  }

  async handleMenuClick (event) {
    const target = getIncludingChild(this.menubar, event.target)
    if (!target) return
    const command = target.dataset.key
    if (command == null) return
    switch (command) {
      case 'workspace':
      case 'project':
        return
      case 'run':
        return this.run(event)
      default:
        throw new Error('Undefiend command: ' + command)
    }
  }

  /**
   * ワークスペースのプルダウンメニュー
   * @param  event  マウスイベント
   */
  async showWorkSpaceList (event) {
    if (event.target.classList.contains('selected')) return
    event.target.classList.add('selected')

    let workspaces = await this.idbFile.getAllWorkSpaces()
    // DBの内容がクリアされている場合再作成
    if (workspaces.length === 0) {
      await this.idbFile.initWorkSpaces()
      workspaces = await this.idbFile.getAllWorkSpaces()
    }

    const value = await createContextMenu(`
      ${workspaces.map((data, idx) => `
        <div data-value="${idx}">
          <i class="material-icons">${data.path + '/' === this.idbFile.workspace ? 'check' : '_'}</i>
          ${data.label}
        </div>
      `).join('')}
    `)(event.target)
    const workspace = workspaces[value]

    event.target.classList.remove('selected')

    if (!workspace) return
    if (this.idbFile.workspace === workspace.path + '/') return

    if (this.tabs.childElementCount > 0) {
      await this.closeTabs(this.tabs, false)
      this.mainArea.current = this.mainAreaLoading
    }

    this.disposeCurrentProject()

    this.projectSetting = workspace.setting
    this.idbFile.workspace = workspace.path + '/'

    await this.refreshFileTreeAndCreateModels()
    await this.restoreTabs()
  }

  disposeCurrentProject () {
    // Monaco Editorのモデルを破棄する
    // this.monaco.editor.getModels().forEach(model => model.dispose())
    Object.values(this.editorModels).forEach(model => model.dispose())
    this.editorModels = Object.create(null)
  }

  /**
   * プロジェクトのプルダウンメニュー
   * @param  event  マウスイベント
   */
  async showProjectMenu (event) {
    if (event.target.classList.contains('selected')) return
    event.target.classList.add('selected')

    const value = await createContextMenu(`
      <div data-value="newProject"><i class="material-icons" style="color: #6A6;">library_add</i>新規プロジェクト</div>
      <div data-value="loadProject"><i class="material-icons" style="color: #C66;">file_open</i>プロジェクトを開く</div>
      <div data-value="saveProject"><i class="material-icons" style="color: #66C;">save</i>プロジェクトを保存</div>
    `)(event.target)

    event.target.classList.remove('selected')

    switch (value) {
      case 'newProject':
        if (!await confirm('現在のプロジェクトを閉じますか?\n(保存していないデータは失われます)')) {
          return
        }
        return this.newProject()
      case 'loadProject':
        if (!await confirm('現在のプロジェクトを閉じて、別のプロジェクトを開きますか?\n(保存していないデータは失われます)')) {
          return
        }
        return this.loadProject()
      case 'saveProject':
        return this.saveProject()
    }
  }

  /**
   * 別ウィンドウで「index.html」を開く
   */
  async run () {
    // 実行前に保存
    await Promise.all(seq(this.tabs).map(tab => this.saveTab(tab)))

    if (seq(this.fileTree).every(item => item.text !== 'index.html')) {
      await alert('"index.html" が無いため実行できません')
      return
    }

    if (this.debugWindow && !this.debugWindow.closed) {
      await this.debugWindow.fetch(this.base + 'resources/blank.txt') // not foundになることがあるので対策
      this.debugWindow.location.replace(this.base + 'debug/' + this.idbFile.workspace)
    } else {
      this.debugWindow = window.open(this.base + 'resources/blank.txt', 'appWindow', 'width=400,height=400')
      this.debugWindow.opener = null
      this.debugWindow.onload = async function () {
        this.debugWindow.location.replace(this.base + 'debug/' + this.idbFile.workspace)
      }.bind(this)
    }
  }

  /**
   * EZip.mjs 動的ロード
   */
  async fetchEZip () {
    return (await import(/* webpackPrefetch: true */ './EZip.mjs')).default
  }

  /**
   * 現在開かれているプロジェクトに名前をつけて保存する
   */
  async saveProject () {
    const EZip = await this.fetchEZip()
    const ezip = new EZip(this.projectSetting)
    const result = await ezip.save(async function () {
      return this.idbFile.getAllFiles()
    }.bind(this))
    if (result) {
      await this.idbFile.putWorkSpaceSetting(this.projectSetting)
    }
  }

  /**
   * 現在のプロジェクトを閉じる
   */
  async newProject (updateSetting = true) {
    // タブをすべて閉じる
    await this.closeTabs(this.tabs, false)
    this.disposeCurrentProject()
    // 現在のファイルリストを削除
    this.idbFile.removeAllFiles()
    // ツリーを空にする
    this.fileTree.textContent = ''
    this.refreshFileTreeArea()
    // 設定を初期化
    if (updateSetting) {
      this.projectSetting = this.idbFile.createDefaultSetting()
      await this.idbFile.putWorkSpaceSetting(this.projectSetting)
    }
  }

  /**
   * ファイルツリー表示領域を更新
   */
  refreshFileTreeArea () {
    if (this.fileTree.childElementCount === 0) {
      this.sideArea.current = this.sideAreaEmpty
    } else {
      this.sideArea.current = this.fileTreeArea
    }
  }

  /**
   * プロジェクトのZipファイルをローカルマシンから開く
   */
  async loadProject () {
    const EZip = await this.fetchEZip()
    const ezip = new EZip(this.projectSetting)
    const files = await ezip.load()
    if (!files) return
    await this.newProject(false)
    await this.addFile(...files)
    await this.idbFile.putWorkSpaceSetting(this.projectSetting)
  }

  onerror (error) {
    alert(error.message, 'エラー')
    throw error
  }
}
