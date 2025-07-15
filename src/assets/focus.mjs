export function nextTreeElement(elem = null, root = document.body) {
  if (!elem) return root;
  if (elem.firstElementChild) return elem.firstElementChild;
  let curr = elem;
  while (curr !== root) {
    if (curr.nextElementSibling) return curr.nextElementSibling;
    curr = curr.parentElement;
  }
  return null;
}

export function previousTreeElement(elem = null, root = document.body) {
  if (elem === root) return null;
  let curr = elem;
  if (curr) {
    if (!curr.previousElementSibling) return curr.parentElement;
    curr = curr.previousElementSibling;
  } else {
    curr = root;
  }
  while (curr.lastElementChild) {
    curr = curr.lastElementChild;
  }
  return curr;
}

export function isTabbable(elem) {
  if (!(elem instanceof window.HTMLElement)) return false;
  const tabIndex = elem.getAttribute('tabIndex');
  if (tabIndex == null) {
    if (elem.tagName === 'A') return Boolean(elem.href);
    return (
      ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(elem.tagName) &&
      !elem.disabled
    );
  }
  return Number(tabIndex) >= 0;
}

export function nextTabbable(elem = null, root = null) {
  let minTabIndex = 1;
  let curr = elem;
  if (curr != null) {
    const tabIndex = Math.max(0, curr.tabIndex);
    while ((curr = nextTreeElement(curr, root))) {
      if (isTabbable(curr) && curr.tabIndex === tabIndex) return curr;
    }
    if (tabIndex === 0) return null;
    curr = null;
    minTabIndex = tabIndex + 1;
  }
  let foundTabIndex = Number.POSITIVE_INFINITY;
  let foundElem = null;
  while ((curr = nextTreeElement(curr, root))) {
    if (!isTabbable(curr)) continue;
    const tabIndex = curr.tabIndex || Number.MAX_SAFE_INTEGER;
    if (tabIndex >= minTabIndex && foundTabIndex > tabIndex) {
      foundTabIndex = tabIndex;
      foundElem = curr;
    }
  }
  return foundElem;
}

export function previousTabbable(elem = null, root = null) {
  let maxTabIndex = Number.POSITIVE_INFINITY;
  let curr = elem;
  if (curr != null) {
    const tabIndex = Math.max(0, curr.tabIndex);
    while ((curr = previousTreeElement(curr, root))) {
      if (isTabbable(curr) && curr.tabIndex === tabIndex) return curr;
    }
    if (tabIndex === 1) return null;
    curr = null;
    maxTabIndex = tabIndex === 0 ? Number.MAX_SAFE_INTEGER : tabIndex - 1;
  }
  let foundTabIndex = -1;
  let foundElem = null;
  while ((curr = previousTreeElement(curr, root))) {
    if (!isTabbable(curr)) continue;
    const tabIndex = curr.tabIndex || Number.POSITIVE_INFINITY;
    if (tabIndex <= maxTabIndex && foundTabIndex < tabIndex) {
      foundTabIndex = tabIndex;
      foundElem = curr;
    }
  }
  return foundElem;
}
