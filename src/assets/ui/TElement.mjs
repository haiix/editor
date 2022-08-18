import TComponent from '@haiix/tcomponent'

export function getAttrString (attr, name, defaultValue = '') {
  return (attr[name] ?? defaultValue) + ''
}

export function getAttrBoolean (attr, name, defaultValue = false) {
  return attr[name] != null ? (attr[name] === name || attr[name] === true) : defaultValue
}

export function getAttrFunction (attr, name) {
  return typeof attr[name] === 'function' ? attr[name] : null
}

export function initAttrs (telem, attr, vals = []) {
  for (const val of vals) {
    switch (val.type) {
      case 'string':
        telem[val.name] = getAttrString(attr, val.name, val.default)
        break
      case 'boolean':
        telem[val.name] = getAttrBoolean(attr, val.name, val.default)
        break
      case 'function':
        telem[val.name] = getAttrFunction(attr, val.name)
        break
      default:
        throw new Error('Undefied type: ' + val.type)
    }
  }
  for (const [name, value] of Object.entries(attr)) {
    if (vals.find(val => val.name === name)) continue
    if (typeof value === 'function') {
      telem.element[name] = value
    } else if (name === 'class' || name === 'style') {
      const ta = telem.getAttribute(name)
      const de = name === 'class' ? ' ' : ';'
      telem.setAttribute(name, ta == null ? value : ta + de + value)
    } else {
      telem.setAttribute(name, value)
    }
  }
}

function toc (elem) {
  return TComponent.from(elem) ?? elem
}

export default class TElement extends TComponent {
  template () {
    this.tagName = 't-element'
    this.attrDef = null
    return `
      <div id='client'></div>
    `
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    initAttrs(this, attr, this.attrDef)
    this.client = this.client ?? this.element
    for (const node of nodes) {
      this.appendChild(node)
    }
  }

  get textContent () {
    return this.client.textContent
  }

  set textContent (v) {
    this.client.textContent = v
  }

  get innerHTML () {
    return this.client.innerHTML
  }

  set innerHTML (v) {
    this.client.innerHTML = v
  }

  get parentNode () {
    return toc(this.element.parentNode)
  }

  get childNodes () {
    return [...this]
  }

  get childElementCount () {
    return this.client.childElementCount
  }

  get firstChild () {
    return toc(this.client.firstChild)
  }

  get lastChild () {
    return toc(this.client.lastChild)
  }

  get previousSibling () {
    return toc(this.element.previousSibling)
  }

  get nextSibling () {
    return toc(this.element.nextSibling)
  }

  get classList () {
    return this.element.classList
  }

  get style () {
    return this.element.style
  }

  appendChild (child) {
    return this.client.appendChild(child?.element ?? child)
  }

  removeChild (child) {
    return this.client.removeChild(child?.element ?? child)
  }

  insertBefore (child, ref) {
    return this.client.insertBefore(child?.element ?? child, ref?.element ?? ref)
  }

  getAttribute (name) {
    return this.element.getAttribute(name)
  }

  setAttribute (name, value) {
    return this.element.setAttribute(name, value)
  }

  contains (elem) {
    return this.element.contains(elem.element ?? elem)
  }

  addEventListener (type, func, options) {
    return this.element.addEventListener(type, func, options)
  }

  removeEventListener (type, func, options) {
    return this.element.removeEventListener(type, func, options)
  }

  dispatchEvent (event) {
    const retVal = this.element.dispatchEvent(event)
    const fn = 'on' + event.type
    if (typeof this[fn] === 'function') this[fn](event)
    return retVal
  }

  querySelector (...args) {
    return this.client.querySelector(...args)
  }

  querySelectorAll (...args) {
    return this.client.querySelectorAll(...args)
  }

  * [Symbol.iterator] () {
    for (const node of this.client.childNodes) {
      yield toc(node)
    }
  }

  onerror (error) {
    let curr = this.element?.parentNode
    while (curr != null) {
      const te = TElement.from(curr)
      if (typeof te?.onerror === 'function') {
        return te.onerror(error)
      }
      curr = curr.parentNode
    }
    throw error
  }
}
