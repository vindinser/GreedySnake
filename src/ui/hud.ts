export interface HudItem {
  label: string;
  value: string | number;
}

export interface Hud {
  el: HTMLElement;
  // 单值写入第一个格子；数组按顺序写入多个格子
  setScore(value: number | number[]): void;
  setItem(index: number, value: string | number): void;
}

// 统一信息条：分数、最高分等只读读数
export function createHud(items: HudItem[] = []): Hud {
  const el = document.createElement('div');
  el.className = 'gs-hud';
  const values: HTMLElement[] = [];

  for (const item of items) {
    const cell = document.createElement('div');
    cell.className = 'gs-hud-cell';
    const label = document.createElement('span');
    label.className = 'gs-hud-label';
    label.textContent = item.label;
    const value = document.createElement('span');
    value.className = 'gs-hud-value';
    value.textContent = String(item.value);
    cell.appendChild(label);
    cell.appendChild(value);
    el.appendChild(cell);
    values.push(value);
  }

  return {
    el,
    setScore(value: number | number[]) {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (values[i]) values[i].textContent = String(value[i]);
        }
      } else if (values[0]) {
        values[0].textContent = String(value);
      }
    },
    setItem(index: number, value: string | number) {
      if (values[index]) values[index].textContent = String(value);
    }
  };
}
