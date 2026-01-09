/**
 * Speech Recognition Service
 * Voice-to-text with real-time transcription
 */

class SpeechRecognitionService extends EventTarget {
  #recognition = null;
  #isListening = false;

  constructor() {
    super();
    this.#initRecognition();
  }

  /**
   * Check if speech recognition is supported
   * @returns {boolean}
   */
  get isSupported() {
    return !!this.#recognition;
  }

  /**
   * Check if currently listening
   * @returns {boolean}
   */
  get isListening() {
    return this.#isListening;
  }

  /**
   * Start listening for speech
   * @returns {boolean} True if started successfully
   */
  start() {
    if (!this.#recognition) {
      this.dispatchEvent(new CustomEvent('error', { 
        detail: { error: 'not-supported', message: 'Speech recognition not available' }
      }));
      return false;
    }

    if (this.#isListening) {
      this.stop();
      return false;
    }

    try {
      this.#recognition.start();
      return true;
    } catch (e) {
      console.warn('[SpeechRecognition] Could not start:', e);
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop() {
    this.#recognition?.stop();
  }

  #initRecognition() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.warn('[SpeechRecognition] Not supported in this browser');
      return;
    }

    this.#recognition = new SpeechRecognitionAPI();
    this.#recognition.continuous = false;
    this.#recognition.interimResults = true;
    this.#recognition.lang = 'en-US';

    this.#recognition.onstart = () => {
      this.#isListening = true;
      this.dispatchEvent(new CustomEvent('start'));
    };

    this.#recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        this.dispatchEvent(new CustomEvent('interim', { 
          detail: { transcript: interimTranscript }
        }));
      }

      if (finalTranscript) {
        this.dispatchEvent(new CustomEvent('result', { 
          detail: { transcript: finalTranscript }
        }));
      }
    };

    this.#recognition.onend = () => {
      this.#isListening = false;
      this.dispatchEvent(new CustomEvent('end'));
    };

    this.#recognition.onerror = (event) => {
      this.#isListening = false;
      this.dispatchEvent(new CustomEvent('error', { 
        detail: { error: event.error, message: this.#getErrorMessage(event.error) }
      }));
    };
  }

  #getErrorMessage(error) {
    const messages = {
      'not-allowed': 'Please allow microphone access',
      'no-speech': 'No speech detected',
      'network': 'Network error occurred',
      'aborted': 'Recognition aborted',
    };
    return messages[error] ?? 'Recognition error';
  }
}

export const speechRecognition = new SpeechRecognitionService();
export default speechRecognition;
