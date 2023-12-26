import TElement from './TElement.mjs'
import style from '../style.mjs'
import hold, { getPageCoordinate } from '../hold.mjs'

const ukey = 't-component-ui-splitter'

style(`
  .${ukey} {
    z-index: 1;
    background: #CCC;
    cursor: w-resize;
    width: 1px;
  }
  .${ukey}::after {
    content: "";
    display: block;
    /*background: yellow;*/
    width: 9px;
    height: 100%;
    position: relative;
    left: -4px;
  }
  .${ukey}.holding::after {
    /*background: blue;*/
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
`)

export default class TSplitter extends TElement {
  template () {
    this.tagName = 't-splitter'
    this.attrDef = [
      { name: 'ondrag', type: 'function' },
      { name: 'position', type: 'string' }
    ]
    return `
      <div class="${ukey}" ontouchstart="return this.handleSplitter(event)" onmousedown="return this.handleSplitter(event)"></div>
    `
  }

  handleSplitter (event) {
    event.preventDefault()
    let target; let m = 1
    if (this.position === 'right') {
      target = this.element.nextElementSibling
      m = -1
    } else {
      target = this.element.previousElementSibling
    }
    const [px] = getPageCoordinate(event)
    const ox = px * m - window.getComputedStyle(target).width.slice(0, -2)
    this.element.classList.add('holding')
    hold({
      cursor: window.getComputedStyle(event.target).cursor,
      ondrag: px => {
        target.style.width = Math.max(0, px * m - ox) + 'px'
        if (this.ondrag) this.ondrag()
      },
      ondragend: () => {
        this.element.classList.remove('holding')
      }
    })
  }
}
