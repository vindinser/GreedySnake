export type ButtonVariant = 'primary' | 'ghost' | 'danger'

export interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  // 追加到 class 的额外类名
  className?: string;
  onClick?: () => void;
}

// 统一按钮：所有游戏共用同一套外观
export function createButton(options: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'gs-btn gs-btn-' + (options.variant || 'primary');
  if (options.className) btn.className += ' ' + options.className;
  btn.textContent = options.label;
  if (options.onClick) btn.addEventListener('click', options.onClick);
  return btn;
}
