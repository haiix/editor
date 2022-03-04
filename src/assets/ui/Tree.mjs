/*
 * This widget uses Material Icons.
 * Please import as follows:
 * <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
 */

import TComponent from '../TComponent.mjs'
import style from '../style.mjs'
// import * as customEventPolyfill from 'custom-event-polyfill'

const CLASS_NAME = 't-component-ui-tree'

style(`
  .${CLASS_NAME} {
    cursor: default;
    outline: none;
    overflow: auto;
    background: #FFF;
    color: #000;
    user-select: none;
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

class TreeBase extends TComponent {
  set textContent (value) {
    if (value !== '') throw new Error('Only empty string can be set.')
    this._list.textContent = ''
    this.current = null
  }

  get textContent () {
    return this.element.textContent
  }

  get firstChild () {
    return TComponent.from(this._list.firstChild)
  }

  get lastChild () {
    return TComponent.from(this._list.lastChild)
  }

  appendChild (item) {
    return this.insertBefore(item, null)
  }

  insertBefore (item, ref = null) {
    if (!(item instanceof TreeItem)) throw new Error('The object is not a tree item.')
    this._list.insertBefore(item._item, ref ? ref._item : null)
    const indent = this._getIndent()
    if (!Number.isNaN(indent)) item._setIndent(indent + 1)
    return item
  }

  removeChild (item) {
    if (item.parentNode !== this) throw new Error('The object is not a child of this node.')
    const tree = this.getRootNode()
    if (tree.current && item._item.contains(tree.current._item)) {
      tree.current = item.nextSibling || item.previousSibling || this
    }
    this._list.removeChild(item.element)
  }

  get childElementCount () {
    return this._list.childElementCount
  }

  * [Symbol.iterator] () {
    let elem = this._list.firstChild
    while (elem) {
      yield TComponent.from(elem)
      elem = elem.nextSibling
    }
  }
}

class TreeItem extends TreeBase {
  template () {
    this.tagName = 'ui-tree-item'
    return `
      <li id="_item">
        <div id="_container">
          <i id="_expandIcon" class="material-icons expand-icon">chevron_right</i>
          <i id="_icon" class="material-icons icon" style="color: #FC9;">folder</i>
          <span id="_text"></span>
        </div>
        <ul id="_list" style="display: none;"></ul>
      </li>
    `
  }

  set text (v) {
    this._text.textContent = v
  }

  get text () {
    return this._text.textContent
  }

  set html (v) {
    this._text.innerHTML = v
  }

  get html () {
    return this._text.innerHTML
  }

  set icon (v) {
    this._icon.textContent = v
  }

  get icon () {
    return this._icon.textContent
  }

  set iconColor (v) {
    this._icon.style.color = v
  }

  get iconColor () {
    return this._icon.style.color
  }

  get parentNode () {
    return TComponent.from(this._item.parentNode.parentNode)
  }

  get previousSibling () {
    return TComponent.from(this._item.previousSibling)
  }

  get nextSibling () {
    return TComponent.from(this._item.nextSibling)
  }

  async expand () {
    const root = this.getRootNode()
    if (root.onexpand) {
      this._expandIcon.textContent = 'autorenew'
      const event = new window.CustomEvent('expand', { detail: this })
      await root.onexpand(event)
    }
    this._expandIcon.textContent = 'expand_more'
    this._list.style.display = ''
    this._item.classList.add('expanded')
  }

  async collapse () {
    const root = this.getRootNode()
    if (root.oncollapse) {
      this._expandIcon.textContent = 'autorenew'
      const event = new window.CustomEvent('collapse', { detail: this })
      await root.oncollapse(event)
    }
    this._expandIcon.textContent = 'chevron_right'
    this._list.style.display = 'none'
    this._item.classList.remove('expanded')
    const tree = this.getRootNode()
    if (tree.current && this._item.contains(tree.current._item)) {
      tree.current = this
    }
  }

  get isExpanded () {
    return this._list.style.display !== 'none'
  }

  set isExpandable (b) {
    if (b) {
      this._expandIcon.textContent = 'chevron_right'
    } else {
      this._expandIcon.textContent = '_'
      this._list.style.display = 'none'
    }
  }

  get isExpandable () {
    return this._expandIcon.textContent !== '_'
  }

  getRootNode () {
    let curr = this
    while (curr instanceof TreeItem) {
      curr = curr.parentNode
    }
    return curr instanceof Tree ? curr : null
  }

  getPath () {
    const path = []
    let curr = this
    while (curr instanceof TreeItem) {
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

export default class Tree extends TreeBase {
  template () {
    this.tagName = 'ui-tree'
    return `
      <div id="_tree" tabindex="0"
        onmousedown="this._handleTreeMousedown(event)"
        onkeydown="this._handleTreeKeydown(event)"
      >
        <ul id="_list"></ul>
      </div>
    `
  }

  constructor (attr, nodes) {
    super()

    this.current = null
    this.onexpand = null
    this.oncollapse = null
    this.onmousedown = null
    this.onkeydown = null

    for (const [key, value] of Object.entries(attr)) {
      if (typeof value === 'string') {
        this._tree.setAttribute(key, value)
      } else if (key.slice(0, 2) === 'on' && key !== 'onexpand' && key !== 'oncollapse' && key !== 'onmousedown' && key !== 'onkeydown') {
        this._tree[key] = value
      } else {
        this[key] = value
      }
    }

    this._tree.classList.add(CLASS_NAME)
  }

  getRootNode () {
    return this
  }

  _getIndent () {
    return -1
  }

  set current (item) {
    if (!(item instanceof TreeItem) && item != null) throw new Error('The object is not a tree item.')
    if (this._lastCurrent === item) return
    if (this._lastCurrent != null) this._lastCurrent._item.classList.remove('current')
    this._lastCurrent = item
    if (item) {
      item._item.classList.add('current')
      item._container.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    this._list.dispatchEvent(new window.CustomEvent('change', { detail: item }))
  }

  get current () {
    if (this._lastCurrent == null || !this._lastCurrent._item.classList.contains('current')) {
      this._lastCurrent = TComponent.from(this._tree.querySelector('.current'))
    }
    return this._lastCurrent
  }

  focus () {
    this._tree.focus()
  }

  async _handleTreeMousedown (event) {
    if (typeof this.onmousedown === 'function') {
      const result = this.onmousedown(event)
      if (result === false || event.defaultPrevented) return
    }

    let elem = event.target
    while (elem.tagName !== 'LI') {
      if (elem === this._tree) return
      elem = elem.parentNode
    }
    const item = TComponent.from(elem)

    if (event.target === item._expandIcon && item.isExpandable) {
      if (event.button === 0) {
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
        if (this.current._item.previousSibling) {
          let item = TComponent.from(this.current._item.previousSibling)
          while (item.isExpanded && item._list.lastChild) {
            item = TComponent.from(item._list.lastChild)
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
          if (this.current._list.firstChild) {
            this.current = TComponent.from(this.current._list.firstChild)
          }
        }
        break
      case 40: // Down
        event.preventDefault()
        if (this.current.isExpanded && this.current._list.firstChild) {
          this.current = TComponent.from(this.current._list.firstChild)
        } else {
          let item = this.current
          while (item !== this && !item._item.nextSibling) {
            item = item.parentNode
          }
          if (item !== this) {
            this.current = TComponent.from(item._item.nextSibling)
          }
        }
        break
    }
  }
}
Tree.Item = TreeItem
