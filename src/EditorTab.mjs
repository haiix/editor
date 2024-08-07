import TList from './assets/ui/TList.mjs'
import style from './assets/style.mjs'

export default class EditorTab extends TList.Item {
  template () {
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
    `)
    return `
      <li>
        <span id="label" class="label"></span>
        <span id="closeButton" class="material-icons close-button">close</span>
      </li>
    `
  }

  constructor (attr = {}, nodes = []) {
    const sattr = Object.assign({}, attr)
    delete sattr.view
    delete sattr.path
    delete sattr.file
    super(sattr, nodes)
    this.view = attr.view
    this.path = attr.path
    this.file = attr.file
    this.editor = null
  }

  get isModified () {
    return this.classList.contains('modified')
  }

  set isModified (value) {
    if (value) {
      this.classList.add('modified')
    } else {
      this.classList.remove('modified')
    }
  }

  get path () {
    return this.value
  }

  set path (path) {
    this.value = path
    this.label.textContent = this.name
    this.view.value = path
  }

  get name () {
    return this.path.slice(('/' + this.path).lastIndexOf('/'))
  }
}
