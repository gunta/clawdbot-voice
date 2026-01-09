/**
 * Chimes Service
 * Synthesized sound effects for UI feedback and notifications
 */

import { haptic } from './haptic.js';

class ChimesService {
  #audioContext = null;
  #intervalId = null;
  #clockEnabled = true;
  #volume = 0.15;

  // ===== INITIALIZATION =====

  /**
   * Initialize clock chimes (call once on app start)
   */
  initClock() {
    this.#scheduleNextChime();
    console.log('[Chimes] Clock initialized - chimes at :00 and :30');
  }

  #getAudioContext() {
    if (!this.#audioContext || this.#audioContext.state === 'closed') {
      this.#audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.#audioContext;
  }

  async #ensureAudioContext() {
    const ctx = this.#getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('[Chimes] Could not resume audio context');
      }
    }
  }

  // ===== PUBLIC CHIME METHODS =====

  /**
   * Play when user taps speak button (start listening)
   */
  async listening() {
    await this.#ensureAudioContext();
    this.#casioF91W();
  }

  /**
   * Play when Her starts speaking
   */
  async herSpeaking() {
    await this.#ensureAudioContext();
    this.#herTone(0, 600, 800);
    this.#herTone(0.2, 700, 900);
  }

  /**
   * Play when Clawd (lobster) starts speaking  
   */
  async clawdSpeaking() {
    await this.#ensureAudioContext();
    // Cute robot chirp for the lobster
    this.#playTone(0, 800, 'sine', 0.05, this.#volume);
    this.#playTone(0.07, 1000, 'sine', 0.05, this.#volume);
    this.#playTone(0.14, 1300, 'sine', 0.07, this.#volume * 1.2);
  }

  /**
   * Play on clock tap (+ haptic + speak time)
   */
  async clockTap() {
    await this.#ensureAudioContext();
    haptic('light');
    this.#casioF91W();
    setTimeout(() => this.#speakTime(), 300);
  }

  /**
   * Play for :00 hourly chime
   */
  async hourly() {
    if (!this.#clockEnabled) return;
    await this.#ensureAudioContext();
    this.#casioF91W();
    console.log('[Chimes] ⏰ Hourly');
  }

  /**
   * Play for :30 half-hour chime
   */
  async halfHour() {
    if (!this.#clockEnabled) return;
    await this.#ensureAudioContext();
    this.#classicCasio();
    console.log('[Chimes] ⏰ Half-hour');
  }

  /**
   * Alert/notification chime
   */
  async alert() {
    await this.#ensureAudioContext();
    this.#tripleChirp();
  }

  /**
   * Gentle notification
   */
  async notification() {
    await this.#ensureAudioContext();
    this.#classicCasio();
  }

  /**
   * AI assistant wake/ready sound
   */
  async wake() {
    await this.#ensureAudioContext();
    this.#aiChord();
  }

  /**
   * Ambient/meditation sound
   */
  async ambient() {
    await this.#ensureAudioContext();
    this.#analogEcho();
  }

  /**
   * Arrival/transition chime (Tokyo station style)
   */
  async arrival() {
    await this.#ensureAudioContext();
    this.#tokyoStation();
  }

  /**
   * Friendly greeting chirp
   */
  async greeting() {
    await this.#ensureAudioContext();
    this.#wallE();
  }

  // ===== SOUND GENERATORS =====

  // Casio F-91W - THE iconic 3.2kHz piezo
  #casioF91W() {
    this.#playTone(0, 3200, 'square', 0.055, this.#volume);
    this.#playTone(0.1, 3200, 'square', 0.055, this.#volume);
  }

  // Classic Casio - crisp 4kHz double beep
  #classicCasio() {
    this.#playTone(0, 4200, 'square', 0.06, this.#volume);
    this.#playTone(0.12, 4000, 'square', 0.06, this.#volume);
  }

  // Triple ascending chirp
  #tripleChirp() {
    this.#playTone(0, 3800, 'square', 0.035, this.#volume);
    this.#playTone(0.07, 4200, 'square', 0.035, this.#volume);
    this.#playTone(0.14, 4600, 'square', 0.035, this.#volume);
  }

  // Her/Samantha style soft tones
  #herTone(startTime, freq1, freq2) {
    const ctx = this.#getAudioContext();
    const now = ctx.currentTime + startTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, now);
    osc2.frequency.setValueAtTime(freq2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.#volume * 0.8, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, now);
    lp.Q.setValueAtTime(1, now);

    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
    osc1.onended = () => { 
      osc1.disconnect(); osc2.disconnect(); gain.disconnect(); lp.disconnect();
    };
  }

  // AI assistant polished chord
  #aiChord() {
    const ctx = this.#getAudioContext();
    const now = ctx.currentTime;
    const frequencies = [523, 659, 784]; // C major

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.#volume * 0.6, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const oscs = frequencies.map(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(gain);
      return osc;
    });

    gain.connect(ctx.destination);
    oscs.forEach(osc => { osc.start(now); osc.stop(now + 0.15); });
    oscs[0].onended = () => { oscs.forEach(o => o.disconnect()); gain.disconnect(); };
  }

  // Warm analog with echo
  #analogEcho() {
    const playEcho = (startTime, freq) => {
      const ctx = this.#getAudioContext();
      const now = ctx.currentTime + startTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const delay = ctx.createDelay();
      delay.delayTime.setValueAtTime(0.12, now);

      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(0.3, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(this.#volume * 1.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2000, now);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      feedback.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
      osc.onended = () => { 
        setTimeout(() => {
          osc.disconnect(); gain.disconnect(); delay.disconnect(); 
          feedback.disconnect(); lp.disconnect();
        }, 400);
      };
    };
    playEcho(0, 1200);
    playEcho(0.2, 1000);
  }

  // Tokyo train station melodic
  #tokyoStation() {
    this.#playTone(0, 659, 'sine', 0.2, this.#volume * 1.1);    // E5
    this.#playTone(0.22, 523, 'sine', 0.25, this.#volume * 1.1); // C5
  }

  // WALL-E cute robot
  #wallE() {
    this.#playTone(0, 800, 'sine', 0.05, this.#volume);
    this.#playTone(0.07, 1000, 'sine', 0.05, this.#volume);
    this.#playTone(0.14, 1300, 'sine', 0.07, this.#volume * 1.2);
  }

  // Basic tone helper
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

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1500, now);

    osc.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); hp.disconnect(); };
  }

  // ===== TIME SPEECH =====

  #speakTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    const isOnTheHour = minutes === 0;
    
    const timeStr = isOnTheHour 
      ? `${hour12} ${ampm}`
      : `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    const variations = [
      `It's ${timeStr}.`,
      `The time is ${timeStr}.`,
      `${timeStr}.`,
      isOnTheHour ? `${hour12} o'clock.` : `${timeStr}.`,
      `Currently ${timeStr}.`,
      `Time check: ${timeStr}.`,
      isOnTheHour ? `It's ${hour12} o'clock ${ampm}.` : `It's ${timeStr}.`,
      `${timeStr}, exactly.`,
      isOnTheHour ? `${hour12} ${ampm} on the dot.` : `${timeStr}.`,
      `Right now, ${timeStr}.`,
    ];
    
    const phrase = variations[Math.floor(Math.random() * variations.length)];
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }

  // ===== CLOCK SCHEDULING =====

  #scheduleNextChime() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ms = now.getMilliseconds();

    let targetMinutes = minutes < 30 ? 30 : 60;
    const minutesToWait = targetMinutes - minutes;
    const msToWait = (minutesToWait * 60 * 1000) - (seconds * 1000) - ms;

    if (this.#intervalId) clearTimeout(this.#intervalId);

    this.#intervalId = setTimeout(() => {
      const currentMinutes = new Date().getMinutes();
      if (currentMinutes === 0) {
        this.hourly();
      } else {
        this.halfHour();
      }
      this.#startInterval();
    }, msToWait);

    const nextChime = new Date(now.getTime() + msToWait);
    console.log(`[Chimes] Next clock chime at ${nextChime.toLocaleTimeString()}`);
  }

  #startInterval() {
    if (this.#intervalId) clearTimeout(this.#intervalId);
    this.#intervalId = setInterval(() => {
      const minutes = new Date().getMinutes();
      if (minutes === 0) this.hourly();
      else if (minutes === 30) this.halfHour();
    }, 30 * 60 * 1000);
  }

  // ===== SETTINGS =====

  setClockEnabled(enabled) {
    this.#clockEnabled = enabled;
    console.log(`[Chimes] Clock ${enabled ? 'enabled' : 'disabled'}`);
  }

  setVolume(vol) {
    this.#volume = Math.max(0, Math.min(1, vol));
  }

  get volume() {
    return this.#volume;
  }

  destroy() {
    if (this.#intervalId) {
      clearTimeout(this.#intervalId);
      clearInterval(this.#intervalId);
    }
    if (this.#audioContext) {
      this.#audioContext.close();
    }
  }
}

export const chimes = new ChimesService();
