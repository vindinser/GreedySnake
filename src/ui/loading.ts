// 载入占位：需要异步加载资源的游戏用它撑住等待过程
export function createLoading(label = '载入中…'): HTMLElement {
  const el = document.createElement('div');
  el.className = 'gs-loading';
  const spinner = document.createElement('span');
  spinner.className = 'gs-loading-spinner';
  const text = document.createElement('span');
  text.className = 'gs-loading-text';
  text.textContent = label;
  el.appendChild(spinner);
  el.appendChild(text);
  return el;
}
