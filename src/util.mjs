export function sleep (delay) {
  return new Promise(resolve => window.setTimeout(resolve, delay))
}

/**
 * 対象ノードの親ノードをたどる
 * @param  {HTMLElement}  node - 対象ノード
 */
export function * ancestorNodes (node) {
  while (node) {
    yield node
    node = node.parentNode
  }
}

/**
 * 子ノードのうち、対象ノードを含むものを見つける
 * @param  {HTMLElement}  parent - 親ノード
 * @param  {HTMLElement}  target - 対象ノード
 */
export function getIncludingChild (parent, target) {
  if (target === parent) return null
  while (target && target.parentNode !== parent) {
    target = target.parentNode
  }
  return target
}
