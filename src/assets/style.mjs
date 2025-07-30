// @ts-check
export class Style {
  /**
   * @type {string[]} src
   */
  src = [];
  requested = false;
  /**
   * @type {HTMLStyleElement | null} styleElement
   */
  styleElement = null;

  /**
   * スタイル追加
   * @param {string} value
   */
  add(value) {
    this.src.push(value);
    if (this.requested) return;
    this.requested = true;
    requestAnimationFrame(() => {
      this.requested = false;
      this.apply();
    });
  }

  /**
   * スタイル適用
   */
  apply() {
    if (!this.src.length) return;

    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      document.head.appendChild(this.styleElement);
    }

    this.styleElement.insertAdjacentText(
      'beforeend',
      `${this.src.join('\n')}\n`,
    );
    this.src.length = 0;
  }
}

const instance = new Style();

/**
 * スタイル設定
 * @param {string} value
 */
export default function style(value) {
  instance.add(value);
}
