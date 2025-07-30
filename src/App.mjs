import './MaterialIcons.mjs';
import * as styleDef from './assets/styledef.mjs';
import TDialog, { alert, confirm, prompt } from './assets/ui/TDialog.mjs';
import { ancestorNodes, getIncludingChild, sleep } from './util.mjs';
import { FileManager } from './editor/FileManager.mjs';
import FileTree from './FileTree.mjs';
import IdbFile from './IdbFile.mjs';
import TElement from './assets/ui/TElement.mjs';
import TList from './assets/ui/TList.mjs';
import TSplitter from './assets/ui/TSplitter.mjs';
import { TabViewManager } from './editor/TabViewManager.mjs';
import { createContextMenu } from './menu.mjs';
import hold from './assets/hold.mjs';
import style from './assets/style.mjs';
import { transpile } from './typescript-base.mjs';

const ukey = 'my-app';
style(styleDef.ui);
style(styleDef.fullscreen);
style(styleDef.flex);
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
  background: #EEE;
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
  z-index: 2;
}
.${ukey} .main-area > li:not(.current) {
  display: none;
}
.${ukey} .main-area-empty {
  justify-content: center;
  align-items: center;
  padding: 0 4em;
}
.${ukey} .editor-tabs {
  overflow-x: clip;
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
}
.${ukey} .views > li > div {
  min-width: 100%;
  min-height: 100%;
}
.${ukey} .views > li.current {
  display: inline-block;
}
.${ukey} .views iframe {
  border: none;
  width: 100%;
  height: calc(100% - 4px);
}
`);

export default class App extends TElement {
  template() {
    this.uses(FileTree, TSplitter, TList, TList.Item);
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
            <t-list-item id="tabViews" class="flex column fit tab-views" />
          </t-list>

          <t-splitter position="right" ondrag="return this.handleDragSplitter(event)" />
          <div id="previewArea" class="flex column" style="width: 0px;">
            <!-- プレビューエリアのメニュー -->
            <div id="previewMenu" class="menubar flex row" style="position: relative; overflow: hidden;">
              <i class="material-icons m-icon" style="color: #333;" onclick="return this.handlePreviewRefresh(event)">
                refresh
              </i>
              <i class="material-icons m-icon" style="color: #333; position: absolute; right: 0;" onclick="return this.handlePreviewClose(event)">
                close
              </i>
            </div>
            <!-- プレビューエリア -->
            <iframe id="previewFrame" class="flex fit" style="border: none;"></iframe>
          </div>
        </div>
      </div>
    `;
  }

  constructor() {
    super();
    this.name = document.title;
    this.version = '0.1.0';
    // TODO DB定義をService Workerと共通化
    this.namespace = location.pathname.slice(
      1,
      location.pathname.lastIndexOf('/'),
    );
    this.base = `${location.protocol}//${location.host}/${this.namespace === '' ? '' : `${this.namespace}/`}`;
    this.idbFile = new IdbFile(this.namespace);

    this.projectSetting = null;
    this.serviceWorkerRegistration = null;

    this.tabViewManager = new TabViewManager(() => {
      this.saveTabs();
      if (this.tabViewManager.tabViews.length === 0) {
        this.mainArea.current = this.mainAreaEmpty;
      }
    });
    this.tabViewManager.tabs.setAttribute('class', 'editor-tabs flex row');
    this.tabViewManager.views.setAttribute('class', 'views flex fit row');
    this.tabViews.element.append(
      this.tabViewManager.tabs,
      this.tabViewManager.views,
    );

    this.fileManeger = new FileManager(this.tabViewManager.handleEditorChange);
  }

  /**
   * 画面表示前処理
   */
  async init() {
    window.addEventListener('beforeunload', this.handleCloseWindow.bind(this));
    window.addEventListener(
      'resize',
      this.tabViewManager.resizeEditor.bind(this.tabViewManager),
    );

    const [serviceWorkerRegistration] = await Promise.all([
      this.registerServiceWorker(),
      this.restoreWorkpace(),
    ]);

    this.serviceWorkerRegistration = serviceWorkerRegistration;
  }

  /**
   * ワークスペース復元
   */
  async restoreWorkpace() {
    const lastWorkSpace = window.localStorage.getItem('lastWorkSpace');
    if (lastWorkSpace != null) {
      const workspaces = await this.idbFile.getAllWorkSpaces();
      if (
        workspaces.find(
          (workspace) => `${workspace.path}/` === lastWorkSpace,
        ) != null
      ) {
        this.idbFile.workspace = lastWorkSpace;
      }
    }
    this.projectSetting = await this.idbFile.getWorkSpaceSetting();
  }

  /**
   * 画面表示後処理
   */
  async main() {
    if (await this.idbFile.initialized()) {
      await this.refreshFileTreeAndCreateModels();
      await this.restoreTabs();
    } else {
      // WorkSpace作成
      await this.idbFile.initWorkSpaces();
      await this.createTemplateFiles(2);
    }
  }

  handleCloseWindow() {
    window.localStorage.setItem('lastWorkSpace', this.idbFile.workspace);
    if (this.debugWindow && !this.debugWindow.closed) {
      this.debugWindow.close();
    }
  }

  registerServiceWorker() {
    if (window.navigator.serviceWorker == null) {
      throw new Error('ServiceWorkerが無効です');
    }
    return window.navigator.serviceWorker.register('./sw.js');
  }

  /**
   * ファイルツリー全体をIDBから読み込んで更新する
   */
  async refreshFileTreeAndCreateModels() {
    const { folders, files } = await this.idbFile.getAllFoldersAndFiles();
    this.fileTree.update(folders, files);

    this.refreshFileTreeArea();
    await this.addFileManeger(files);
  }

  /**
   * ファイルをIDBに追加する
   */
  async addFile(...fileDataList) {
    // TypeScript
    for (const fileData of fileDataList) {
      if (!fileData.file) continue; // フォルダー
      const tsFile = transpile(fileData.path, await fileData.file.text());
      if (tsFile != null) {
        fileData.distFile = tsFile;
      }
    }

    await this.addFileManeger(fileDataList);

    await this.idbFile.addFiles(fileDataList);
    this.fileTree.addFile(fileDataList);
    this.sideArea.current = this.fileTreeArea;
  }

  async addFileManeger(files) {
    await Promise.all(
      files
        .filter((file) => file.file) // フォルダー除外
        .map((file) => this.fileManeger.add(file.path, file.file)),
    );
  }

  /**
   * ツリーで選択されているファイルまたはフォルダーを削除する
   */
  async deleteCurrentFileOrFolder() {
    const path = this.fileTree.getPath();

    const removedPaths = await this.idbFile.removeFile(path);

    for (const removedPath of removedPaths) {
      // Monaco Editorのモデルを破棄する
      this.tabViewManager.close(removedPath);
      this.fileManeger.remove(removedPath);
    }

    this.fileTree.remove(path);
    this.refreshFileTreeArea();
  }

  /**
   * タブとエディタを追加する
   */
  async openTab(path, toSave = true) {
    this.tabViewManager.open(this.fileManeger.get(path));

    if (toSave) {
      this.mainArea.current = this.tabViews;
      await this.saveTabs();
    }
  }

  /**
   * 現在開いているタブをIDBに保存する
   */
  async saveTabs() {
    this.projectSetting.tabs = this.tabViewManager.tabViews.map(
      (tabView) => tabView.path,
    );
    this.projectSetting.currentTab = this.tabViewManager.current.path;
    await this.idbFile.putWorkSpaceSetting(this.projectSetting);
  }

  /**
   * IDBからタブを復元する
   */
  async restoreTabs() {
    for (const path of this.projectSetting.tabs) {
      await this.openTab(path, false);
    }
    if (this.projectSetting.currentTab) {
      await this.openTab(this.projectSetting.currentTab);
    } else {
      this.mainArea.current = this.mainAreaEmpty;
    }
  }

  /**
   * エディターの内容をIDBに保存する
   */
  saveTabView(...tabViews) {
    return Promise.all(
      tabViews.map(async (tabView) => {
        if (!tabView.isModified()) return;

        const editorContent = tabView.editor.getValue();

        const path = tabView.path;
        const type = this.idbFile.getFileType(path);
        const file = new Blob([editorContent], { type });

        // TypeScript
        const distFile = transpile(path, editorContent);

        // 保存
        await this.idbFile.putFile(path, file, distFile);
        tabView.clearModified();
      }),
    );
  }

  handleDragOver(event) {
    event.preventDefault();
  }

  handleDrop(event) {
    event.preventDefault();
    return this.addFile(
      ...[...event.dataTransfer.files].map((file) => {
        const type = this.idbFile.getFileType(file.name) ?? file.type; // .tsファイルがブラウザ依存にならないようにする
        return { path: file.name, file: new Blob([file], { type }) };
      }),
    );
  }

  handleKeyDown(event) {
    // console.log('KeyCode: ' + event.keyCode)
    switch (event.keyCode) {
      case 83: // s
        if (event.ctrlKey) {
          event.preventDefault();
          return this.saveTabView(this.tabViewManager.current);
        }
        break;
      case 116: // F5
        event.preventDefault();
        return this.run(event);
      default:
      // do nothing
    }
    return null;
  }

  async handleSelectTemplate() {
    const result = await TDialog.create(
      class extends TDialog {
        titleTemplate() {
          return 'テンプレートを選択してください';
        }

        bodyTemplate() {
          return `
          <ul class="select-template-choices">
            <li><button onclick="this.resolve(1)">1. 「index.html」のみ作成</button></li>
            <li><button onclick="this.resolve(2)">2. 「index.html」、「style.css」、「main.ts」を作成</button></li>
          </ul>
        `;
        }

        buttonsTemplate() {
          return `
          <button onclick="return this.handleCancel(event)">キャンセル</button>
        `;
        }
      },
    )();

    await this.createTemplateFiles(result);
  }

  async createTemplateFiles(id) {
    switch (id) {
      case 1:
        await this.addFile({
          path: 'index.html',
          file: new Blob(
            [
              `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>
  </head>
  <body>
    <p>Hello, World!</p>
  </body>
</html>
`,
            ],
            { type: 'text/html' },
          ),
        });
        await this.openTab('index.html');
        break;
      case 2:
        await this.addFile(
          {
            path: 'index.html',
            file: new Blob(
              [
                `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>
    <link rel="stylesheet" href="style.css">
    <script type="module" src="main.ts"></script>
  </head>
  <body>
  </body>
</html>
`,
              ],
              { type: 'text/html' },
            ),
          },
          {
            path: 'style.css',
            file: new Blob(
              [
                `:root {
  font-family: sans-serif;
}
`,
              ],
              { type: 'text/css' },
            ),
          },
          {
            path: 'main.ts',
            file: new Blob(
              [
                `// ここにコードを書く
document.body.innerHTML = '<h1>Hello, World!</h1>';
`,
              ],
              { type: 'text/typescript' },
            ),
          },
        );
        await this.openTab('index.html', false);
        await this.openTab('style.css', false);
        await this.openTab('main.ts');
        break;
      default:
        throw new Error(`Undefined id: ${id}`);
    }
  }

  handleFileTreeKeyDown(event) {
    // console.log('KeyCode: ' + event.keyCode)
    switch (event.keyCode) {
      case 13: // Enter
        return this.command('open');
      case 46: // Delete
        return this.command('delete');
      case 113: // F2
        return this.command('rename');
      default:
        return null;
    }
  }

  handleFileTreeDoubleClick(event) {
    if (event.target.classList.contains('expand-icon')) return null; // ツリーの展開アイコン
    if (!this.fileTree.currentIsFile) return null;
    return this.openTab(this.fileTree.getPath());
  }

  async handleFileTreeContextMenu(event) {
    event.preventDefault();
    const disabled = this.fileTree.current == null ? 'class="disabled"' : '';
    const value = await createContextMenu(`
      <div data-value="newFile"><i class="material-icons" style="color: #AAC;">note_add</i>新規ファイル</div>
      <div data-value="newFolder"><i class="material-icons" style="color: #FB8;">create_new_folder</i>新規フォルダー</div>
      <div data-value="rename" ${disabled}><i class="material-icons" style="color: #96C;">drive_file_rename_outline</i>名前の変更</div>
      <div data-value="delete" ${disabled}><i class="material-icons" style="color: #999;">delete</i>削除</div>
    `)(event);
    if (value) await this.command(value);
  }

  async command(command) {
    switch (command) {
      case 'newFile':
      case 'newFolder':
        return this.newFileOrFolder(command === 'newFolder');
      case 'rename': {
        const oldName = this.fileTree.current.text;

        const newName = await this.inputFileName(
          this.fileTree.currentIsFile ? 'ファイル名' : 'フォルダー名',
          oldName,
          '名前の変更',
        );
        if (!newName) return null;

        let path = this.fileTree.getPath(this.fileTree.current.parentNode);
        if (path !== '') path += '/';
        return this.fileListMove(path + oldName, path + newName);
      }
      case 'delete': {
        if (
          !(await confirm(
            `${this.fileTree.currentIsFile ? 'ファイル' : 'フォルダー'} "${this.fileTree.current.text}" を削除しますか?'`,
          ))
        )
          break;
        return this.deleteCurrentFileOrFolder();
      }
      case 'open':
        if (!this.fileTree.currentIsFile) return null;
        return this.openTab(this.fileTree.getPath());
      default:
        throw new Error(`Undefiend command: ${command}`);
    }
    return null;
  }

  async newFileOrFolder(isFolder) {
    let parentFolder = this.fileTree.current;
    if (parentFolder) {
      if (!parentFolder.isExpandable) parentFolder = parentFolder.parentNode;
      if (parentFolder !== this.fileTree) parentFolder.expand();
    }
    const typeName = isFolder ? 'フォルダー' : 'ファイル';
    let name = '';
    while (true) {
      name = await this.inputFileName(`${typeName}名`, name, `新規${typeName}`);
      if (!name) return null;
      const type = this.idbFile.getFileType(name);
      const path = this.fileTree.getFolderPath() + name;
      const fileData = isFolder
        ? { path }
        : { path, file: new Blob([''], { type }) };
      try {
        await this.addFile(fileData);
        this.fileTree.focus();
        return null;
      } catch (error) {
        if (error.name === 'ConstraintError') {
          await alert(
            'この場所には同名のファイルまたはフォルダーがあります',
            'エラー',
          );
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * ファイル名入力チェック
   */
  async inputFileName(isFile, defaultName, title) {
    let fileName = defaultName;
    do {
      const name = await prompt(`${isFile}を入力してください`, fileName, title);
      if (!name) return '';

      let msg = '';
      if ([...'\\/:*?"<>|'].some((c) => name.includes(c))) {
        msg = `${isFile}には次の文字は使えません:\n\\ / : * ? " < > |`;
      } else if (name === '.' || name === '..') {
        msg = `その${isFile}を付けることはできません`;
      }
      if (!msg) return name;

      await alert(msg, '注意');
      fileName = name;
      // eslint-disable-next-line no-constant-condition
    } while (true);
  }

  /**
   * ファイル移動・リネーム
   */
  async fileListMove(fromPath, toPath) {
    if (fromPath === toPath) return;

    if (`${toPath}/`.startsWith(`${fromPath}/`)) {
      await alert(
        '受け側のフォルダーは、送り側フォルダーのサブフォルダーです。',
        '中断',
      );
      return;
    }

    // 受け側のフォルダーに同名のファイルまたはフォルダーがある場合は中断
    if (await this.idbFile.getFile(toPath)) {
      await alert(
        '受け側のフォルダーに同名のファイルまたはフォルダーがあります。',
        '中断',
      );
      return;
    }

    // IDB更新
    const movedPaths = await this.idbFile.moveFile(fromPath, toPath);

    // タブ更新
    for (const [fromFilePath, toFilePath] of movedPaths) {
      this.tabViewManager.rename(fromFilePath, toFilePath, () =>
        this.fileManeger.rename(fromFilePath, toFilePath),
      );
    }
    await this.saveTabs();

    //ツリー更新
    this.fileTree.move(fromPath, toPath);
  }

  handleFileTreeMouseDown(event) {
    if (event.button === 1) return;

    // ドラッグ対象
    const targetItem = [...ancestorNodes(event.target)]
      .map((elem) => TElement.from(elem))
      .find((item) => item instanceof FileTree.Item);
    if (!targetItem) return;

    let shadowElem = null;
    const dropRects = [];
    let dropRect = null;
    hold({
      ondragstart: (px, py, modal) => {
        // ドラッグ中の半透明アイコン作成
        shadowElem = TElement.createElement(`
          <div style="position: absolute; text-align: center; opacity: .75;" class="flex column"></div>
        `);
        shadowElem.appendChild(
          targetItem.element.querySelector('.icon').cloneNode(true),
        );
        shadowElem.appendChild(
          targetItem.element.querySelector('span').cloneNode(true),
        );
        modal.appendChild(shadowElem);

        // ドロップエリアを求める
        // ツリーアイテム
        (function recur(list) {
          for (const item of list) {
            const elem = item.element.firstElementChild;
            dropRects.push({ item, elem, rect: elem.getBoundingClientRect() });
            if (item.isExpandable && item.isExpanded) recur(item);
          }
        })(this.fileTree);
        // ツリー
        dropRects.push({
          item: this.fileTree,
          elem: this.fileTree.element,
          rect: this.fileTree.element.getBoundingClientRect(),
        });
        // エディター
        dropRects.push({
          item: null,
          elem: this.mainArea.element,
          rect: this.mainArea.element.getBoundingClientRect(),
        });

        this.fileTree.element.blur();
      },
      ondrag: (px, py) => {
        // 半透明アイコンマウスをカーソルの中心に移動
        shadowElem.style.top = `${py - shadowElem.clientWidth / 2}px`;
        shadowElem.style.left = `${px - shadowElem.clientHeight / 2}px`;

        // ドロップ対象更新
        const newDropRect = dropRects.find(
          ({ rect }) =>
            px >= rect.left &&
            px < rect.left + rect.width &&
            py >= rect.top &&
            py < rect.top + rect.height,
        );
        if (newDropRect === dropRect) return;
        if (dropRect) dropRect.elem.classList.remove('drop-target');
        dropRect = newDropRect;
        if (dropRect) dropRect.elem.classList.add('drop-target');
      },
      ondragend: () => {
        shadowElem?.remove();
        if (dropRect) {
          dropRect.elem.classList.remove('drop-target');

          // エディターへのドロップ
          if (dropRect.elem === this.mainArea.element) {
            if (!this.fileTree.currentIsFile) return null;
            return this.openTab(this.fileTree.getPath());
          }

          this.fileTree.focus();

          // ドロップ元とドロップ先が同じ場合は何もしない
          if (dropRect.item === targetItem) return null;

          // ファイル・フォルダ移動
          const oldName = this.fileTree.getPath(targetItem);
          const newName =
            this.fileTree.getFolderPath(dropRect.item) + targetItem.text;
          return this.fileListMove(oldName, newName);
        }
        return null;
      },
      onerror: (error) => {
        this.onerror(error);
      },
    });
  }

  handleDragSplitter() {
    this.tabViewManager.resizeEditor();
  }

  handleMenuMouseDown(event) {
    if (event.button !== 0) return null;
    const target = getIncludingChild(this.menubar, event.target);
    if (!target) return null;
    const command = target.dataset.key;
    switch (command) {
      case 'workspace':
        return this.showWorkSpaceList(event);
      case 'project':
        return this.showProjectMenu(event);
      default:
      // do nothing
    }
    return null;
  }

  handleMenuClick(event) {
    const target = getIncludingChild(this.menubar, event.target);
    if (!target) return null;
    const command = target.dataset.key;
    if (command == null) return null;
    switch (command) {
      case 'workspace':
      case 'project':
        return null;
      case 'run':
        return this.run(event);
      default:
        throw new Error(`Undefiend command: ${command}`);
    }
  }

  /**
   * ワークスペースのプルダウンメニュー
   * @param  event  マウスイベント
   */
  async showWorkSpaceList(event) {
    if (event.target.classList.contains('selected')) return;
    event.target.classList.add('selected');

    let workspaces = await this.idbFile.getAllWorkSpaces();
    // DBの内容がクリアされている場合再作成
    if (workspaces.length === 0) {
      await this.idbFile.initWorkSpaces();
      workspaces = await this.idbFile.getAllWorkSpaces();
    }

    const value = await createContextMenu(`
      ${workspaces
        .map((data, idx) => {
          const icon =
            `${data.path}/` === this.idbFile.workspace ? 'check' : '_';
          let label = '(無題)';
          if (data.setting?.fileName) {
            let fileName = data.setting.fileName;
            if (fileName.endsWith('.zip')) {
              fileName = fileName.slice(0, -4);
            }
            label = fileName;
          }
          return `<div data-value="${idx}"><i class="material-icons">${icon}</i>${idx + 1}: ${label}</div>`;
        })
        .join('')}
    `)(event.target);
    const workspace = workspaces[value];

    event.target.classList.remove('selected');

    if (!workspace) return;
    if (this.idbFile.workspace === `${workspace.path}/`) return;

    // 現在のプロジェクトを閉じる
    this.tabViewManager.closeAll();
    this.mainArea.current = this.mainAreaLoading;
    this.fileManeger.removeAll();

    // 読み込み
    this.projectSetting = workspace.setting;
    this.idbFile.workspace = `${workspace.path}/`;
    await this.refreshFileTreeAndCreateModels();
    await this.restoreTabs();
  }

  /**
   * プロジェクトのプルダウンメニュー
   * @param  event  マウスイベント
   */
  async showProjectMenu(event) {
    if (event.target.classList.contains('selected')) return null;
    event.target.classList.add('selected');

    const value = await createContextMenu(`
      <div data-value="newProject"><i class="material-icons" style="color: #6A6;">library_add</i>新規プロジェクト</div>
      <div data-value="loadProject"><i class="material-icons" style="color: #C66;">file_open</i>プロジェクトを開く</div>
      <div data-value="saveProject"><i class="material-icons" style="color: #66C;">save</i>プロジェクトを保存</div>
    `)(event.target);

    event.target.classList.remove('selected');

    switch (value) {
      case 'newProject':
        if (
          !(await confirm(
            '現在のプロジェクトを閉じますか?\n(保存していないデータは失われます)',
          ))
        ) {
          return null;
        }
        return this.newProject();
      case 'loadProject':
        if (
          !(await confirm(
            '現在のプロジェクトを閉じて、別のプロジェクトを開きますか?\n(保存していないデータは失われます)',
          ))
        ) {
          return null;
        }
        return this.loadProject();
      case 'saveProject':
        return this.saveProject();
      default:
      // do nothing
    }
    return null;
  }

  async waitServiceWorkerActivated() {
    for (let i = 0; i < 50; i++) {
      if (this.serviceWorkerRegistration?.active?.state === 'activated') return;
      await sleep(100);
    }
    throw new Error('Service Worker is not activated.');
  }

  /**
   * 別ウィンドウで「index.html」を開く
   */
  async run(event) {
    // 実行前に保存
    await this.saveTabView(...this.tabViewManager.tabViews);

    if ([...this.fileTree].every((item) => item.text !== 'index.html')) {
      await alert('"index.html" が無いため実行できません');
      return;
    }

    await this.waitServiceWorkerActivated();

    if (event.ctrlKey) {
      // Ctrlキーを押している場合は別タブで開く
      window.open(`${this.base}debug/${this.idbFile.workspace}`);
    } else {
      this.handlePreviewRefresh(event);
    }
  }

  /**
   * プレビューエリアを再読み込み
   */
  handlePreviewRefresh() {
    // eslint-disable-next-line no-console
    console.clear();
    if (this.previewArea.style.width === '0px') {
      this.previewArea.style.width = '300px';
      this.tabViewManager.resizeEditor();
    }
    this.previewFrame.src = `${this.base}debug/${this.idbFile.workspace}`;
  }

  /**
   * プレビューエリアを閉じる
   */
  handlePreviewClose() {
    this.previewFrame.src = 'about:blank';
    if (this.previewArea.style.width !== '0px') {
      this.previewArea.style.width = '0px';
      this.tabViewManager.resizeEditor();
    }
  }

  /**
   * EZip.mjs 動的ロード
   */
  async fetchEZip() {
    return (await import(/* webpackPrefetch: true */ './EZip.mjs')).default;
  }

  /**
   * 現在開かれているプロジェクトに名前をつけて保存する
   */
  async saveProject() {
    const EZip = await this.fetchEZip();
    const ezip = new EZip(this.projectSetting);
    const result = await ezip.save(() => this.idbFile.getAllFiles());
    if (result) {
      await this.idbFile.putWorkSpaceSetting(this.projectSetting);
    }
  }

  /**
   * 現在のプロジェクトを閉じる
   */
  async newProject(updateSetting = true) {
    // タブをすべて閉じる
    this.tabViewManager.closeAll();
    this.mainArea.current = this.mainAreaEmpty;
    // 現在のファイルリストを削除
    this.fileManeger.removeAll();
    this.idbFile.removeAllFiles();
    // ツリーを空にする
    this.fileTree.textContent = '';
    this.refreshFileTreeArea();
    // 設定を初期化
    if (updateSetting) {
      this.projectSetting = this.idbFile.createDefaultSetting();
      await this.idbFile.putWorkSpaceSetting(this.projectSetting);
    }
  }

  /**
   * ファイルツリー表示領域を更新
   */
  refreshFileTreeArea() {
    if (this.fileTree.childElementCount === 0) {
      this.sideArea.current = this.sideAreaEmpty;
    } else {
      this.sideArea.current = this.fileTreeArea;
    }
  }

  /**
   * プロジェクトのZipファイルをローカルマシンから開く
   */
  async loadProject() {
    const EZip = await this.fetchEZip();
    const ezip = new EZip(this.projectSetting);
    const files = await ezip.load();
    if (!files) return;
    await this.newProject(false);
    await this.addFile(...files);
    await this.idbFile.putWorkSpaceSetting(this.projectSetting);
  }

  onerror(error) {
    alert(error.message, 'エラー');
    throw error;
  }
}
