import { describe, it, expect, vi } from 'vitest'
import { createButton, createHud, createLoading, createOverlay, createPanel } from '../src/ui'

describe('ui/createButton', () => {
  it('渲染文案与默认样式类', () => {
    const btn = createButton({ label: '开始' });
    expect(btn.textContent).toBe('开始');
    expect(btn.className).toContain('gs-btn');
    expect(btn.className).toContain('gs-btn-primary');
    expect(btn.type).toBe('button');
  });

  it('支持变体与附加类名', () => {
    const btn = createButton({ label: '重试', variant: 'danger', className: 'extra' });
    expect(btn.className).toContain('gs-btn-danger');
    expect(btn.className).toContain('extra');
  });

  it('点击时触发回调', () => {
    let hits = 0;
    const btn = createButton({ label: '点我', onClick: () => hits++ });
    btn.click();
    expect(hits).toBe(1);
  });
});

describe('ui/createPanel', () => {
  it('无标题时内容容器就是自身', () => {
    const panel = createPanel();
    expect(panel.body).toBe(panel.el);
  });

  it('有标题时提供独立的正文区', () => {
    const panel = createPanel({ title: '比分' });
    expect(panel.el.querySelector('.gs-panel-title')?.textContent).toBe('比分');
    expect(panel.body.className).toContain('gs-panel-body');
    expect(panel.body.parentElement).toBe(panel.el);
  });
});

describe('ui/createOverlay', () => {
  it('默认不可见，show / hide 切换状态', () => {
    const overlay = createOverlay({ html: '<p>hi</p>' });
    expect(overlay.visible).toBe(false);
    expect(overlay.el.classList.contains('show')).toBe(false);
    overlay.show();
    expect(overlay.visible).toBe(true);
    expect(overlay.el.classList.contains('show')).toBe(true);
    overlay.hide();
    expect(overlay.visible).toBe(false);
  });

  it('hide 时触发 onClose', () => {
    const onClose = vi.fn();
    const overlay = createOverlay({ onClose });
    overlay.show();
    overlay.hide();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ui/createHud', () => {
  it('渲染标签与初值', () => {
    const hud = createHud([{ label: 'BEST:', value: 12 }]);
    expect(hud.el.querySelector('.gs-hud-label')?.textContent).toBe('BEST:');
    expect(hud.el.querySelector('.gs-hud-value')?.textContent).toBe('12');
  });

  it('setScore 接受单值与数组', () => {
    const hud = createHud([{ label: 'A', value: 0 }, { label: 'B', value: 0 }]);
    hud.setScore(5);
    expect(hud.el.querySelectorAll('.gs-hud-value')[0].textContent).toBe('5');
    hud.setScore([1, 2]);
    expect(hud.el.querySelectorAll('.gs-hud-value')[0].textContent).toBe('1');
    expect(hud.el.querySelectorAll('.gs-hud-value')[1].textContent).toBe('2');
  });

  it('setItem 按下标写入', () => {
    const hud = createHud([{ label: 'A', value: 0 }]);
    hud.setItem(0, '8 : 3');
    expect(hud.el.querySelector('.gs-hud-value')?.textContent).toBe('8 : 3');
  });
});

describe('ui/createLoading', () => {
  it('渲染转圈与提示文案', () => {
    const el = createLoading('载入中…');
    expect(el.className).toContain('gs-loading');
    expect(el.querySelector('.gs-loading-spinner')).toBeTruthy();
    expect(el.querySelector('.gs-loading-text')?.textContent).toBe('载入中…');
  });
});
