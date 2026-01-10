/**
 * Settings App - OS1 Configuration Panel
 * Beautiful, minimal settings UI following Her aesthetic
 * 
 * Usage: <settings-app></settings-app>
 * Methods: open(), close(), toggle()
 * Events: 'open', 'close', 'config-change'
 * 
 * Now integrates with XState navigation service for modal management
 */

import { getConfig, updateConfig, DEFAULT_CONFIG } from '../services/agentfs.js';
import { systemSounds, navigationService } from '../services/index.js';

export class SettingsApp extends HTMLElement {
  #isOpen = false;
  #config = null;
  #boundHandleKeydown = null;
  #unsubscribeNav = null;

  constructor() {
    super();
    this.#boundHandleKeydown = this.#handleKeydown.bind(this);
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = this.#getTemplate();
    }

    this.#cacheElements();
    this.#bindEvents();
    this.#subscribeToNavigation();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.#boundHandleKeydown);
    if (this.#unsubscribeNav) {
      this.#unsubscribeNav();
      this.#unsubscribeNav = null;
    }
  }

  /**
   * Subscribe to navigation service state changes
   */
  #subscribeToNavigation() {
    this.#unsubscribeNav = navigationService.subscribe(() => {
      const isSettingsModal = navigationService.isModalPresented('settings');
      
      if (isSettingsModal && !this.#isOpen) {
        this.#showModal();
      } else if (!isSettingsModal && this.#isOpen) {
        this.#hideModal();
      }
    });
  }

  /**
   * Show the modal (internal - called by navigation subscription)
   */
  async #showModal() {
    if (this.#isOpen) return;

    this.#isOpen = true;
    this.setAttribute('open', '');
    
    document.addEventListener('keydown', this.#boundHandleKeydown);
    
    await this.#loadConfig();
    
    this.dispatchEvent(new CustomEvent('open'));
    console.log('[SettingsApp] Opened');
  }

  /**
   * Hide the modal (internal - called by navigation subscription)
   */
  #hideModal() {
    if (!this.#isOpen) return;

    this.#isOpen = false;
    this.removeAttribute('open');
    
    document.removeEventListener('keydown', this.#boundHandleKeydown);
    
    this.dispatchEvent(new CustomEvent('close'));
    console.log('[SettingsApp] Closed');
  }

  #getTemplate() {
    return `
      <style>
        /* Critical inline styles to prevent FOUC */
        :host {
          position: fixed;
          inset: 0;
          opacity: 0;
          visibility: hidden;
        }
      </style>
      <link rel="stylesheet" href="src/components/styles/settings-app.css">

      <div class="header">
        <div class="header-left">
          <button class="back-btn" type="button" aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <span class="title">settings</span>
        </div>
        <button class="close-btn" type="button" aria-label="Close settings">
          <svg viewBox="0 0 24 24" fill="none">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>
      
      <div class="content">
        <div class="settings-scroll">
          
          <!-- Voice Section -->
          <section class="settings-section">
            <h2 class="section-title">voice</h2>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">character</span>
                <span class="setting-description">voice persona</span>
              </div>
              <div class="setting-control">
                <select id="voiceCharacter" class="select-control">
                  <option value="her">her</option>
                  <option value="clawd">clawd</option>
                </select>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">provider</span>
                <span class="setting-description">speech synthesis engine</span>
              </div>
              <div class="setting-control">
                <select id="voiceProvider" class="select-control">
                  <option value="native">native</option>
                  <option value="web">web speech</option>
                </select>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">speed</span>
                <span class="setting-description">speaking rate</span>
              </div>
              <div class="setting-control slider-control">
                <input type="range" id="voiceRate" min="0.5" max="2" step="0.1" value="1" class="range-slider">
                <span class="slider-value" id="voiceRateValue">1.0×</span>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">pitch</span>
                <span class="setting-description">voice tone</span>
              </div>
              <div class="setting-control slider-control">
                <input type="range" id="voicePitch" min="0.5" max="2" step="0.1" value="1" class="range-slider">
                <span class="slider-value" id="voicePitchValue">1.0</span>
              </div>
            </div>
          </section>
          
          <!-- Audio Section -->
          <section class="settings-section">
            <h2 class="section-title">audio</h2>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">haptics</span>
                <span class="setting-description">vibration feedback</span>
              </div>
              <div class="setting-control">
                <label class="toggle-switch">
                  <input type="checkbox" id="audioHaptics">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">chimes</span>
                <span class="setting-description">hourly clock sounds</span>
              </div>
              <div class="setting-control">
                <label class="toggle-switch">
                  <input type="checkbox" id="audioChimes">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>
          
          <!-- Display Section -->
          <section class="settings-section">
            <h2 class="section-title">display</h2>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">keep awake</span>
                <span class="setting-description">prevent screen sleep</span>
              </div>
              <div class="setting-control">
                <label class="toggle-switch">
                  <input type="checkbox" id="displayWakeLock">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">animations</span>
                <span class="setting-description">motion effects</span>
              </div>
              <div class="setting-control">
                <label class="toggle-switch">
                  <input type="checkbox" id="displayAnimations">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">theme</span>
                <span class="setting-description">color scheme</span>
              </div>
              <div class="setting-control">
                <select id="displayTheme" class="select-control">
                  <option value="dark">dark</option>
                  <option value="light">light</option>
                  <option value="auto">auto</option>
                </select>
              </div>
            </div>
          </section>
          
          <!-- System Section -->
          <section class="settings-section">
            <h2 class="section-title">system</h2>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">version</span>
                <span class="setting-description">CLAWD OS1</span>
              </div>
              <div class="setting-control">
                <span class="setting-value" id="systemVersion">1.0.0</span>
              </div>
            </div>
            
            <div class="setting-row action-row">
              <button class="action-btn" id="resetBtn" type="button">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                reset to defaults
              </button>
            </div>
          </section>
          
        </div>
      </div>
      
      <div class="footer">
        <span class="footer-text">changes saved automatically</span>
      </div>
    `;
  }

  #cacheElements() {
    const sr = this.shadowRoot;
    this.elements = {
      closeBtn: sr.querySelector('.close-btn'),
      backBtn: sr.querySelector('.back-btn'),
      resetBtn: sr.getElementById('resetBtn'),
      // Voice
      voiceCharacter: sr.getElementById('voiceCharacter'),
      voiceProvider: sr.getElementById('voiceProvider'),
      voiceRate: sr.getElementById('voiceRate'),
      voiceRateValue: sr.getElementById('voiceRateValue'),
      voicePitch: sr.getElementById('voicePitch'),
      voicePitchValue: sr.getElementById('voicePitchValue'),
      // Audio
      audioHaptics: sr.getElementById('audioHaptics'),
      audioChimes: sr.getElementById('audioChimes'),
      // Display
      displayWakeLock: sr.getElementById('displayWakeLock'),
      displayAnimations: sr.getElementById('displayAnimations'),
      displayTheme: sr.getElementById('displayTheme'),
      // System
      systemVersion: sr.getElementById('systemVersion')
    };
  }

  #bindEvents() {
    // Close/back buttons
    this.elements.closeBtn?.addEventListener('click', () => this.close());
    this.elements.backBtn?.addEventListener('click', () => this.close());
    this.elements.resetBtn?.addEventListener('click', () => this.#resetToDefaults());

    // Voice settings
    this.elements.voiceCharacter?.addEventListener('change', (e) => {
      this.#updateConfigValue('voice.character', e.target.value);
    });
    this.elements.voiceProvider?.addEventListener('change', (e) => {
      this.#updateConfigValue('voice.provider', e.target.value);
    });
    this.elements.voiceRate?.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.elements.voiceRateValue.textContent = `${value.toFixed(1)}×`;
    });
    this.elements.voiceRate?.addEventListener('change', (e) => {
      this.#updateConfigValue('voice.rate', parseFloat(e.target.value));
    });
    this.elements.voicePitch?.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.elements.voicePitchValue.textContent = value.toFixed(1);
    });
    this.elements.voicePitch?.addEventListener('change', (e) => {
      this.#updateConfigValue('voice.pitch', parseFloat(e.target.value));
    });

    // Audio settings
    this.elements.audioHaptics?.addEventListener('change', (e) => {
      this.#updateConfigValue('audio.haptics', e.target.checked);
    });
    this.elements.audioChimes?.addEventListener('change', (e) => {
      this.#updateConfigValue('audio.chimes', e.target.checked);
    });

    // Display settings
    this.elements.displayWakeLock?.addEventListener('change', (e) => {
      this.#updateConfigValue('display.wakeLock', e.target.checked);
    });
    this.elements.displayAnimations?.addEventListener('change', (e) => {
      this.#updateConfigValue('display.animations', e.target.checked);
    });
    this.elements.displayTheme?.addEventListener('change', (e) => {
      this.#updateConfigValue('theme', e.target.value);
    });
  }

  #handleKeydown(e) {
    if (e.key === 'Escape' && this.#isOpen) {
      e.preventDefault();
      this.close();
    }
  }

  async #loadConfig() {
    try {
      this.#config = await getConfig();
      this.#populateForm();
    } catch (err) {
      console.error('[SettingsApp] Failed to load config:', err);
      this.#config = { ...DEFAULT_CONFIG };
      this.#populateForm();
    }
  }

  #populateForm() {
    if (!this.#config) return;

    // Voice
    this.elements.voiceCharacter.value = this.#config.voice?.character || 'her';
    this.elements.voiceProvider.value = this.#config.voice?.provider || 'native';
    this.elements.voiceRate.value = this.#config.voice?.rate || 1;
    this.elements.voiceRateValue.textContent = `${(this.#config.voice?.rate || 1).toFixed(1)}×`;
    this.elements.voicePitch.value = this.#config.voice?.pitch || 1;
    this.elements.voicePitchValue.textContent = (this.#config.voice?.pitch || 1).toFixed(1);

    // Audio
    this.elements.audioHaptics.checked = this.#config.audio?.haptics ?? true;
    this.elements.audioChimes.checked = this.#config.audio?.chimes ?? true;

    // Display
    this.elements.displayWakeLock.checked = this.#config.display?.wakeLock ?? true;
    this.elements.displayAnimations.checked = this.#config.display?.animations ?? true;
    this.elements.displayTheme.value = this.#config.theme || 'dark';

    // System
    this.elements.systemVersion.textContent = this.#config.version || '1.0.0';
  }

  async #updateConfigValue(path, value) {
    // Build nested object from dot path
    const parts = path.split('.');
    const update = {};
    let current = update;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;

    try {
      this.#config = await updateConfig(update);
      systemSounds.tap();
      
      this.dispatchEvent(new CustomEvent('config-change', {
        bubbles: true,
        detail: { path, value, config: this.#config }
      }));
      
      console.log('[SettingsApp] Config updated:', path, '=', value);
    } catch (err) {
      console.error('[SettingsApp] Failed to update config:', err);
    }
  }

  async #resetToDefaults() {
    if (!confirm('Reset all settings to defaults?')) return;
    
    try {
      this.#config = await updateConfig(DEFAULT_CONFIG);
      this.#populateForm();
      systemSounds.success();
      
      this.dispatchEvent(new CustomEvent('config-change', {
        bubbles: true,
        detail: { path: '*', value: DEFAULT_CONFIG, config: this.#config }
      }));
      
      console.log('[SettingsApp] Config reset to defaults');
    } catch (err) {
      console.error('[SettingsApp] Failed to reset config:', err);
    }
  }

  // Public API
  open() {
    systemSounds.open();
    navigationService.present('settings');
  }

  close() {
    systemSounds.close();
    navigationService.dismiss();
  }

  toggle() {
    this.#isOpen ? this.close() : this.open();
  }

  get isOpen() {
    return this.#isOpen;
  }
}

customElements.define('settings-app', SettingsApp);
