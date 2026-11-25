export interface PanelOptions {
  title?: string;
  className?: string;
}

export interface Panel {
  el: HTMLElement;
  // 内容容器：带标题时为标题下方的正文区，否则就是 el 本身
  body: HTMLElement;
}

// 统一面板容器
export function createPanel(options: PanelOptions = {}): Panel {
  const el = document.createElement('div');
  el.className = 'gs-panel';
  if (options.className) el.className += ' ' + options.className;

  let body = el;
  if (options.title) {
    const head = document.createElement('div');
    head.className = 'gs-panel-title';
    head.textContent = options.title;
    el.appendChild(head);
    body = document.createElement('div');
    body.className = 'gs-panel-body';
    el.appendChild(body);
  }
  return { el, body };
}
