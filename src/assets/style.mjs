export class Style {
  src = [];
  requested = false;
  styleElement = null;

  add(value) {
    this.src.push(value);
    if (this.requested) return;
    this.requested = true;
    requestAnimationFrame(() => {
      this.requested = false;
      this.apply();
    });
  }

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
export default function style(value) {
  instance.add(value);
}
