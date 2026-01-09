/**
 * CLAWD OS1 - Main Application
 * Orchestrates voice experience
 */

import { isReturningUser, speechSynthesis, wakeLockService, chimes } from './services/index.js';
import { voiceController, speechController, keyboardController } from './controllers/index.js';
import './components/index.js';

class ClawdOS1App {
  #elements = {};

  async init() {
    this.#cacheElements();
    this.#initControllers();
    this.#setupKeyboard();
    this.#setupServiceWorker();
    this.#initWakeLock();
    this.#initChimes();
    this.#greetReturningUser();

    console.log('[CLAWD] OS1 initialized');
  }

  #cacheElements() {
    this.#elements = {
      assistantCard: document.getElementById('assistantCard'),
      lobsterCard: document.getElementById('lobsterCard'),
      waveform: document.getElementById('waveform'),
      transcription: document.getElementById('transcription'),
      speakBtn: document.getElementById('speakBtn'),
      status: document.getElementById('status'),
    };
  }

  #initControllers() {
    // Initialize controllers with elements
    voiceController.init(this.#elements);
    speechController.init(this.#elements);

    // Listen to controller events
    voiceController.addEventListener('playing', (e) => {
      this.#updateStatus(`${e.detail.voice} speaks...`);
      speechController.selectedVoice = e.detail.voice;
    });

    voiceController.addEventListener('idle', () => {
      if (!speechController.isSpeaking && !speechController.isListening) {
        this.#updateStatus('ready');
      }
    });

    voiceController.addEventListener('error', (e) => {
      this.#updateStatus(e.detail.message);
    });

    speechController.addEventListener('listening-start', () => {
      this.#updateStatus('listening...');
    });

    speechController.addEventListener('speaking-start', (e) => {
      this.#updateStatus(`${e.detail.voice} speaks...`);
    });

    speechController.addEventListener('idle', () => {
      if (!voiceController.isPlaying) {
        this.#updateStatus('ready');
      }
    });

    speechController.addEventListener('error', (e) => {
      this.#updateStatus(e.detail.message);
    });
  }

  #setupKeyboard() {
    keyboardController.register({
      onSpace: () => {
        if (voiceController.isPlaying || speechController.isSpeaking || speechController.isListening) {
          this.#stopAll();
        } else {
          speechController.toggleListening();
        }
      },
      onOne: () => voiceController.play('her'),
      onTwo: () => voiceController.play('clawd'),
      onEscape: () => this.#stopAll(),
    });
  }

  #stopAll() {
    voiceController.stop();
    speechController.stop();
  }

  async #setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('[SW] Registered:', reg.scope);
      } catch (err) {
        console.warn('[SW] Failed:', err);
      }
    }
  }

  #initWakeLock() {
    // Keep screen awake while app is open (for continuous listening)
    wakeLockService.init();
  }

  #initChimes() {
    // Initialize clock chimes at :00 and :30
    chimes.initClock();
    // Expose for testing: window.clawdOS1.chimes.listening() etc.
    this.chimes = chimes;
  }

  #greetReturningUser() {
    if (isReturningUser(2)) {
      setTimeout(() => speechSynthesis.speak('Welcome back.'), 2500);
    }
  }

  #updateStatus(text) {
    this.#elements.status?.update(text);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.clawdOS1 = new ClawdOS1App();
  window.clawdOS1.init();
});

export default ClawdOS1App;
