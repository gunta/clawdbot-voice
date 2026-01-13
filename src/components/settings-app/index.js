/**
 * Settings App Component
 * Application settings and preferences
 * Migrated to Preact + HTM + Signals
 */
import { html } from 'htm/preact';
import { useSignal, useSignalEffect, computed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { createShadowComponent } from '../shared/shadow-component.js';
import { ErrorBoundary } from '../shared/error-boundary.js';
import { navigate } from '../../services/navigation-signals.js';
import { getConfig, updateConfig, DEFAULT_CONFIG } from '../../services/agentfs.js';
import { systemSounds, navigationService } from '../../services/index.js';

function SettingsApp({ host }) {
  const isOpen = useSignal(false);
  const config = useSignal(null);
  const isLoading = useSignal(true);

  // Slider display values
  const voiceRateDisplay = computed(() => {
    const rate = config.value?.voice?.rate ?? 1.0;
    return `${rate.toFixed(1)}×`;
  });

  const voicePitchDisplay = computed(() => {
    const pitch = config.value?.voice?.pitch ?? 1.0;
    return pitch.toFixed(1);
  });

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Subscribe to navigation service
  useEffect(() => {
    const unsubscribe = navigationService.subscribe(() => {
      const isSettingsModal = navigationService.isModalPresented('settings');

      if (isSettingsModal && !isOpen.value) {
        showModal();
      } else if (!isSettingsModal && isOpen.value) {
        hideModal();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Keyboard handler for Escape key
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && isOpen.value) {
        e.preventDefault();
        handleClose();
      }
    };

    if (isOpen.value) {
      document.addEventListener('keydown', handleKeydown);
      return () => document.removeEventListener('keydown', handleKeydown);
    }
  }, [isOpen.value]);

  const loadConfig = async () => {
    try {
      isLoading.value = true;
      const loadedConfig = await getConfig();
      config.value = loadedConfig || { ...DEFAULT_CONFIG };
    } catch (err) {
      console.error('[SettingsApp] Failed to load config:', err);
      config.value = { ...DEFAULT_CONFIG };
    } finally {
      isLoading.value = false;
    }
  };

  const showModal = async () => {
    if (isOpen.value) return;
    isOpen.value = true;
    host.setAttribute('open', '');
    await loadConfig();
    console.log('[SettingsApp] Opened');
  };

  const hideModal = () => {
    if (!isOpen.value) return;
    isOpen.value = false;
    host.removeAttribute('open');
    console.log('[SettingsApp] Closed');
  };

  const handleClose = () => {
    systemSounds.close();
    navigate.dismiss();
  };

  const handleBack = () => {
    systemSounds.close();
    navigate.back();
  };

  const updateConfigValue = async (path, value) => {
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
      const newConfig = await updateConfig(update);
      config.value = newConfig;
      systemSounds.tap();

      // Dispatch config-change event
      host.dispatchEvent(new CustomEvent('config-change', {
        bubbles: true,
        detail: { path, value, config: newConfig }
      }));

      console.log('[SettingsApp] Config updated:', path, '=', value);
    } catch (err) {
      console.error('[SettingsApp] Failed to update config:', err);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm('Reset all settings to defaults?')) return;

    try {
      const newConfig = await updateConfig(DEFAULT_CONFIG);
      config.value = newConfig;
      systemSounds.success();

      host.dispatchEvent(new CustomEvent('config-change', {
        bubbles: true,
        detail: { path: '*', value: DEFAULT_CONFIG, config: newConfig }
      }));

      console.log('[SettingsApp] Config reset to defaults');
    } catch (err) {
      console.error('[SettingsApp] Failed to reset config:', err);
    }
  };

  // Expose public API
  host.open = () => {
    systemSounds.open();
    navigationService.present('settings');
  };

  host.close = () => {
    systemSounds.close();
    navigationService.dismiss();
  };

  host.toggle = () => {
    isOpen.value ? host.close() : host.open();
  };

  if (!Object.getOwnPropertyDescriptor(host, 'isOpen')) {
    Object.defineProperty(host, 'isOpen', {
      configurable: true,
      get: () => isOpen.value
    });
  }

  if (isLoading.value || !config.value) {
    return html`
      <${ErrorBoundary} name="SettingsApp">
        <div class="header">
          <div class="header-left">
            <button class="back-btn" type="button" onClick=${handleBack} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" />
              </svg>
            </button>
            <span class="title">settings</span>
          </div>
          <button class="close-btn" type="button" onClick=${handleClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div class="content">
          <div class="settings-scroll">
            <p style="text-align: center; color: oklch(1 0 0 / 0.5); padding: 2rem;">Loading settings...</p>
          </div>
        </div>
      <//>
    `;
  }

  return html`
    <${ErrorBoundary} name="SettingsApp">
      <div class="header">
        <div class="header-left">
          <button class="back-btn" type="button" onClick=${handleBack} aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <span class="title">settings</span>
        </div>
        <button class="close-btn" type="button" onClick=${handleClose} aria-label="Close settings">
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
                <select
                  class="select-control"
                  value=${config.value.voice?.character || 'her'}
                  onChange=${(e) => updateConfigValue('voice.character', e.target.value)}
                >
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
                <select
                  class="select-control"
                  value=${config.value.voice?.provider || 'native'}
                  onChange=${(e) => updateConfigValue('voice.provider', e.target.value)}
                >
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
                <input
                  type="range"
                  class="range-slider"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value=${config.value.voice?.rate || 1}
                  onInput=${(e) => {
                    // Update config on change (not just input for performance)
                  }}
                  onChange=${(e) => updateConfigValue('voice.rate', parseFloat(e.target.value))}
                />
                <span class="slider-value">${voiceRateDisplay}</span>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">pitch</span>
                <span class="setting-description">voice tone</span>
              </div>
              <div class="setting-control slider-control">
                <input
                  type="range"
                  class="range-slider"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value=${config.value.voice?.pitch || 1}
                  onChange=${(e) => updateConfigValue('voice.pitch', parseFloat(e.target.value))}
                />
                <span class="slider-value">${voicePitchDisplay}</span>
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
                  <input
                    type="checkbox"
                    checked=${config.value.audio?.haptics ?? true}
                    onChange=${(e) => updateConfigValue('audio.haptics', e.target.checked)}
                  />
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
                  <input
                    type="checkbox"
                    checked=${config.value.audio?.chimes ?? true}
                    onChange=${(e) => updateConfigValue('audio.chimes', e.target.checked)}
                  />
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
                  <input
                    type="checkbox"
                    checked=${config.value.display?.wakeLock ?? true}
                    onChange=${(e) => updateConfigValue('display.wakeLock', e.target.checked)}
                  />
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
                  <input
                    type="checkbox"
                    checked=${config.value.display?.animations ?? true}
                    onChange=${(e) => updateConfigValue('display.animations', e.target.checked)}
                  />
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
                <select
                  class="select-control"
                  value=${config.value.theme || 'dark'}
                  onChange=${(e) => updateConfigValue('theme', e.target.value)}
                >
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
                <span class="setting-value">${config.value.version || '1.0.0'}</span>
              </div>
            </div>

            <div class="setting-row action-row">
              <button class="action-btn" type="button" onClick=${handleResetToDefaults}>
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
    <//>
  `;
}

export default createShadowComponent(SettingsApp, {
  tag: 'settings-app',
  styleUrl: new URL('./styles.css', import.meta.url).href,
});
