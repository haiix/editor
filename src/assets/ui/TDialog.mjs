import TElement from './TElement.mjs'
import style from '../style.mjs'
import { isTabbable, nextTabbable, previousTabbable } from '../focus.mjs'

const ukey = 't-component-ui-dialog'

style(`
  .${ukey} {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    outline: none;
  }
  .${ukey}-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
  }
  .${ukey}-container {
    background: #FFF;
    border: 1px solid #999;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-flow: column nowrap;
    color: #000;
    background: #FFF;
  }
  .${ukey}-title {
    flex: none;
    padding: 4px;
    color: #000;
    background: #EEE;
  }
  .${ukey}-body {
    flex: auto;
    padding: 10px;
  }
  .${ukey}-buttons {
    flex: none;
    display: flex;
    justify-content: flex-end;
    padding: 0 5px;
  }
  .${ukey}-buttons > button {
    width: 75px;
    margin: 5px;
    white-space: nowrap;
  }
`)

export default class TDialog extends TElement {
  static create (DialogClass) {
    return async function (...args) {
      await new Promise(resolve => window.requestAnimationFrame(resolve)) // keydownイベントが連続実行されるのを防ぐ
      const lastFocused = document.activeElement
      let dialog
      let tabHandler = null
      const result = await new Promise(resolve => {
        dialog = new DialogClass(Object.assign({ resolve }, { arguments: args }))
        document.body.appendChild(dialog.element)
        const firstElem = nextTabbable(null, dialog.element)
        if (firstElem) {
          const lastElem = previousTabbable(null, dialog.element)
          tabHandler = TElement.createElement('<div style="position: absolute; overflow: hidden; width: 0;"><input onfocus="this.handleFocus(event)" tabindex="1" /></div>', {
            handleFocus (event) {
              firstElem.focus()
            }
          })
          document.body.insertBefore(tabHandler, document.body.firstChild)
          dialog.element.addEventListener('keydown', event => {
            if (event.keyCode === 9 && event.ctrlKey === false && event.altKey === false) {
              const f = isTabbable(event.target)
              if (event.shiftKey && (!f || event.target === firstElem)) {
                event.preventDefault()
                lastElem.focus()
              } else if (!event.shiftKey && (!f || event.target === lastElem)) {
                event.preventDefault()
                firstElem.focus()
              }
            }
          })
          firstElem.focus()
          if (firstElem instanceof window.HTMLInputElement) firstElem.select()
        }
        if (dialog.main) dialog.main()
      })
      document.body.removeChild(dialog.element)
      if (tabHandler) document.body.removeChild(tabHandler)
      lastFocused.focus()
      await new Promise(resolve => window.requestAnimationFrame(resolve)) // keydownイベントが連続実行されるのを防ぐ
      return result
    }
  }

  template () {
    this.tagName = 't-dialog'
    return `
      <div class="${ukey}" onkeydown="this.handleKeyDown(event)" tabindex="-1">
        <div class="${ukey}-background"></div>
        <div class="${ukey}-container">
          <div id="title" class="${ukey}-title">${this.titleTemplate()}</div>
          <div id="body" class="${ukey}-body">${this.bodyTemplate()}</div>
          <div id="buttons" class="${ukey}-buttons">${this.buttonsTemplate()}</div>
        </div>
      </div>
    `
  }

  titleTemplate () {
    return ''
  }

  bodyTemplate () {
    return ''
  }

  buttonsTemplate () {
    return ''
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    this.resolve = attr.resolve
  }

  handleOK (event) {
    this.resolve(null)
  }

  handleCancel (event) {
    this.resolve(null)
  }

  handleKeyDown (event) {
    event.stopPropagation()
    let elem = document.activeElement
    switch (event.keyCode) {
      case 13: // Enter
        if (event.target.tagName !== 'BUTTON' && typeof this.handleOK === 'function') {
          this.handleOK(event)
        }
        break
      case 27: // Esc
        if (typeof this.handleCancel === 'function') {
          this.handleCancel(event)
        }
        break
      case 37: // Left
      case 38: // Up
        if (elem.tagName === 'BUTTON' && this.buttons.contains(elem)) {
          elem = previousTabbable(elem, this.buttons)
          if (!elem) elem = previousTabbable(elem, this.buttons)
          if (elem) elem.focus()
        }
        break
      case 39: // Right
      case 40: // Bottom
        if (elem.tagName === 'BUTTON' && this.buttons.contains(elem)) {
          elem = nextTabbable(elem, this.buttons)
          if (!elem) elem = nextTabbable(elem, this.buttons)
          if (elem) elem.focus()
        }
        break
    }
  }
}

export class Alert extends TDialog {
  bodyTemplate () {
    return `
      <p id="text" style="white-space: pre-wrap;"></p>
    `
  }

  buttonsTemplate () {
    return `
      <button id="okButton" onclick="return this.handleOK(event)">OK</button>
    `
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    const [text = '', title = '情報'] = attr.arguments
    this.title.textContent = title
    this.text.textContent = text
  }
}

export const alert = TDialog.create(Alert)

export class Confirm extends TDialog {
  bodyTemplate () {
    return `
      <p id="text" style="white-space: pre-wrap;"></p>
    `
  }

  buttonsTemplate () {
    return `
      <button id="okButton" onclick="return this.handleOK(event)">はい</button>
      <button onclick="return this.handleCancel(event)">いいえ</button>
    `
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    const [text = '', title = '確認'] = attr.arguments
    this.title.textContent = title
    this.text.textContent = text
  }

  handleOK (event) {
    this.resolve(true)
  }

  handleCancel (event) {
    this.resolve(false)
  }
}

export const confirm = TDialog.create(Confirm)

export class Prompt extends TDialog {
  bodyTemplate () {
    return `
      <form onsubmit="event.preventDefault()">
        <p id="text" style="white-space: pre-wrap;"></p>
        <input id="input" />
      </form>
    `
  }

  buttonsTemplate () {
    return `
      <button onclick="return this.handleOK(event)">OK</button>
      <button onclick="return this.handleCancel(event)">キャンセル</button>
    `
  }

  constructor (attr = {}, nodes = []) {
    super(attr, nodes)
    const [text = '', value = '', title = '入力'] = attr.arguments
    this.title.textContent = title
    this.text.textContent = text
    this.input.value = value
  }

  handleOK (event) {
    this.resolve(this.input.value)
  }
}

export const prompt = TDialog.create(Prompt)

export async function openFile (accept = '', multiple = false) {
  return await new Promise(resolve => {
    const input = TElement.createElement(`<input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} hidden />`)
    input.onchange = event => {
      resolve(multiple ? input.files : input.files[0])
    }
    window.addEventListener('focus', function callee (event) {
      window.removeEventListener('focus', callee)
      setTimeout(resolve, 1000, null)
    })
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  })
}
