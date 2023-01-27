function call (bind, callback, args, onerror) {
  if (!callback) return
  let retVal
  try {
    retVal = callback.apply(bind, args)
  } catch (error) {
    if (onerror) {
      onerror.call(bind, error)
    }
  }
  if (!onerror || retVal == null || typeof retVal.then !== 'function') return
  ;(async function (retVal) {
    try {
      await retVal
    } catch (error) {
      onerror.call(bind, error)
    }
  }(retVal))
}

export function getPageCoordinate (event) {
  const px = event.touches?.[0]?.clientX ?? event.pageX
  const py = event.touches?.[0]?.clientY ?? event.pageY
  return [px, py]
}

export default function hold ({ ondragstart = null, ondrag = null, ondragend = null, onerror = null, cursor = '', bind = null, container = document.body }) {
  let modal = null
  const handleMousemove = event => {
    event.preventDefault()
    const [px, py] = getPageCoordinate(event)
    if (!modal) {
      modal = document.createElement('div')
      modal.setAttribute('style', 'position: fixed; top: 0; left: 0; right: 0; bottom: 0;')
      if (cursor) modal.style.cursor = cursor
      container.appendChild(modal)
      call(bind, ondragstart, [px, py, modal], onerror)
    }
    call(bind, ondrag, [px, py, modal], onerror)
  }
  const handleMouseup = event => {
    event.preventDefault()
    const [px, py] = getPageCoordinate(event)
    window.removeEventListener('touchmove', handleMousemove)
    window.removeEventListener('touchend', handleMouseup)
    window.removeEventListener('mousemove', handleMousemove)
    window.removeEventListener('mouseup', handleMouseup)
    if (modal) container.removeChild(modal)
    call(bind, ondragend, [px, py, modal], onerror)
  }
  window.addEventListener('touchmove', handleMousemove, { passive: false })
  window.addEventListener('touchend', handleMouseup, { passive: false })
  window.addEventListener('mousemove', handleMousemove, { passive: false })
  window.addEventListener('mouseup', handleMouseup, { passive: false })
}
