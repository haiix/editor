const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.inset = '0';

export function getPageCoordinate(event) {
  if (event instanceof TouchEvent) {
    return {
      x: event.touches[0]?.clientX ?? 0,
      y: event.touches[0]?.clientY ?? 0,
    };
  }
  return { x: event.pageX, y: event.pageY };
}

class HoldController {
  params;
  point = { x: 0, y: 0 };
  dragStarted = false;

  constructor(params) {
    this.params = params;
  }

  callback(callback) {
    if (!callback) return;

    let retVal = null;
    try {
      retVal = callback(this.point.x, this.point.y, overlay);
    } catch (error) {
      if (this.params.onerror) {
        this.params.onerror(error);
      }
    }

    if (this.params.onerror && retVal instanceof Promise) {
      retVal.catch(this.params.onerror);
    }
  }

  handleMouseDown(event) {
    this.point = getPageCoordinate(event);
  }

  handleMouseMove(event) {
    const point = getPageCoordinate(event);
    if (point.x === this.point.x && point.y === this.point.y) return;
    this.point = point;

    if (!this.dragStarted) {
      if (this.params.cursor) overlay.style.cursor = this.params.cursor;
      (this.params.container ?? document.body).append(overlay);
      this.callback(this.params.ondragstart);
      this.dragStarted = true;
    }

    this.callback(this.params.ondrag);
  }

  handleMouseUp(event) {
    overlay.remove();
    overlay.style.cursor = '';
    this.point = getPageCoordinate(event);
    this.callback(this.params.ondragend);
  }
}

export function hold(params) {
  const controller = new HoldController(params);

  const handleMouseDown = (event) => {
    event.preventDefault();
    controller.handleMouseDown(event);
  };
  const handleMouseMove = (event) => {
    event.preventDefault();
    controller.handleMouseMove(event);
  };
  const handleMouseUp = (event) => {
    event.preventDefault();
    // eslint-disable-next-line no-use-before-define
    for (const handler of handlers) {
      removeEventListener(handler.type, handler.listener);
    }
    controller.handleMouseUp(event);
  };

  const handlers = [
    { type: 'touchstart', listener: handleMouseDown },
    { type: 'touchmove', listener: handleMouseMove },
    { type: 'touchend', listener: handleMouseUp },
    { type: 'mousedown', listener: handleMouseDown },
    { type: 'mousemove', listener: handleMouseMove },
    { type: 'mouseup', listener: handleMouseUp },
  ];

  for (const handler of handlers) {
    addEventListener(handler.type, handler.listener, { passive: false });
  }
}

export default hold;
