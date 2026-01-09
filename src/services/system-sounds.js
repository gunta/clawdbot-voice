/**
 * System Sounds Service
 * Reusable UI feedback sounds for ClawdOS
 * 
 * Separate from clock chimes - these are general OS sounds for:
 * - Navigation (open, close, back)
 * - Actions (tap, select, confirm)
 * - Feedback (success, error, warning)
 * - Transitions (enter, exit, morph)
 */

import { haptic } from './haptic.js';

class SystemSounds {
  #audioContext = null;
  #enabled = true;
  #volume = 0.12;

  // ─────────────────────────────────────────────────────────────────────────
  // Audio Context Management
  // ─────────────────────────────────────────────────────────────────────────

  #getAudioContext() {
    if (!this.#audioContext || this.#audioContext.state === 'closed') {
      this.#audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.#audioContext;
  }

  async #ensureReady() {
    if (!this.#enabled) return false;
    const ctx = this.#getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('[SystemSounds] Could not resume audio context');
        return false;
      }
    }
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation Sounds
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Open/expand something (launchpad, app, modal)
   * Ascending, airy tone
   */
  async open() {
    if (!await this.#ensureReady()) return;
    haptic('light');
    this.#softChord([440, 554, 659], 0.15, 'up');
  }

  /**
   * Close/collapse something
   * Descending, settling tone
   */
  async close() {
    if (!await this.#ensureReady()) return;
    this.#softChord([659, 554, 440], 0.12, 'down');
  }

  /**
   * Navigate back
   * Quick descending swoop
   */
  async back() {
    if (!await this.#ensureReady()) return;
    haptic('light');
    this.#swoop(600, 400, 0.08);
  }

  /**
   * Navigate forward/into
   * Quick ascending swoop
   */
  async forward() {
    if (!await this.#ensureReady()) return;
    haptic('light');
    this.#swoop(400, 600, 0.08);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Action Sounds
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generic tap/click
   * Subtle, satisfying click
   */
  async tap() {
    if (!await this.#ensureReady()) return;
    haptic('light');
    this.#click(2800, 0.025);
  }

  /**
   * Select/choose an item
   * Slightly more prominent than tap
   */
  async select() {
    if (!await this.#ensureReady()) return;
    haptic('medium');
    this.#click(3200, 0.035);
    this.#click(3600, 0.025, 0.04);
  }

  /**
   * Confirm/submit action
   * Positive, affirming double-tone
   */
  async confirm() {
    if (!await this.#ensureReady()) return;
    haptic('medium');
    this.#playTone(0, 523, 'sine', 0.08, this.#volume);     // C5
    this.#playTone(0.08, 659, 'sine', 0.12, this.#volume);  // E5
  }

  /**
   * Cancel/dismiss
   * Soft descending tone
   */
  async cancel() {
    if (!await this.#ensureReady()) return;
    this.#playTone(0, 500, 'sine', 0.06, this.#volume * 0.8);
    this.#playTone(0.06, 400, 'sine', 0.08, this.#volume * 0.6);
  }

  /**
   * Toggle on
   */
  async toggleOn() {
    if (!await this.#ensureReady()) return;
    haptic('light');
    this.#playTone(0, 600, 'sine', 0.04, this.#volume);
    this.#playTone(0.05, 800, 'sine', 0.06, this.#volume);
  }

  /**
   * Toggle off
   */
  async toggleOff() {
    if (!await this.#ensureReady()) return;
    haptic('light');
    this.#playTone(0, 800, 'sine', 0.04, this.#volume);
    this.#playTone(0.05, 600, 'sine', 0.06, this.#volume * 0.8);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Feedback Sounds
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Success/completion
   * Bright, cheerful ascending
   */
  async success() {
    if (!await this.#ensureReady()) return;
    haptic('success');
    this.#playTone(0, 523, 'sine', 0.08, this.#volume);     // C5
    this.#playTone(0.1, 659, 'sine', 0.08, this.#volume);   // E5
    this.#playTone(0.2, 784, 'sine', 0.15, this.#volume);   // G5
  }

  /**
   * Error/failure
   * Low, concerning buzz
   */
  async error() {
    if (!await this.#ensureReady()) return;
    haptic('error');
    this.#playTone(0, 200, 'sawtooth', 0.12, this.#volume * 0.7);
    this.#playTone(0.15, 180, 'sawtooth', 0.15, this.#volume * 0.5);
  }

  /**
   * Warning/attention
   * Alert but not alarming
   */
  async warning() {
    if (!await this.#ensureReady()) return;
    haptic('warning');
    this.#playTone(0, 440, 'triangle', 0.1, this.#volume);
    this.#playTone(0.15, 440, 'triangle', 0.1, this.#volume);
  }

  /**
   * Notification/alert (gentle)
   */
  async notification() {
    if (!await this.#ensureReady()) return;
    this.#softChord([659, 784, 988], 0.2, 'up');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Transition Sounds
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Zoom in (folder navigation)
   * Whooshing inward
   */
  async zoomIn() {
    if (!await this.#ensureReady()) return;
    this.#whoosh(300, 800, 0.15);
  }

  /**
   * Zoom out (folder navigation)
   * Whooshing outward
   */
  async zoomOut() {
    if (!await this.#ensureReady()) return;
    this.#whoosh(800, 300, 0.15);
  }

  /**
   * App launch/transition
   * Satisfying activation sound
   */
  async launch() {
    if (!await this.#ensureReady()) return;
    haptic('medium');
    this.#playTone(0, 400, 'sine', 0.05, this.#volume);
    this.#playTone(0.05, 600, 'sine', 0.05, this.#volume);
    this.#playTone(0.1, 800, 'sine', 0.1, this.#volume * 1.2);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sound Generators (Private)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Basic tone
   */
  #playTone(startTime, freq, type, duration, vol) {
    const ctx = this.#getAudioContext();
    const now = ctx.currentTime + startTime;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Soft lowpass for warmth
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4000, now);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); lp.disconnect(); };
  }

  /**
   * Click/tap sound
   */
  #click(freq, duration, delay = 0) {
    const ctx = this.#getAudioContext();
    const now = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.#volume * 0.8, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Highpass for crisp click
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2000, now);

    osc.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); hp.disconnect(); };
  }

  /**
   * Soft chord (for opens/closes)
   */
  #softChord(frequencies, duration, direction = 'up') {
    const ctx = this.#getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(this.#volume * 0.7, now + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2500, now);

    lp.connect(masterGain);
    masterGain.connect(ctx.destination);

    const stagger = direction === 'up' ? 0.015 : -0.015;
    
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const startOffset = direction === 'up' ? i * stagger : (frequencies.length - 1 - i) * Math.abs(stagger);
      osc.frequency.setValueAtTime(freq, now + startOffset);
      osc.connect(lp);
      osc.start(now + startOffset);
      osc.stop(now + duration + 0.02);
      osc.onended = () => osc.disconnect();
    });

    setTimeout(() => { lp.disconnect(); masterGain.disconnect(); }, (duration + 0.1) * 1000);
  }

  /**
   * Frequency swoop
   */
  #swoop(startFreq, endFreq, duration) {
    const ctx = this.#getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.#volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  /**
   * Whoosh (noise-based transition)
   */
  #whoosh(startFreq, endFreq, duration) {
    const ctx = this.#getAudioContext();
    const now = ctx.currentTime;

    // Use filtered noise for whoosh
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    filter.Q.setValueAtTime(2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.#volume * 0.4, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Settings
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Enable/disable all system sounds
   */
  setEnabled(enabled) {
    this.#enabled = enabled;
    console.log(`[SystemSounds] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  get enabled() {
    return this.#enabled;
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(vol) {
    this.#volume = Math.max(0, Math.min(1, vol));
  }

  get volume() {
    return this.#volume;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.#audioContext) {
      this.#audioContext.close();
    }
  }
}

export const systemSounds = new SystemSounds();
