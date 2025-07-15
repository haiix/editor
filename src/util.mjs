export function sleep(delay) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delay);
  });
}

/**
 * 対象ノードの親ノードをたどる
 * @param  {HTMLElement}  node - 対象ノード
 */
export function* ancestorNodes(node) {
  let curr = node;
  while (curr) {
    yield curr;
    curr = curr.parentNode;
  }
}

/**
 * 子ノードのうち、対象ノードを含むものを見つける
 * @param  {HTMLElement}  parent - 親ノード
 * @param  {HTMLElement}  target - 対象ノード
 */
export function getIncludingChild(parent, target) {
  let curr = target;
  if (curr === parent) return null;
  while (curr && curr.parentNode !== parent) {
    curr = curr.parentNode;
  }
  return curr;
}
