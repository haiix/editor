import { nextTabbable } from './focus.mjs'
import * as styleCtl from './style.mjs'

const l = window.location
const base = l.protocol + '//' + l.host + l.pathname.slice(0, l.pathname.lastIndexOf('/'))

styleCtl.lock()

export async function initApp (App) {
  let app = null
  try {
    if (typeof App === 'string') {
      if (App.slice(0, 2) === './') {
        App = base + '/' + App.slice(2)
      } else if (App.slice(0, 1) !== '/') {
        throw new Error()
      }
      App = (await import(App)).default
    }
    app = new App()
    if (!app.hasOwnProperty('onerror') && !App.prototype.hasOwnProperty('onerror')) {
      app.onerror = error => {
        handleError(app, error, true)
      }
    }
    if (app.init) {
      const retVal = app.init()
      if (retVal?.then) await retVal
    }
    styleCtl.unlock()
    document.body.appendChild(app.element)
    const firstElem = nextTabbable(null, app.element)
    if (firstElem) firstElem.focus()
    window.app = app
    if (app.main) {
      const retVal = await app.main()
      if (retVal?.then) await retVal
    }
    if (app.loop) {
      ;(function loop (t) {
        try {
          app.loop(t)
          window.requestAnimationFrame(loop)
        } catch (error) {
          handleError(app, error, false)
        }
      }(0))
    }
  } catch (error) {
    handleError(app, error, false)
  }
}

function handleError (app, error, selfHandle) {
  styleCtl.unlock()
  if (!selfHandle && app && app.onerror) {
    app.onerror(error)
  } else {
    document.body.textContent = ''
    const pre = document.createElement('pre')
    pre.textContent = (error.stack ?? error.message).replaceAll(base, '.')
    document.body.appendChild(pre)
    throw error
  }
}

export default initApp
