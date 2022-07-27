import TElement from './TElement.mjs'
import style from '../style.mjs'
import hold, { getPageCoordinate } from '../hold.mjs'

const ukey = 't-component-ui-splitter'

style(`
  .${ukey} {
    z-index: 4;
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
`)

export default class TSplitter extends TElement {
  template () {
    this.tagName = 't-splitter'
    this.attrDef = [
      { name: 'ondrag', type: 'function' }
    ]
    return `
      <div class="${ukey}" ontouchstart="return this.handleSplitter(event)" onmousedown="return this.handleSplitter(event)"></div>
    `
  }

  handleSplitter (event) {
    event.preventDefault()
    const target = this.element.previousElementSibling
    const [px] = getPageCoordinate(event)
    const ox = px - window.getComputedStyle(target).width.slice(0, -2)
    hold({
      cursor: window.getComputedStyle(event.target).cursor,
      ondrag: px => {
        target.style.width = Math.max(0, px - ox) + 'px'
        if (this.ondrag) this.ondrag()
      }
    })
  }
}
