import TElement, { initAttrs } from './TElement.mjs'

function createItem (elem) {
  if (elem.element || elem.tagName === 'LI') return elem
  return new TListItem({}, [elem])
}

class TList extends TElement {
  template () {
    this.tagName = 't-list'
    return '<ul id="client" onmousedown="return this._handleMouseDown(event)"></ul>'
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    initAttrs(this, attr, [
      { name: 'name', type: 'string' },
      { name: 'disabled', type: 'boolean' },
      { name: 'onmousedown', type: 'function' }
    ])
    this._current = [...this].find(item => item.current)
  }

  appendChild (child) {
    return super.appendChild(createItem(child))
  }

  insertBefore (child, ref) {
    return super.insertBefore(createItem(child), ref)
  }

  get (v) {
    return [...this].find(item => item.value === v)
  }

  set value (v) {
    this.current = this.get(v)
  }

  get value () {
    return this.current?.value
  }

  set current (item) {
    if (item != null) {
      if ([...this].indexOf(item) < 0 || this._current === item) return
      item.classList.add('current')
    }
    if (this.current) this.current.classList.remove('current')
    this._current = item
    this.dispatchEvent(new window.CustomEvent('change', { detail: item }))
  }

  get current () {
    return this._current
  }

  set disabled (v) {
    if (v) {
      this.classList.add('disabled')
    } else {
      this.classList.remove('disabled')
    }
  }

  get disabled () {
    return this.classList.contains('disabled')
  }

  _handleMouseDown (event) {
    if (this.onmousedown) {
      const retVal = this.onmousedown(event)
      if (retVal === false) return
    }
    if (event.defaultPrevented || this.disabled || event.button !== 0) return
    const item = [...this].find(item => item.contains(event.target))
    if (!item) return
    if (this.current === item || item.disabled) return
    window.requestAnimationFrame(() => {
      this.current = item
    })
  }
}

class TListItem extends TElement {
  template () {
    this.tagName = 't-list-item'
    return '<li id="client"></li>'
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    initAttrs(this, attr, [
      { name: 'value', type: 'string' },
      { name: 'disabled', type: 'boolean' },
      { name: 'current', type: 'boolean' },
      { name: 'selected', type: 'boolean' }
    ])
  }

  set disabled (v) {
    if (v) {
      this.classList.add('disabled')
    } else {
      this.classList.remove('disabled')
    }
  }

  get disabled () {
    return this.classList.contains('disabled')
  }

  set current (v) {
    if (v) {
      this.classList.add('current')
    } else {
      this.classList.remove('current')
    }
  }

  get current () {
    return this.classList.contains('current')
  }

  set selected (v) {
    if (v) {
      this.classList.add('selected')
    } else {
      this.classList.remove('selected')
    }
  }

  get selected () {
    return this.classList.contains('selected')
  }
}

TList.Item = TListItem

export default TList
