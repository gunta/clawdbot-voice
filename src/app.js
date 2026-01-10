// @ts-check
/**
 * CLAWD OS1 - Main Application
 * Orchestrates voice experience with XState navigation and Preact components
 *
 * @module ClawdOS1App
 */

// Enable Preact debug mode for helpful warnings and DevTools support
import 'preact/debug';

/** @typedef {import('./types.js').VoicePersona} VoicePersona */
/** @typedef {import('./types.js').NavigationStateChangeDetail} NavigationStateChangeDetail */

import { navigationService } from './services/navigation-service.js';
import { initNavigationSignals } from './services/navigation-signals.js';
import { componentGate } from './services/component-gate-service.js';
import { isReturningUser, speechSynthesis, wakeLockService, chimes } from './services/index.js';
import { voiceController, speechController, keyboardController } from './controllers/index.js';

// Import all Preact shadow components
import './components/index.js';

/**
 * @typedef {Object} CachedElements
 * @property {HTMLElement|null} assistantCard
 * @property {HTMLElement|null} lobsterCard
 * @property {HTMLElement|null} waveform
 * @property {HTMLElement|null} gpuWaveform
 * @property {HTMLElement|null} transcription
 * @property {HTMLElement|null} speakBtn
 * @property {HTMLElement|null} status
 */

class ClawdOS1App {
  /** @type {Partial<CachedElements>} */
  #elements = {};

  /**
   * Initialize the application
   * @returns {Promise<void>}
   */
  async init() {
    // Initialize navigation (XState + Signals)
    await this.#initNavigation();

    // Initialize component gate worker
    await this.#initComponentGate();

    this.#cacheElements();
    this.#initControllers();
    this.#setupKeyboard();
    this.#setupServiceWorker();
    this.#initWakeLock();
    this.#initChimes();
    this.#greetReturningUser();

    console.log('[CLAWD] OS1 initialized with Preact shadow components');
  }

  /**
   * Initialize XState navigation service and Preact signals
   * @returns {Promise<void>}
   */
  async #initNavigation() {
    // Initialize XState navigation service
    navigationService.init();

    // Initialize Preact Signals wrapper
    initNavigationSignals();

    // Expose navigation service for debugging
    this.navigation = navigationService;

    // Log navigation state changes in development
    if (location.hostname === 'localhost') {
      navigationService.addEventListener('state-change', (e) => {
        console.log('[Navigation]', e.detail.state, {
          current: e.detail.context.current?.id,
          canBack: e.detail.canGoBack,
          canForward: e.detail.canGoForward,
        });
      });
    }

    console.log('[CLAWD] Navigation service initialized');
  }

  /**
   * Initialize component gate service
   * @returns {Promise<void>}
   */
  async #initComponentGate() {
    try {
      await componentGate.init();
      console.log('[CLAWD] Component gate initialized');
    } catch (error) {
      console.warn('[CLAWD] Component gate initialization failed:', error);
    }
  }

  #cacheElements() {
    this.#elements = {
      assistantCard: document.getElementById('assistantCard'),
      lobsterCard: document.getElementById('lobsterCard'),
      waveform: document.getElementById('waveform'),
      gpuWaveform: document.getElementById('gpuWaveform'),
      transcription: document.getElementById('transcription'),
      speakBtn: document.getElementById('speakBtn'),
      status: document.getElementById('status'),
    };
    
    // Debug: verify gpuWaveform is found
    if (!this.#elements.gpuWaveform) {
      console.warn('[CLAWD] gpuWaveform element not found!');
    }
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
    if (!('serviceWorker' in navigator)) return;

    const isLocalhost =
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname === '[::1]';
    const isDevLike = isLocalhost || location.protocol === 'file:';

    // Dev: disable SW to avoid caching headaches during iteration.
    if (isDevLike) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[SW] Unregistered:', registration.scope);
        }

        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
          console.log('[SW] Cache deleted:', name);
        }

        if (registrations.length || cacheNames.length) {
          console.log('[SW] Service worker and caches cleared (dev)');
        }
      } catch (err) {
        console.warn('[SW] Cleanup failed (dev):', err);
      }
      return;
    }

    // Prod: register SW for offline + faster reloads.
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[SW] Registered:', registration.scope);
    } catch (err) {
      console.warn('[SW] Registration failed:', err);
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
