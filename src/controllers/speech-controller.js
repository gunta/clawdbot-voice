/**
 * Speech Controller
 * Handles speech recognition and synthesis events
 */

import { 
  speechRecognition, 
  speechSynthesis, 
  generateResponse, 
  haptic,
  chimes 
} from '../services/index.js';

class SpeechController extends EventTarget {
  #isListening = false;
  #isSpeaking = false;
  #elements = {};
  #selectedVoice = 'clawd';

  constructor() {
    super();
  }

  init(elements) {
    this.#elements = elements;
    this.#bindEvents();
  }

  #bindEvents() {
    // Speak button toggle
    document.addEventListener('speak-toggle', () => {
      this.toggleListening();
    });

    // Speech recognition events
    speechRecognition.addEventListener('start', () => {
      this.#isListening = true;
      this.#elements.speakBtn.listening = true;
      this.#elements.transcription.active = true;
      haptic('light');
      chimes.listening();
      this.dispatchEvent(new CustomEvent('listening-start'));
    });

    speechRecognition.addEventListener('interim', (e) => {
      this.#elements.transcription.update(e.detail.transcript, true);
    });

    speechRecognition.addEventListener('result', (e) => {
      this.#elements.transcription.update(e.detail.transcript, false);
      this.#handleUserSpeech(e.detail.transcript);
    });

    speechRecognition.addEventListener('end', () => {
      this.#isListening = false;
      this.#elements.speakBtn.listening = false;
      this.#elements.transcription.active = false;
      if (!this.#isSpeaking) {
        this.dispatchEvent(new CustomEvent('idle'));
      }
    });

    speechRecognition.addEventListener('error', (e) => {
      this.#isListening = false;
      this.#elements.speakBtn.listening = false;
      
      if (e.detail.error === 'not-allowed') {
        this.#elements.transcription.update('Please allow microphone access', false);
        this.dispatchEvent(new CustomEvent('error', { 
          detail: { message: 'microphone denied' } 
        }));
      } else {
        this.dispatchEvent(new CustomEvent('idle'));
      }
    });

    // Speech synthesis events
    speechSynthesis.addEventListener('start', (e) => {
      this.#isSpeaking = true;
      this.#elements.transcription.update(e.detail.text, false);
      this.#elements.waveform.active = true;
      
      // Play chime when AI starts speaking
      if (this.#selectedVoice === 'her') {
        chimes.herSpeaking();
      } else {
        chimes.clawdSpeaking();
      }
      
      this.dispatchEvent(new CustomEvent('speaking-start', { 
        detail: { voice: this.#selectedVoice } 
      }));
    });

    speechSynthesis.addEventListener('end', () => {
      this.#isSpeaking = false;
      this.#elements.waveform.active = false;
      this.dispatchEvent(new CustomEvent('idle'));
    });
  }

  get isListening() {
    return this.#isListening;
  }

  get isSpeaking() {
    return this.#isSpeaking;
  }

  set selectedVoice(voice) {
    this.#selectedVoice = voice;
  }

  toggleListening() {
    if (this.#isListening) {
      speechRecognition.stop();
      return;
    }

    if (this.#isSpeaking) {
      speechSynthesis.cancel();
    }

    speechRecognition.start();
  }

  stopListening() {
    speechRecognition.stop();
  }

  cancelSpeaking() {
    speechSynthesis.cancel();
  }

  stop() {
    this.stopListening();
    this.cancelSpeaking();
  }

  #handleUserSpeech(transcript) {
    console.log('[Speech] User:', transcript);

    const response = generateResponse(transcript, this.#selectedVoice);

    // Speak after a short pause
    setTimeout(() => {
      speechSynthesis.speak(response);
    }, 600);
  }
}

export const speechController = new SpeechController();
