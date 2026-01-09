/**
 * Voice Controller
 * Handles voice selection and audio playback
 */

import { audioPlayer, speechSynthesis, haptic } from '../services/index.js';

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
    this.select('clawd');
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
      this.dispatchEvent(new CustomEvent('idle'));
    });

    audioPlayer.addEventListener('stop', () => {
      this.#isPlaying = false;
      this.#clearPlaying();
      this.#elements.waveform.active = false;
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

  select(voice) {
    this.#selectedVoice = voice;
    
    if (this.#elements.assistantCard) {
      this.#elements.assistantCard.selected = voice === 'her';
    }
    if (this.#elements.lobsterCard) {
      this.#elements.lobsterCard.selected = voice === 'clawd';
    }
    
    haptic('light');
  }

  async play(voice) {
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

    if (!audioSrc) return;

    // Update UI
    this.#markPlaying(voice);
    this.#elements.waveform.active = true;
    
    this.dispatchEvent(new CustomEvent('playing', { detail: { voice } }));

    try {
      await audioPlayer.play(audioSrc, {
        title: voice === 'her' ? 'Her' : 'Clawd',
      });
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
