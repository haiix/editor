export function nextTreeElement (elem = null, root = null) {
  root = root || document.body
  if (!elem) return root
  if (elem.firstElementChild) return elem.firstElementChild
  while (elem !== root) {
    if (elem.nextElementSibling) return elem.nextElementSibling
    elem = elem.parentElement
  }
  return null
}

export function previousTreeElement (elem = null, root = null) {
  root = root || document.body
  if (elem === root) return null
  if (elem) {
    if (!elem.previousElementSibling) return elem.parentElement
    elem = elem.previousElementSibling
  } else {
    elem = root
  }
  while (elem.lastElementChild) {
    elem = elem.lastElementChild
  }
  return elem
}

export function isTabbable (elem) {
  if (!(elem instanceof window.HTMLElement)) return false
  const tabIndex = elem.getAttribute('tabIndex')
  if (tabIndex == null) {
    if (elem.tagName === 'A') return !!elem.href
    return ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(elem.tagName) && !elem.disabled
  } else {
    return (tabIndex - 0) >= 0
  }
}

export function nextTabbable (elem = null, root = null) {
  let minTabIndex = 1
  if (elem != null) {
    const tabIndex = Math.max(0, elem.tabIndex)
    while ((elem = nextTreeElement(elem, root))) {
      if (isTabbable(elem) && elem.tabIndex === tabIndex) return elem
    }
    if (tabIndex === 0) return null
    elem = null
    minTabIndex = tabIndex + 1
  }
  let foundTabIndex = Number.POSITIVE_INFINITY
  let foundElem = null
  while ((elem = nextTreeElement(elem, root))) {
    if (!isTabbable(elem)) continue
    const tabIndex = elem.tabIndex || Number.MAX_SAFE_INTEGER
    if (tabIndex >= minTabIndex && foundTabIndex > tabIndex) {
      foundTabIndex = tabIndex
      foundElem = elem
    }
  }
  return foundElem
}

export function previousTabbable (elem = null, root = null) {
  let maxTabIndex = Number.POSITIVE_INFINITY
  if (elem != null) {
    const tabIndex = Math.max(0, elem.tabIndex)
    while ((elem = previousTreeElement(elem, root))) {
      if (isTabbable(elem) && elem.tabIndex === tabIndex) return elem
    }
    if (tabIndex === 1) return null
    elem = null
    maxTabIndex = tabIndex === 0 ? Number.MAX_SAFE_INTEGER : tabIndex - 1
  }
  let foundTabIndex = -1
  let foundElem = null
  while ((elem = previousTreeElement(elem, root))) {
    if (!isTabbable(elem)) continue
    const tabIndex = elem.tabIndex || Number.POSITIVE_INFINITY
    if (tabIndex <= maxTabIndex && foundTabIndex < tabIndex) {
      foundTabIndex = tabIndex
      foundElem = elem
    }
  }
  return foundElem
}
