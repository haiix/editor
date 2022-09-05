/*
 * This widget uses Material Icons.
 * Please import as follows:
 * <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
 */

import TElement from './TElement.mjs'
import style from '../style.mjs'

const CLASS_NAME = 't-component-ui-tree'

style(`
  .${CLASS_NAME} {
    cursor: default;
    outline: none;
    overflow: auto;
    background: #FFF;
    color: #000;
    user-select: none;
    box-sizing: border-box;
  }
  .${CLASS_NAME} ul {
    margin: 0;
    padding: 0;
    list-style-type: none;
    min-width: max-content;
  }
  .${CLASS_NAME} li > div {
    white-space: nowrap;
    height: 24px;
    line-height: 0;
  }
  .${CLASS_NAME} li > div > * {
    vertical-align: middle;
  }
  .${CLASS_NAME} li > div:first-child::before {
    content: "";
    display: inline-block;
    height: 100%;
    vertical-align: middle;
  }
  .${CLASS_NAME} li > div:hover {
    background: #DEF;
  }
  .${CLASS_NAME} li.current > div {
    background: #DDD;
  }
  .${CLASS_NAME}:focus li.current > div {
    background: #BDF;
  }
  .${CLASS_NAME} .expand-icon {
    display: inline-block;
    margin-right: 2px;
    font-size: 18px;
    color: #666;
    opacity: 0;
    transition: opacity .5s;
  }
  .${CLASS_NAME}:focus .expand-icon,
  .${CLASS_NAME}:hover .expand-icon {
    opacity: 1;
  }
  .${CLASS_NAME} .expand-icon:hover {
    color: #3CF;
  }
  .${CLASS_NAME} .icon {
    display: inline-block;
    margin-right: 4px;
    font-size: 18px;
  }
`)

class TTreeBase extends TElement {
  get textContent () {
    return super.textContent()
  }

  set textContent (value) {
    if (value !== '') throw new Error('Only empty string can be set.')
    this.client.textContent = ''
    this.current = null
  }

  appendChild (item) {
    return this.insertBefore(item, null)
  }

  insertBefore (item, ref = null) {
    item = TElement.from(item) ?? item
    if (!(item instanceof TTreeItem)) throw new Error('The object is not a tree item.')
    super.insertBefore(item, ref)
    const indent = this._getIndent()
    if (!Number.isNaN(indent)) item._setIndent(indent + 1)
    return item
  }

  removeChild (item) {
    if (item.parentNode !== this) throw new Error('The object is not a child of this node.')
    const tree = this.getRootNode()
    if (tree.current && item.contains(tree.current)) {
      tree.current = item.nextSibling ?? item.previousSibling ?? (this instanceof TTreeItem ? this : null)
    }
    super.removeChild(item)
  }
}

class TTreeItem extends TTreeBase {
  template () {
    this.tagName = 't-tree-item'
    this.attrDef = [
      { name: 'text', type: 'string' },
      { name: 'icon', type: 'string', default: 'folder' },
      { name: 'iconColor', type: 'string', default: '#FC9' },
      { name: 'isExpandable', type: 'boolean', default: true }
    ]
    return `
      <li>
        <div id="_container">
          <i id="_expandIcon" class="material-icons expand-icon"></i>
          <i id="_icon" class="material-icons icon"></i>
          <span id="_text"></span>
        </div>
        <ul id="client" style="display: none;"></ul>
      </li>
    `
  }

  get text () {
    return this._text.textContent
  }

  set text (v) {
    this._text.textContent = v
  }

  get html () {
    return this._text.innerHTML
  }

  set html (v) {
    this._text.innerHTML = v
  }

  get icon () {
    return this._icon.textContent
  }

  set icon (v) {
    this._icon.textContent = v
  }

  get iconColor () {
    return this._icon.style.color
  }

  set iconColor (v) {
    this._icon.style.color = v
  }

  get parentNode () {
    return TElement.from(this.element.parentNode.parentNode)
  }

  async expand () {
    if (!this.isExpandable || this.isExpanded) return
    const root = this.getRootNode()
    if (root.onexpand) {
      if (this._expandIcon.textContent === 'autorenew') return
      this._expandIcon.textContent = 'autorenew'
      const event = new window.CustomEvent('expand', { detail: this })
      try {
        await root.onexpand(event)
      } catch (error) {
        this._expandIcon.textContent = 'chevron_right'
        throw error
      }
    }
    this._expandIcon.textContent = 'expand_more'
    this.client.style.display = ''
    this.element.classList.add('expanded')
  }

  async collapse () {
    if (!this.isExpanded) return
    const root = this.getRootNode()
    if (root.oncollapse) {
      if (this._expandIcon.textContent === 'autorenew') return
      this._expandIcon.textContent = 'autorenew'
      const event = new window.CustomEvent('collapse', { detail: this })
      await root.oncollapse(event)
    }
    this._expandIcon.textContent = 'chevron_right'
    this.client.style.display = 'none'
    this.classList.remove('expanded')
    const tree = this.getRootNode()
    if (tree.current && this.contains(tree.current)) {
      tree.current = this
    }
  }

  get isExpanded () {
    return this.client.style.display !== 'none'
  }

  get isExpandable () {
    return this._expandIcon.textContent !== '_'
  }

  set isExpandable (b) {
    if (b) {
      this._expandIcon.textContent = 'chevron_right'
    } else {
      this._expandIcon.textContent = '_'
      this.client.style.display = 'none'
    }
  }

  getRootNode () {
    let curr = this
    while (curr instanceof TTreeItem) {
      curr = curr.parentNode
    }
    return curr instanceof TTree ? curr : null
  }

  getPath () {
    const path = []
    let curr = this
    while (curr instanceof TTreeItem) {
      path.unshift(curr)
      curr = curr.parentNode
    }
    return path
  }

  _setIndent (v) {
    this._container.style.paddingLeft = v + 'em'
    for (const item of this) item._setIndent(v + 1)
  }

  _getIndent () {
    const paddingLeft = this._container.style.paddingLeft
    if (paddingLeft === '') return NaN
    return paddingLeft.slice(0, -2) >> 0
  }
}

class TTree extends TTreeBase {
  template () {
    this.tagName = 't-tree'
    this.attrDef = [
      { name: 'onexpand', type: 'function' },
      { name: 'oncollapse', type: 'function' },
      { name: 'ontouchstart', type: 'function' },
      { name: 'onmousedown', type: 'function' },
      { name: 'onkeydown', type: 'function' }
    ]
    return `
      <div id="_tree" tabindex="0" class="${CLASS_NAME}"
        ontouchstart="return this._handleTreeMousedown(event)"
        onmousedown="return this._handleTreeMousedown(event)"
        onkeydown="return this._handleTreeKeydown(event)"
      >
        <ul id="client"></ul>
      </div>
    `
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    this._lastCurrent = null
  }

  getRootNode () {
    return this
  }

  _getIndent () {
    return -1
  }

  get current () {
    if (!this._lastCurrent?.classList.contains('current')) {
      this._lastCurrent = TElement.from(this._tree.querySelector('.current'))
    }
    return this._lastCurrent
  }

  set current (item) {
    if (!(item instanceof TTreeItem) && item != null) throw new Error('The object is not a tree item.')
    if (this._lastCurrent === item) return
    if (this._lastCurrent != null) this._lastCurrent.classList.remove('current')
    this._lastCurrent = item
    if (item) {
      item.classList.add('current')
      item._container.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    this._tree.dispatchEvent(new window.CustomEvent('change', { detail: item }))
  }

  focus () {
    this._tree.focus()
  }

  async _handleTreeMousedown (event) {
    if (typeof this.ontouchstart === 'function') {
      const result = this.ontouchstart(event)
      if (result === false || event.defaultPrevented) return
    }
    if (typeof this.onmousedown === 'function') {
      const result = this.onmousedown(event)
      if (result === false || event.defaultPrevented) return
    }

    let elem = event.target
    while (elem.tagName !== 'LI') {
      if (elem === this._tree) return
      elem = elem.parentNode
    }
    const item = TElement.from(elem)

    if (event.target === item._expandIcon && item.isExpandable) {
      if (event.type === 'touchstart' || event.button === 0) {
        if (item.isExpanded) {
          await item.collapse()
        } else {
          await item.expand()
        }
      }
    } else {
      if (event.button !== 1) {
        this.current = item
      }
    }
  }

  async _handleTreeKeydown (event) {
    if (typeof this.onkeydown === 'function') {
      const result = this.onkeydown(event)
      if (result === false || event.defaultPrevented) return
    }

    if (!this.current) return
    switch (event.keyCode) {
      case 8: // Back Space
        event.preventDefault()
        if (this.current.parentNode !== this) {
          this.current = this.current.parentNode
        }
        break
      case 37: // Left
        event.preventDefault()
        if (this.current.isExpanded) {
          await this.current.collapse()
        } else {
          if (this.current.parentNode !== this) {
            this.current = this.current.parentNode
          }
        }
        break
      case 38: // Up
        event.preventDefault()
        if (this.current.previousSibling) {
          let item = this.current.previousSibling
          while (item.isExpanded && item.lastChild) {
            item = item.lastChild
          }
          this.current = item
        } else {
          if (this.current.parentNode !== this) {
            this.current = this.current.parentNode
          }
        }
        break
      case 39: // Right
        event.preventDefault()
        if (this.current.isExpandable && !this.current.isExpanded) {
          await this.current.expand()
        } else {
          if (this.current.firstChild) {
            this.current = this.current.firstChild
          }
        }
        break
      case 40: // Down
        event.preventDefault()
        if (this.current.isExpanded && this.current.firstChild) {
          this.current = this.current.firstChild
        } else {
          let item = this.current
          while (item !== this && !item.nextSibling) {
            item = item.parentNode
          }
          if (item !== this) {
            this.current = item.nextSibling
          }
        }
        break
    }
  }
}
TTree.Item = TTreeItem

export default TTree
