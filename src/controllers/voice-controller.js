/**
 * Voice Controller
 * Handles voice selection and audio playback
 */

import { audioPlayer, speechSynthesis, haptic, chimes } from '../services/index.js';

class VoiceController extends EventTarget {
  #selectedVoice = 'clawd';
  #isPlaying = false;
  #elements = {};

  constructor() {
    super();
  }

  init(elements) {
    this.#elements = elements;
    this.#bindEvents();
    this.select('clawd', { silent: true }); // Skip haptic on initial selection
  }

  #bindEvents() {
    // Voice card selection
    document.addEventListener('voice-select', (e) => {
      this.play(e.detail.voice);
    });

    // Audio events
    audioPlayer.addEventListener('play', () => {
      this.#isPlaying = true;
    });

    audioPlayer.addEventListener('ended', () => {
      this.#isPlaying = false;
      this.#clearPlaying();
      this.#elements.waveform.active = false;
      if (this.#elements.gpuWaveform) this.#elements.gpuWaveform.active = false;
      this.dispatchEvent(new CustomEvent('idle'));
    });

    audioPlayer.addEventListener('stop', () => {
      this.#isPlaying = false;
      this.#clearPlaying();
      this.#elements.waveform.active = false;
      if (this.#elements.gpuWaveform) this.#elements.gpuWaveform.active = false;
      this.dispatchEvent(new CustomEvent('idle'));
    });

    audioPlayer.addEventListener('error', () => {
      this.dispatchEvent(new CustomEvent('error', { detail: { message: 'audio error' } }));
    });
  }

  get selected() {
    return this.#selectedVoice;
  }

  get isPlaying() {
    return this.#isPlaying;
  }

  select(voice, { silent = false } = {}) {
    this.#selectedVoice = voice;
    
    if (this.#elements.assistantCard) {
      this.#elements.assistantCard.selected = voice === 'her';
    }
    if (this.#elements.lobsterCard) {
      this.#elements.lobsterCard.selected = voice === 'clawd';
    }
    
    if (!silent) {
      haptic('light');
    }
  }

  async play(voice) {
    console.log('[Voice] Playing:', voice);
    
    // Stop current audio
    audioPlayer.stop();
    speechSynthesis.cancel();

    // Select this voice
    this.select(voice);

    // Get audio source from card
    const card = voice === 'her' 
      ? this.#elements.assistantCard 
      : this.#elements.lobsterCard;
    const audioSrc = card?.getAttribute('audio-src');

    console.log('[Voice] Audio src:', audioSrc, 'Card:', card);

    if (!audioSrc) {
      console.warn('[Voice] No audio source found');
      return;
    }

    // Update UI
    this.#markPlaying(voice);
    this.#elements.waveform.active = true;
    if (this.#elements.gpuWaveform) this.#elements.gpuWaveform.active = true;
    
    // Play chime before voice starts
    if (voice === 'her') {
      chimes.herSpeaking();
    } else {
      chimes.clawdSpeaking();
    }
    
    console.log('[Voice] UI updated, playing state set');
    this.dispatchEvent(new CustomEvent('playing', { detail: { voice } }));

    try {
      await audioPlayer.play(audioSrc, {
        title: voice === 'her' ? 'Her' : 'Clawd',
      });
      console.log('[Voice] Audio started');
    } catch (err) {
      console.error('[Voice] Playback failed:', err);
      this.dispatchEvent(new CustomEvent('error', { detail: { message: 'audio error' } }));
    }
  }

  stop() {
    audioPlayer.stop();
  }

  #markPlaying(voice) {
    if (this.#elements.assistantCard) {
      this.#elements.assistantCard.playing = voice === 'her';
    }
    if (this.#elements.lobsterCard) {
      this.#elements.lobsterCard.playing = voice === 'clawd';
    }
  }

  #clearPlaying() {
    if (this.#elements.assistantCard) {
      this.#elements.assistantCard.playing = false;
    }
    if (this.#elements.lobsterCard) {
      this.#elements.lobsterCard.playing = false;
    }
  }
}

export const voiceController = new VoiceController();
