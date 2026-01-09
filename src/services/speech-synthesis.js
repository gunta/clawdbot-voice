/**
 * Speech Synthesis Service
 * Text-to-speech with voice selection
 */

class SpeechSynthesisService extends EventTarget {
  #synthesis = window.speechSynthesis;
  #selectedVoice = null;
  #isSpeaking = false;

  constructor() {
    super();
    this.#loadVoices();
  }

  /**
   * Check if speech synthesis is supported
   * @returns {boolean}
   */
  get isSupported() {
    return !!this.#synthesis;
  }

  /**
   * Check if currently speaking
   * @returns {boolean}
   */
  get isSpeaking() {
    return this.#isSpeaking;
  }

  /**
   * Get available voices
   * @returns {SpeechSynthesisVoice[]}
   */
  get voices() {
    return this.#synthesis?.getVoices() ?? [];
  }

  /**
   * Speak text with optional configuration
   * @param {string} text - Text to speak
   * @param {object} options - Speech options
   * @returns {Promise<void>}
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.#synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.#selectedVoice;
      utterance.rate = options.rate ?? 0.95;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;

      utterance.onstart = () => {
        this.#isSpeaking = true;
        this.dispatchEvent(new CustomEvent('start', { detail: { text } }));
      };

      utterance.onend = () => {
        this.#isSpeaking = false;
        this.dispatchEvent(new CustomEvent('end'));
        resolve();
      };

      utterance.onerror = (event) => {
        this.#isSpeaking = false;
        this.dispatchEvent(new CustomEvent('error', { detail: { error: event } }));
        reject(event);
      };

      this.#synthesis.speak(utterance);
    });
  }

  /**
   * Cancel current speech
   */
  cancel() {
    this.#synthesis?.cancel();
    this.#isSpeaking = false;
  }

  #loadVoices() {
    if (!this.#synthesis) return;

    const selectVoice = () => {
      const voices = this.#synthesis.getVoices();
      
      // Prefer natural-sounding English voices
      this.#selectedVoice = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Karen') ||
        v.name.includes('Moira') ||
        v.name.includes('Google UK English Female') ||
        v.lang.startsWith('en')
      ) ?? voices[0];
    };

    selectVoice();
    
    if (this.#synthesis.onvoiceschanged !== undefined) {
      this.#synthesis.onvoiceschanged = selectVoice;
    }
  }
}

export const speechSynthesis = new SpeechSynthesisService();
export default speechSynthesis;
