/**
 * Audio Player Service
 * Handles audio playback with Web Audio analysis
 */

import { audioAnalyzer } from './audio-analyzer.js';

class AudioPlayerService extends EventTarget {
  #audio = null;
  #isPlaying = false;

  constructor() {
    super();
    // Create a reusable audio element
    this.#audio = new Audio();
    this.#audio.addEventListener('ended', () => this.#handleEnded());
    this.#audio.addEventListener('error', (e) => this.#handleError(e));
  }

  /**
   * Play an audio file
   * @param {string} src - Audio source URL
   * @param {object} options - Playback options
   * @returns {Promise<void>}
   */
  async play(src, options = {}) {
    // Stop any current playback
    this.stop();

    // Set new source
    this.#audio.src = src;
    this.#isPlaying = true;

    // Setup media session
    if (options.title) {
      this.#setupMediaSession(options);
    }

    try {
      // Start simulated audio analysis for visualization
      audioAnalyzer.startSpeechAnalysis();
      
      await this.#audio.play();
      this.dispatchEvent(new CustomEvent('play', { detail: { src } }));
    } catch (err) {
      console.error('[AudioPlayer] Playback failed:', err);
      this.#handleError(err);
      throw err;
    }
  }

  /**
   * Stop current playback
   */
  stop() {
    const wasPlaying = this.#isPlaying;
    
    if (this.#audio && wasPlaying) {
      this.#audio.pause();
      this.#audio.currentTime = 0;
    }

    this.#isPlaying = false;
    audioAnalyzer.stopAnalysis();
    
    // Only dispatch stop event if we were actually playing
    if (wasPlaying) {
      this.dispatchEvent(new CustomEvent('stop'));
    }
  }

  /**
   * Check if currently playing
   * @returns {boolean}
   */
  get isPlaying() {
    return this.#isPlaying;
  }

  #handleEnded() {
    this.#isPlaying = false;
    audioAnalyzer.stopAnalysis();
    this.dispatchEvent(new CustomEvent('ended'));
  }

  #handleError(error) {
    this.#isPlaying = false;
    audioAnalyzer.stopAnalysis();
    this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
  }

  #setupMediaSession({ title, artist = 'Clawd', album = 'A Voice Experience' }) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: [
        { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' },
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.setActionHandler('pause', () => this.stop());
    navigator.mediaSession.setActionHandler('stop', () => this.stop());
  }
}

export const audioPlayer = new AudioPlayerService();
export default audioPlayer;
