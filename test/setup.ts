// jsdom 环境补齐：让浏览器里才有、但 jsdom 没实现的 API 可用

// jsdom 不做布局，offsetLeft / offsetTop 恒为 0。
// 这里按内联样式模拟，让以坐标驱动的游戏逻辑（贪吃蛇的碰撞与移动）能正常跑。
function defineOffset(prop: 'offsetLeft' | 'offsetTop', styleProp: 'left' | 'top') {
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get(this: HTMLElement) {
      return parseFloat(this.style[styleProp] || '0') || 0;
    }
  });
}

defineOffset('offsetLeft', 'left');
defineOffset('offsetTop', 'top');

// WebAudio 最小桩：只实现音效引擎用到的方法
class FakeAudioParam {
  value = 0;
  setValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect() { return this; }
  disconnect() { }
}

class FakeOscillatorNode {
  type = 'sine';
  frequency = new FakeAudioParam();
  connect() { return this; }
  start() { }
  stop() { }
}

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createGain() { return new FakeGainNode(); }
  createOscillator() { return new FakeOscillatorNode(); }
  createBufferSource() {
    return {
      buffer: null,
      connect() { return this; },
      start() { },
      stop() { }
    };
  }
  createBiquadFilter() {
    return {
      type: '',
      frequency: new FakeAudioParam(),
      connect() { return this; }
    };
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

if (typeof (window as any).AudioContext === 'undefined') {
  (window as any).AudioContext = FakeAudioContext;
}

// jsdom 没有这两个 API，补上空实现避免组件里用到时崩溃
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { },
    removeListener: () => { },
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => false
  }) as any;
}

if (typeof (window as any).ResizeObserver === 'undefined') {
  (window as any).ResizeObserver = class {
    observe() { }
    unobserve() { }
    disconnect() { }
  };
}
