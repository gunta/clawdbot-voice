/**
 * Audio Analyzer Service
 * Simulated audio analysis for waveform visualizations
 */

class AudioAnalyzerService extends EventTarget {
  #animationId = null;
  #isAnalyzing = false;

  constructor() {
    super();
  }

  /**
   * Start simulated audio analysis for visualization
   * Creates organic, speech-like waveform animation
   */
  startSpeechAnalysis() {
    if (this.#isAnalyzing) return;
    this.#isAnalyzing = true;
    this.#animate();
  }

  /**
   * Stop analysis and reset levels
   */
  stopAnalysis() {
    this.#isAnalyzing = false;
    if (this.#animationId) {
      cancelAnimationFrame(this.#animationId);
      this.#animationId = null;
    }
    
    // Emit zero levels to reset waveform
    this.dispatchEvent(new CustomEvent('levels', {
      detail: { levels: new Array(8).fill(0), average: 0 }
    }));
  }

  #animate() {
    if (!this.#isAnalyzing) return;

    // Generate organic, speech-like levels
    const time = performance.now() / 1000;
    const levels = [];
    let total = 0;

    for (let i = 0; i < 8; i++) {
      // Combine multiple sine waves for natural movement
      const level = 0.3 + 
        0.3 * Math.sin(time * 8 + i * 0.5) +
        0.2 * Math.sin(time * 12 + i * 0.8) +
        0.1 * Math.sin(time * 20 + i * 1.2) +
        0.1 * Math.random(); // Add randomness for realism
      
      levels.push(Math.max(0, Math.min(1, level)));
      total += levels[i];
    }

    this.dispatchEvent(new CustomEvent('levels', {
      detail: { levels, average: total / 8 }
    }));

    this.#animationId = requestAnimationFrame(() => this.#animate());
  }
}

export const audioAnalyzer = new AudioAnalyzerService();
export default audioAnalyzer;
