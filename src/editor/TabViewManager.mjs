// @ts-check
import { createEditor, disposeEditor, refresh } from './editor-base.mjs';
import { hold } from '../assets/hold.mjs';
import style from '../assets/style.mjs';

/**
 * @typedef {import('monaco-editor').editor.IStandaloneCodeEditor} MonacoEditor
 * @typedef {import('monaco-editor').editor.ITextModel} MonacoEditorModel
 * @typedef {import('./FileManager.mjs').FileContent} FileContent
 */

style(`
.editor-tabs {
  border-bottom: 1px solid #999;
  background-color: #EEE;
  flex-wrap: wrap;
}
.editor-tabs > li {
  margin: 4px -1px -1px 0;
  padding: 1px 5px;
  border: 1px solid #999;
  border-bottom: none;
  background-color: #EEE;
}
.editor-tabs > li:hover {
  background: #DEF;
}
.editor-tabs > li.current {
  margin-top: 2px;
  background: #FFF;
}
.editor-tabs > li > * {
  vertical-align: middle;
}
.editor-tabs > li.modified > .label::before {
  content: '*'
}
.editor-tabs > li .close-button {
  border: 1px solid transparent;
  font-size: 12px;
  padding: 1px;
  margin-left: 4px;
}
.editor-tabs > li .close-button:hover {
  border: 1px solid #CCC;
}
`);

/**
 * タブとエディター表示領域のセット
 */
class TabView {
  path = '';
  tab = document.createElement('li');
  view = document.createElement('li');
  label = document.createElement('span');

  /**
   * コンストラクター
   * @param {string} path
   */
  constructor(path) {
    this.setPath(path);
    const closeButton = document.createElement('span');
    closeButton.setAttribute('class', 'material-icons close-button');
    closeButton.textContent = 'close';
    this.label.setAttribute('class', 'label');
    this.tab.append(this.label, closeButton);
  }

  /**
   * ファイルパスをセットする
   * @param {string} path
   */
  setPath(path) {
    this.path = path;
    this.label.textContent = path.slice(path.lastIndexOf('/') + 1);
  }

  /**
   * 初期化処理
   */
  init() {
    // do nothing
  }

  /**
   * 描画更新処理
   */
  refresh() {
    // do nothing
  }

  /**
   * 内容が変更されているか
   * @returns {boolean}
   */
  isModified() {
    return this.tab.classList.contains('modified');
  }

  /**
   * 変更状態をクリア
   */
  clearModified() {
    this.tab.classList.remove('modified');
  }

  /**
   * @abstract
   */
  dispose() {
    // do nothing
  }
}

class EditorTabView extends TabView {
  /**
   * @type {MonacoEditor | undefined} editor
   */
  editor;

  /**
   * コンストラクター
   * @param {string} path
   * @param {MonacoEditorModel} model
   */
  constructor(path, model) {
    super(path);
    this.model = model;
  }

  /**
   * 初期化
   */
  init() {
    this.editor = createEditor(this.view, this.model);
  }

  /**
   * 描画更新
   */
  refresh() {
    refresh(this.model);
  }

  /**
   * 破棄
   */
  dispose() {
    if (this.editor) disposeEditor(this.editor);
  }
}

/**
 * 画像などのファイルを表示するクラス
 */
class MediaTabView extends TabView {
  /**
   * コンストラクター
   * @param {string} path
   * @param {Blob} blob
   */
  constructor(path, blob) {
    super(path);
    this.iframe = document.createElement('iframe');
    this.view.append(this.iframe);
    this.url = URL.createObjectURL(blob);
    this.iframe.src = this.url;
  }

  /**
   * 破棄
   */
  dispose() {
    this.iframe.src = 'about:blank';
    this.iframe.remove();
    URL.revokeObjectURL(this.url);
  }
}

/**
 * タブとエディター表示領域の管理
 */
export class TabViewManager {
  /**
   * @type {TabView[]}
   */
  tabViews = [];

  /**
   * @type {TabView | null}
   */
  current = null;

  isRefreshing = false;
  tabs = document.createElement('ul');
  views = document.createElement('ul');

  /**
   * コンストラクター
   * @param {() => void} onChangeTabs
   * @param {() => void} onChangeTabs
   */
  constructor(onChangeTabs) {
    this.onChangeTabs = onChangeTabs;
    this.tabs.onmousedown = this.handleTabMouseDown;
    this.tabs.onclick = this.handleCloseButtonClick;
  }

  /**
   * エディターの内容変更イベントハンドラー
   */
  handleEditorChange = () => {
    if (!this.isRefreshing) {
      this.current?.tab.classList.add('modified');
    }
  };

  /**
   * タブ上でのマウスダウンイベントハンドラー
   * タブ選択・ドラッグによる順序入れ替え
   * @param {MouseEvent} event
   */
  handleTabMouseDown = (event) => {
    const eventTarget = event.target;
    if (
      !(eventTarget instanceof HTMLElement) ||
      eventTarget.classList.contains('close-button')
    ) {
      return;
    }
    const target = this.tabViews.find(
      (target) =>
        target.tab === eventTarget || target.tab === eventTarget.parentElement,
    );
    if (!target) return;

    // タブ選択
    this.setCurrent(target);
    // タブの入れ替え
    this.swapTabs();
  };

  /**
   * 閉じるボタンクリックイベントハンドラー
   * @param {MouseEvent} event
   */
  handleCloseButtonClick = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    // closeボタン
    if (!target.classList.contains('close-button')) return;
    const tab = target.parentElement;
    const tabView = this.tabViews.find((tabView) => tabView.tab === tab);
    if (!tabView) return;
    this.close(tabView.path);
  };

  /**
   * タブを開く
   * @param {FileContent} content
   */
  open(content) {
    let tabView = this.findByPath(content.path);
    if (!tabView) {
      tabView =
        (this.findByPath(content.path) ?? content.model)
          ? new EditorTabView(
              content.path,
              /** @type {MonacoEditorModel} */ (content.model),
            )
          : new MediaTabView(content.path, content.blob);
      this.tabViews.push(tabView);
      this.tabs.append(tabView.tab);
      this.views.append(tabView.view);
      tabView.init();
    }
  }

  /**
   * タブを閉じる
   * @param {string} path
   */
  close(path) {
    let index = this.tabViews.findIndex((curr) => curr.path === path);
    if (index === -1) return;

    const target = /** @type {TabView} */ (this.tabViews[index]);
    target.dispose();
    target.tab.remove();
    target.view.remove();
    this.tabViews.splice(index, 1);

    if (this.current === target) {
      // カレントを閉じたとき
      if (index > 0) index -= 1;
      const newCurrent = this.tabViews[index];
      if (newCurrent) {
        this.setCurrent(newCurrent);
      } else {
        this.current = null;
      }
    }

    this.onChangeTabs();
  }

  /**
   * すべてのタブを閉じる
   */
  closeAll() {
    for (const target of this.tabViews) {
      target.dispose();
    }
    this.tabs.innerHTML = '';
    this.views.innerHTML = '';
    this.tabViews.length = 0;
    this.current = null;
  }

  /**
   * 描画更新
   */
  refresh() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    requestAnimationFrame(() => {
      this.current?.refresh();
      this.isRefreshing = false;
    });
  }

  isResizing = false;

  /**
   * エディターリサイズ
   */
  resizeEditor() {
    if (this.isResizing) return;
    this.isResizing = true;
    requestAnimationFrame(() => {
      this.isResizing = false;
      const current = this.current;
      if (!(current instanceof EditorTabView) || !current.editor) return;
      current.editor.layout();
    });
  }

  /**
   * パスに対応するTabViewを取得する
   * @param {string} path
   * @returns {TabView | null}
   */
  findByPath(path) {
    return this.tabViews.find((target) => target.path === path) ?? null;
  }

  /**
   * 指定のタブをカレントにする
   * @param {TabView | null} newCurrent
   */
  setCurrent(newCurrent) {
    if (newCurrent instanceof EditorTabView) {
      requestAnimationFrame(() => {
        newCurrent.editor?.focus();
      });
    }

    if (!newCurrent || newCurrent === this.current) {
      this.current = newCurrent;
      return;
    }

    if (this.current) {
      this.current.tab.classList.remove('current');
      this.current.view.classList.remove('current');
    }
    newCurrent.tab.classList.add('current');
    newCurrent.view.classList.add('current');
    this.current = newCurrent;
    this.onChangeTabs();

    this.refresh();
    this.resizeEditor();
  }

  /**
   * パスで指定したタブをカレントにする
   * @param {string} path
   */
  setCurrentByPath(path) {
    this.setCurrent(this.findByPath(path));
  }

  /**
   * パスを変更する
   * @param {string} fromPath
   * @param {string} toPath
   * @param {() => Promise<FileContent | null>} rebuildModel
   * @returns {Promise<void>}
   */
  async rename(fromPath, toPath, rebuildModel) {
    // todo エディター<->メディア?

    const target = this.findByPath(fromPath);

    // パスを付け替える
    target?.setPath(toPath);

    if (target instanceof EditorTabView) {
      if (target.editor) disposeEditor(target.editor);

      // モデルを作り直す
      const fileContent = await rebuildModel();
      if (!fileContent?.model) {
        throw new Error('モデルが作成できません');
      }
      target.model = fileContent.model;

      // エディターを作り直す
      const current = this.current;
      this.setCurrent(target);
      target.editor = createEditor(target.view, target.model);
      this.setCurrent(current);

      if (this.current && this.current !== target) {
        this.current.refresh();
      }
    } else if (!(target instanceof MediaTabView)) {
      // タブが閉じられている場合もモデルの再構築が必要
      await rebuildModel();
    }
  }

  /**
   * タブの入れ替え
   */
  swapTabs() {
    // タブ要素の領域を取得
    /**
     * @type {{ index: number; tabView: TabView; rect: DOMRect }[]}
     */
    let rects = [];
    const updateRects = () => {
      requestAnimationFrame(() => {
        rects = this.tabViews.map((tabView, index) => ({
          index,
          tabView,
          rect: tabView.tab.getBoundingClientRect(),
        }));
      });
    };
    updateRects();

    let isChange = false;
    /**
     * @type {TabView | null}
     */
    let currentTarget = null;
    hold({
      ondrag: (px, py) => {
        // 領域チェック
        const target = rects.find(
          (target) =>
            px >= target.rect.left &&
            px < target.rect.right &&
            py >= target.rect.top &&
            py < target.rect.bottom,
        );
        if (!target || target.tabView === this.current) {
          currentTarget = null;
          return;
        }
        if (currentTarget === target.tabView) return;
        currentTarget = target.tabView;

        // 入れ替え
        isChange = true;
        const currentIndex = this.tabViews.indexOf(
          /** @type {TabView} */ (this.current),
        );
        const tabView = /** @type {TabView} */ (
          this.tabViews.splice(currentIndex, 1)[0]
        );
        this.tabViews.splice(target.index, 0, tabView);

        // DOM更新
        this.tabs.append(...this.tabViews.map((c) => c.tab));
        //this.views.append(...this.tabViews.map((c) => c.view));
        updateRects();
      },
      ondragend: () => {
        if (isChange) this.onChangeTabs();
      },
    });
  }
}
