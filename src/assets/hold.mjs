// @ts-check
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.inset = '0';

/**
 * @typedef {{
 *   container?: HTMLElement;
 *   ondragstart?: (x: number, y: number, overlay: HTMLElement) => void;
 *   ondrag?: (x: number, y: number, overlay: HTMLElement) => void;
 *   ondragend?: (x: number, y: number, overlay: HTMLElement) => void;
 *   onerror?: (error: unknown) => void;
 *   cursor?: string;
 * }} HoldParams
 */

/**
 * マウスイベントから画面上の座標を取得する
 * @param {MouseEvent} event
 * @returns {{ x:number, y:number }}
 */
export function getPageCoordinate(event) {
  // TouchEventはブラウザで実装されていない可能性があるので注意
  if (event instanceof MouseEvent) {
    return { x: event.pageX, y: event.pageY };
  }
  return {
    x: event.touches[0]?.clientX ?? 0,
    y: event.touches[0]?.clientY ?? 0,
  };
}

/**
 * ホールド状態管理クラス
 */
class HoldController {
  params;
  point = { x: 0, y: 0 };
  dragStarted = false;

  /**
   * コンストラクター
   * @param {HoldParams} params
   */
  constructor(params) {
    this.params = params;
  }

  /**
   * 非同期/同期コールバックを呼び出し、Errorをキャッチする
   * @param {((x: number, y: number, overlay: HTMLElement) => unknown) | undefined} callback
   */
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

  /**
   * マウスダウンイベント
   * @param {MouseEvent} event
   */
  handleMouseDown(event) {
    this.point = getPageCoordinate(event);
  }

  /**
   * マウス移動イベント
   * @param {MouseEvent} event
   */
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

  /**
   * マウスアップイベント
   * @param {MouseEvent} event
   */
  handleMouseUp(event) {
    overlay.remove();
    overlay.style.cursor = '';
    this.point = getPageCoordinate(event);
    this.callback(this.params.ondragend);
  }
}

/**
 * マウスドラッグヘルパー
 * @param {HoldParams} params
 */
export function hold(params) {
  const controller = new HoldController(params);

  /**
   * マウスダウンイベント
   * @param {MouseEvent} event
   */
  const handleMouseDown = (event) => {
    // マウスダウンのイベントを抑止すると、フォーカス処理が行われなくなる
    //event.preventDefault();
    controller.handleMouseDown(event);
  };

  /**
   * マウス移動イベント
   * @param {MouseEvent} event
   */

  const handleMouseMove = (event) => {
    event.preventDefault();
    controller.handleMouseMove(event);
  };

  /**
   * マウスアップイベント
   * @param {MouseEvent} event
   */
  const handleMouseUp = (event) => {
    event.preventDefault();
    for (const handler of handlers) {
      removeEventListener(handler.type, handler.listener);
    }
    controller.handleMouseUp(event);
  };

  /**
   * @type {{ type: string, listener: (event: any) => void }[]}
   */
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
