// 音效引擎：WebAudio 程序化合成，不依赖任何音频素材文件
import { storage } from './storage'

export type WaveType = 'square' | 'triangle' | 'sawtooth' | 'sine' | 'noise'

export interface SfxSpec {
  wave: WaveType;
  // 起始频率，或频率序列（依次演奏，用于旋律）
  freq: number | number[];
  // 时长（秒）
  duration: number;
  // 峰值音量，默认 0.15
  gain?: number;
}

const MUTE_KEY = 'audio.muted';

// 默认音效表：跨游戏复用的 8-bit 音色
const DEFAULT_SFX: Record<string, SfxSpec> = {
  click: { wave: 'square', freq: [660, 440], duration: 0.06, gain: 0.12 },
  move: { wave: 'square', freq: 520, duration: 0.03, gain: 0.08 },
  eat: { wave: 'square', freq: [440, 880], duration: 0.12, gain: 0.16 },
  coin: { wave: 'triangle', freq: [880, 1320], duration: 0.16, gain: 0.16 },
  flip: { wave: 'triangle', freq: 620, duration: 0.07, gain: 0.12 },
  place: { wave: 'triangle', freq: 340, duration: 0.08, gain: 0.12 },
  clear: { wave: 'square', freq: [523, 1046], duration: 0.22, gain: 0.16 },
  boom: { wave: 'noise', freq: 240, duration: 0.28, gain: 0.22 },
  win: { wave: 'square', freq: [523, 784, 1046], duration: 0.45, gain: 0.18 },
  lose: { wave: 'sawtooth', freq: [392, 110], duration: 0.45, gain: 0.16 },
  laser: { wave: 'sawtooth', freq: [1200, 220], duration: 0.14, gain: 0.12 },
  explode: { wave: 'noise', freq: 180, duration: 0.42, gain: 0.26 },
  blip: { wave: 'square', freq: 880, duration: 0.04, gain: 0.1 },
  select: { wave: 'square', freq: 740, duration: 0.05, gain: 0.1 },
  error: { wave: 'sawtooth', freq: 220, duration: 0.18, gain: 0.12 }
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private specs: Record<string, SfxSpec> = {};
  private mutedFlag = false;

  constructor() {
    this.specs = { ...DEFAULT_SFX };
    this.mutedFlag = storage.get<boolean>(MUTE_KEY, false);
  }

  get muted(): boolean {
    return this.mutedFlag;
  }

  setMuted(muted: boolean): void {
    this.mutedFlag = muted;
    storage.set(MUTE_KEY, muted);
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }

  // 首次用户手势时调用：浏览器自动播放策略要求 AudioContext 在手势后解锁
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  // 注册或覆盖一个音效
  define(name: string, spec: SfxSpec): void {
    this.specs[name] = spec;
  }

  // 播放音效；未注册的名称静默忽略
  play(name: string): void {
    if (this.mutedFlag) return;
    const spec = this.specs[name];
    if (!spec) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const freqs = Array.isArray(spec.freq) ? spec.freq : [spec.freq];
    if (freqs.length === 0) return;
    const step = spec.duration / freqs.length;
    const base = ctx.currentTime;
    for (let i = 0; i < freqs.length; i++) {
      this.playTone(ctx, spec, freqs[i], base + i * step, step);
    }
  }

  destroy(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const scope = typeof window !== 'undefined' ? (window as any) : null;
    const Ctor = scope && (scope.AudioContext || scope.webkitAudioContext);
    if (!Ctor) return null;
    let ctx: AudioContext;
    try {
      ctx = new Ctor();
    } catch (e) {
      return null;
    }
    const master = ctx.createGain();
    master.gain.value = this.mutedFlag ? 0 : 1;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return ctx;
  }

  private playTone(ctx: AudioContext, spec: SfxSpec, freq: number, at: number, duration: number) {
    if (!this.master) return;
    const gain = ctx.createGain();
    const peak = spec.gain ?? 0.15;
    const attack = Math.min(0.01, duration / 2);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    gain.connect(this.master);

    if (spec.wave === 'noise') {
      const source = ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = Math.max(200, freq);
      source.connect(filter);
      filter.connect(gain);
      source.start(at);
      source.stop(at + duration);
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = spec.wave;
    osc.frequency.setValueAtTime(freq, at);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + duration);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.5));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}

// 全局单例
export const audio = new AudioEngine()
