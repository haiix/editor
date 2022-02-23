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

export default function hold ({ ondragstart = null, ondrag = null, ondragend = null, onerror = null, cursor = '', bind = null, container = document.body }) {
  let modal = null
  const handleMousemove = event => {
    if (!modal) {
      modal = document.createElement('div')
      modal.setAttribute('style', 'position: fixed; top: 0; left: 0; right: 0; bottom: 0;')
      if (cursor) modal.style.cursor = cursor
      container.appendChild(modal)
      call(bind, ondragstart, [event.pageX, event.pageY, modal], onerror)
    }
    call(bind, ondrag, [event.pageX, event.pageY, modal], onerror)
  }
  const handleMouseup = event => {
    window.removeEventListener('mousemove', handleMousemove)
    window.removeEventListener('mouseup', handleMouseup)
    if (modal) container.removeChild(modal)
    call(bind, ondragend, [event.pageX, event.pageY, modal], onerror)
  }
  window.addEventListener('mousemove', handleMousemove)
  window.addEventListener('mouseup', handleMouseup)
}
