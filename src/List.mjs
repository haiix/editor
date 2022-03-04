import TComponent from './assets/TComponent.mjs'
import seq from './assets/seq.mjs'
// import * as customEventPolyfill from 'custom-event-polyfill'

export class TUl extends TComponent {
  template () {
    this.tagName = 't-ul'
    return '<ul></ul>'
  }

  constructor (attr = {}, nodes = []) {
    super()
    for (const node of nodes) {
      let li = node
      if (!(node instanceof HTMLLIElement)) {
        li = document.createElement('li')
        li.appendChild(node)
      }
      this.element.appendChild(li)
      if (TComponent.from(li) == null) li = new TLi({}, li)
    }
    for (const [key, value] of Object.entries(attr)) {
      if (key === 'disabled') {
        this[key] = value === key || value === true
      } else if (typeof value === 'function') {
        this.element[key] = value
      } else {
        this.element.setAttribute(key, value)
      }
    }
    this._current = this.items.find(item => item.current)
    this.element.addEventListener('mousedown', this._handleMouseDown.bind(this))
  }

  set items (items) {
    this.element.textContent = ''
    for (const item of items) {
      if (!(item instanceof TLi)) throw new Error('Invalid')
      this.element.appendChild(item.element)
    }
  }

  get items () {
    return seq(this.element.childNodes).map(node => TComponent.from(node))
  }

  get (value) {
    return this.items.find(node => node.value === value)
  }

  set current (item) {
    if (item != null) {
      if (this.items.indexOf(item) < 0 || this.current === item) return
      item.current = true
    }
    if (this.current) this.current.current = false
    this._current = item
    this.element.dispatchEvent(new CustomEvent('change', { detail: item }))
  }

  get current () {
    return this._current
  }

  set value (v) {
    this.current = this.items.find(item => item.value === v)
  }

  get value () {
    return this.current == null ? '' : this.current.value
  }

  set disabled (v) {
    if (v) {
      this.element.classList.add('disabled')
    } else {
      this.element.classList.remove('disabled')
    }
  }

  get disabled () {
    return this.element.classList.contains('disabled')
  }

  _handleMouseDown (event) {
    if (event.defaultPrevented || this.disabled || event.button !== 0) return
    const item = this.items.find(item => item.element.contains(event.target))
    if (!item) return
    event.stopPropagation()
    if (this.current === item || item.disabled) return
    this.current = item
  }

  [Symbol.iterator] () {
    return seq(this.element.children).map(elem => TComponent.from(elem))[Symbol.iterator]()
  }
}

export class TLi extends TComponent {
  template () {
    this.tagName = 't-li'
    return '<li></li>'
  }

  constructor (attr = {}, nodes = []) {
    super()
    for (const node of nodes) {
      this.element.appendChild(node)
    }
    this.value = (attr.value || '') + ''
    for (const [key, value] of Object.entries(attr)) {
      if (key === 'value') {
        continue
      } else if (key === 'disabled' || key === 'current' || key === 'selected') {
        this[key] = value === key || value === true
      } else if (typeof value === 'function') {
        this.element[key] = value
      } else {
        this.element.setAttribute(key, value)
      }
    }
  }

  set disabled (v) {
    if (v) {
      this.element.classList.add('disabled')
    } else {
      this.element.classList.remove('disabled')
    }
  }

  get disabled () {
    return this.element.classList.contains('disabled')
  }

  set current (v) {
    if (v) {
      this.element.classList.add('current')
    } else {
      this.element.classList.remove('current')
    }
  }

  get current () {
    return this.element.classList.contains('current')
  }

  set selected (v) {
    if (v) {
      this.element.classList.add('selected')
    } else {
      this.element.classList.remove('selected')
    }
  }

  get selected () {
    return this.element.classList.contains('selected')
  }
}
