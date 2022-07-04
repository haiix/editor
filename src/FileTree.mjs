import seq from '@haiix/seq'
import Tree from './assets/ui/Tree.mjs'

export default class FileTree extends Tree {
  template () {
    const t = super.template()
    this.tagName = 'file-tree'
    return t
  }

  update (folders, files) {
    this.textContent = ''
    for (const fileData of [...folders, ...files]) {
      const [folder, fileName] = this.getFolderAndName(fileData.path)
      const item = this.createItem(fileName, !fileData.file)
      folder.appendChild(item)
    }
  }

  createItem (name, isFolder) {
    const item = new Tree.Item()
    item.text = name
    if (!isFolder) {
      item.isExpandable = false
      item.icon = 'insert_drive_file'
      item.iconColor = '#CCC'
    }
    return item
  }

  insert (parentFolder, targetItem) {
    const fileName = targetItem.text
    const ref = seq(parentFolder).find(item => (
      targetItem.isExpandable
        ? (!item.isExpandable || item.text > fileName)
        : (!item.isExpandable && item.text > fileName)
    ))
    parentFolder.insertBefore(targetItem, ref)
    return targetItem
  }

  addFile (fileDataList) {
    let item = null
    for (const fileData of fileDataList) {
      const [folder, name] = this.getFolderAndName(fileData.path)
      item = this.createItem(name, !fileData.file)
      this.insert(folder, item)
    }
    if (item) this.current = item
  }

  remove (path) {
    const item = this.getItem(path)
    item.parentNode.removeChild(item)
  }

  move (oldPath, newPath) {
    const [folder, name] = this.getFolderAndName(newPath)
    const item = this.getItem(oldPath)
    item.text = name
    this.insert(folder, item)
    if (folder !== this) folder.expand()
  }

  /**
   * パスから親フォルダー項目と名前を取得
   * @param {string} path - パス
   * @return {TreeItem} - 親フォルダー
   * @return {string} - ファイル名
   */
  getFolderAndName (path) {
    const folderPath = path.split('/')
    const name = folderPath.pop()
    const folder = this.getItem(folderPath.join('/')) || this
    return [folder, name]
  }

  /**
   * パスからファイルツリー項目を取得
   * @param {string} path - パス
   * @return {TreeItem} - ツリー項目
   */
  getItem (path) {
    if (!path) return this
    return path.split('/').reduce((item, name) =>
      seq(item).find(
        cItem => cItem.text === name) ||
        this.insert(item, this.createItem(name, true)
        )
    , this)
  }

  /**
   * ファイルツリーで現在選択されているファイルのパスを取得
   */
  getPath (current = this.current) {
    const path = []
    while (current !== this) {
      path.unshift(current.text)
      current = current.parentNode
    }
    return path.join('/')
  }

  /**
   * ファイルツリーで現在選択されているファイルの親フォルダーパスを取得
   * (選択されているのがフォルダーなら自身のパス)
   */
  getFolderPath (item = this.current) {
    if (!item) return ''
    if (item.isExpandable === false) item = item.parentNode
    let path = this.getPath(item)
    if (path !== '') path = path + '/'
    return path
  }
}
