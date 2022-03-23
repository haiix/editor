import { nextTabbable } from './focus.mjs'
import * as styleCtl from './style.mjs'

styleCtl.lock()

export default async function initApp (App) {
  let app = null
  try {
    app = new App()
    if (app.init) await app.init()
    styleCtl.unlock()
    document.body.appendChild(app.element)
    const firstElem = nextTabbable(null, app.element)
    if (firstElem) firstElem.focus()
    if (app.main) await app.main()
    window.app = app
    if (app.loop) {
      ;(function loop (t) {
        try {
          app.loop(t)
        } catch (error) {
          styleCtl.unlock()
          if (app.onerror) {
            app.onerror(error)
          } else {
            throw error
          }
        }
        window.requestAnimationFrame(loop)
      }(0))
    }
  } catch (error) {
    styleCtl.unlock()
    if (app && app.onerror) {
      app.onerror(error)
    } else if (App.prototype.onerror) {
      App.prototype.onerror.call(null, error)
    } else {
      throw error
    }
  }
}
