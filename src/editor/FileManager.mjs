// @ts-check
import { createModel, disposeModel } from './editor-base.mjs';

/**
 * ファイルのパスとモデル
 */
export class FileContent {
  /**
   * コンストラクター
   * @param {string} path
   * @param {Blob} blob
   */
  constructor(path, blob) {
    this.path = path;
    this.blob = blob;
  }

  /**
   * モデル初期化処理
   * インスタンス化直後に一度だけ実行する非同期処理
   * @param {() => void} onChange
   * @returns {Promise<void>}
   */
  async init(onChange) {
    if (this.isMediaType()) return;
    this.createModel(await this.blob.text(), onChange);
  }

  /**
   * パスの拡張子から画像などのメディアファイルかどうかを判定する
   * @returns {boolean}
   */
  isMediaType() {
    const fileName = this.path.slice(this.path.lastIndexOf('/') + 1);
    const ext = fileName.slice(fileName.lastIndexOf('.') + 1);
    return [
      '3gp',
      '3g2',
      'avi',
      'bmp',
      'gif',
      'jpg',
      'jpeg',
      'm4a',
      'mp3',
      'mpeg',
      'oga',
      'ogg',
      'ogv',
      'pdf',
      'png',
      'wav',
      'weba',
      'webm',
      'webp',
    ].includes(ext);
  }

  /**
   * モデルを作成する
   * @param {string} content
   * @param {() => void} onChange
   */
  createModel(content, onChange) {
    this.model = createModel(this.path, content, onChange);
  }
}

/**
 * ファイル管理クラス
 */
export class FileManager {
  /**
   * @type {FileContent[]}
   */
  contents = [];

  /**
   * コンストラクター
   * @param {() => void} onChange
   */
  constructor(onChange) {
    this.onChange = onChange;
  }

  /**
   * パスからファイルコンテンツを取得
   * @param {string} path
   * @returns {FileContent | undefined}
   */
  get(path) {
    return this.contents.find((fileContent) => fileContent.path === path);
  }

  /**
   * ファイルを管理リストに追加する
   * @param {string} path
   * @param {Blob} blob
   * @returns {Promise<void>}
   */
  add(path, blob) {
    const content = new FileContent(path, blob);
    this.contents.push(content);
    return content.init(this.onChange);
  }

  /**
   * ファイルを管理リストから削除する
   * @param {string} path
   * @returns {FileContent | null}
   */
  remove(path) {
    const index = this.contents.findIndex((content) => content.path === path);
    if (index === -1) return null;

    const content = /** @type {FileContent} */ (
      this.contents.splice(index, 1)[0]
    );
    if (content.model) {
      disposeModel(content.model);
    }
    return content;
  }

  /**
   * ファイル管理リストを空にする
   */
  removeAll() {
    for (const content of this.contents) {
      if (content.model) {
        disposeModel(content.model);
      }
    }
    this.contents.length = 0;
  }

  /**
   * ファイルのパスを変更する
   * @param {string} fromPath
   * @param {string} toPath
   * @returns {Promise<FileContent | null>}
   */
  async rename(fromPath, toPath) {
    const contentValue = this.get(fromPath)?.model?.getValue();

    const oldContent = this.remove(fromPath);
    if (!oldContent) return null;
    const newContent = new FileContent(toPath, oldContent.blob);
    this.contents.push(newContent);

    if (contentValue != null && !newContent.isMediaType()) {
      newContent.createModel(contentValue, this.onChange);
    } else {
      await newContent.init(this.onChange);
    }

    return newContent;
  }
}
