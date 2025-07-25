import * as idb from '@haiix/idb';

export default class IdbFile {
  /**
   * IDB上にファイル保存用のDBを作成する
   */
  constructor(name) {
    this.db = idb.open(name);
    this.fileStore = this.db.objectStore(
      'files',
      {
        keyPath: 'id',
        autoIncrement: true,
      },
      [
        {
          name: 'path',
          keyPath: 'path',
          options: {
            unique: true,
          },
        },
      ],
    );
    this.workspace = 'workspace1/';
  }

  async initialized() {
    return (await this.fileStore.count()) > 0;
  }

  /**
   * IDB上にデフォルトのワークスペース4つを作成する
   */
  initWorkSpaces() {
    return Promise.all(
      [1, 2, 3, 4].map((i) =>
        this.fileStore.add({
          path: `workspace${i}`,
          label: `ワークスペース${i}`,
          setting: this.createDefaultSetting(),
        }),
      ),
    );
  }

  /**
   * 全ワークスペースのリストを返す
   * @return workSpaces
   */
  async getAllWorkSpaces() {
    const workSpaces = [];
    for await (const cursor of this.fileStore.index('path').openCursor()) {
      const fileData = cursor.value;
      if (!fileData.path.includes('/')) {
        fileData.setting = this.createDefaultSetting(fileData.setting);
        workSpaces.push(fileData);
      }
      cursor.continue();
    }
    return workSpaces;
  }

  /**
   * 現在のワークスペースにある全フォルダと全ファイルのリストを返す
   * @return { folders, files }
   */
  async getAllFoldersAndFiles() {
    const folders = [];
    const files = [];
    for await (const cursor of this.fileStore
      .index('path')
      .openCursor(IDBKeyRange.lowerBound(this.workspace))) {
      let fileData = cursor.value;
      if (!fileData.path.startsWith(this.workspace)) break;

      fileData = {
        ...fileData,
        path: fileData.path.slice(this.workspace.length),
      };
      if (fileData.file) {
        files.push(fileData);
      } else {
        folders.push(fileData);
      }

      cursor.continue();
    }
    return { folders, files };
  }

  /**
   * 現在のワークスペースにある全ファイルのリストを返す
   * @return inputFiles
   */
  async getAllFiles() {
    const inputFiles = [];
    for await (const cursor of this.fileStore
      .index('path')
      .openCursor(IDBKeyRange.lowerBound(this.workspace))) {
      const fileData = cursor.value;
      if (!fileData.path.startsWith(this.workspace)) break;

      inputFiles.push({
        ...fileData,
        path: fileData.path.slice(this.workspace.length),
      });

      cursor.continue();
    }
    return inputFiles;
  }

  /**
   * 複数のファイルをIDBに追加する
   * @param fileDataList
   */
  addFiles(fileDataList) {
    return Promise.all(
      fileDataList.map((fileData) =>
        this.fileStore.put({
          ...fileData,
          path: this.workspace + fileData.path,
        }),
      ),
    );
  }

  /**
   * ファイルまたはフォルダを削除する
   * @param path
   * @param removePaths 実際に削除されたファイルパスのリスト
   */
  async removeFile(path) {
    const removedPaths = [];
    for await (const cursor of this.fileStore
      .index('path')
      .openCursor(IDBKeyRange.lowerBound(this.workspace + path))) {
      const fileData = cursor.value;
      if (!`${fileData.path}/`.startsWith(`${this.workspace}${path}/`)) break;

      cursor.delete(fileData);
      removedPaths.push(fileData.path.slice(this.workspace.length));

      cursor.continue();
    }
    return removedPaths;
  }

  /**
   * ワークスペースの全ファイルを削除する
   */
  async removeAllFiles() {
    for await (const cursor of this.fileStore
      .index('path')
      .openCursor(IDBKeyRange.lowerBound(this.workspace))) {
      const fileData = cursor.value;
      if (!fileData.path.startsWith(this.workspace)) break;

      cursor.delete();

      cursor.continue();
    }
  }

  /**
   * ファイルを移動する
   * @param oldPath
   * @param newPath
   * @return movedPaths 実際に移動したpathのリスト
   */
  async moveFile(oldPath, newPath) {
    const movedPaths = [];
    for await (const cursor of this.fileStore
      .index('path')
      .openCursor(IDBKeyRange.lowerBound(this.workspace + oldPath))) {
      const fileData = cursor.value;
      if (!`${fileData.path}/`.startsWith(`${this.workspace}${oldPath}/`))
        break;

      const _prev = fileData.path;
      const _new =
        this.workspace +
        newPath +
        fileData.path.slice((this.workspace + oldPath).length);

      // console.log('mv ' + _prev + ' ' + _new)

      fileData.path = _new;
      if (fileData.file) {
        const prevType = this.getFileType(_prev);
        const newType = this.getFileType(_new);
        if (prevType !== newType) {
          fileData.file = new Blob([fileData.file], { type: newType });
          fileData.srcFile = null;
        }
      }
      cursor.update(fileData);

      movedPaths.push([
        _prev.slice(this.workspace.length),
        _new.slice(this.workspace.length),
        fileData,
      ]);

      cursor.continue();
    }
    return movedPaths;
  }

  /**
   * ファイルを保存する
   * @param path
   * @param file
   */
  async putFile(path, file, distFile = null) {
    for await (const cursor of this.fileStore
      .index('path')
      .openCursor(IDBKeyRange.only(this.workspace + path))) {
      const fileData = cursor.value;

      fileData.file = file;
      fileData.distFile = distFile;
      cursor.update(fileData);

      cursor.continue();
    }
  }

  /**
   * ファイルを取得する
   * @param path
   * @return file
   */
  async getFile(path, isSrc = false) {
    const result = await this.fileStore
      .index('path')
      .get(this.workspace + path);
    return (!isSrc && result?.distFile) || result?.file;
  }

  /**
   * ワークスペースの設定を保存する
   * @param setting
   */
  async putWorkSpaceSetting(setting) {
    for await (const cursor of this.fileStore
      .index('path')
      .openCursor(IDBKeyRange.only(this.workspace.slice(0, -1)))) {
      const fileData = cursor.value;

      fileData.setting = setting;
      cursor.update(fileData);

      cursor.continue();
    }
  }

  /**
   * ワークスペースの設定を取得する
   * @return setting
   */
  async getWorkSpaceSetting() {
    const project = await this.fileStore
      .index('path')
      .get(this.workspace.slice(0, -1));
    return this.createDefaultSetting(project?.setting);
  }

  /**
   * ワークスペースのデフォルト設定を取得する
   * @return setting
   */
  createDefaultSetting(setting) {
    return {
      fileName: '',
      password: '',
      tabs: [],
      currentTab: null,
      ...setting,
    };
  }

  /**
   * ファイル名からMIMEタイプを取得
   * @param {string} name - ファイル名
   * @return {string|null} - MIMEタイプ
   * TODO: sw.jsと共通化
   */
  getFileType(name) {
    const ext = name.slice(name.lastIndexOf('.') + 1);
    return (
      {
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
        md: 'text/markdown',
      }[ext] || null
    );
  }
}
