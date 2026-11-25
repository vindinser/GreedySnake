export interface OverlayOptions {
  // 静态 HTML 片段
  html?: string;
  className?: string;
  onClose?: () => void;
}

export interface Overlay {
  el: HTMLElement;
  show(): void;
  hide(): void;
  readonly visible: boolean;
}

// 统一覆盖层：暂停 / 结算 / 错误提示共用
export function createOverlay(options: OverlayOptions = {}): Overlay {
  const el = document.createElement('div');
  el.className = 'gs-overlay';
  if (options.className) el.className += ' ' + options.className;
  el.innerHTML = options.html || '';
  let visible = false;

  return {
    el,
    get visible() {
      return visible;
    },
    show() {
      el.classList.add('show');
      visible = true;
    },
    hide() {
      el.classList.remove('show');
      visible = false;
      if (options.onClose) options.onClose();
    }
  };
}
