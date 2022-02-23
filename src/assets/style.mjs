let locked = false
const styles = []

export function lock () {
  locked = true
}

export function unlock () {
  locked = false
  if (styles.length === 0) return
  const elem = document.createElement('style')
  elem.textContent = styles.join('\n')
  document.head.appendChild(elem)
  styles.length = 0
}

export default function style (...text) {
  styles.push(...text)
  if (!locked) unlock()
}
