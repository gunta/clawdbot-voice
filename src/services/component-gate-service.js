/**
 * Component Gate Service
 * Main-thread interface for the component validation worker
 * Validates and safely loads AI-generated component code
 */
import * as Comlink from 'comlink';

/**
 * Component Gate Service class
 * Manages worker lifecycle and provides validation API
 */
class ComponentGateService {
  #worker = null;
  #gate = null;
  #initialized = false;

  /**
   * Initialize the worker and Comlink connection
   */
  async init() {
    if (this.#initialized) return;

    try {
      this.#worker = new Worker(
        new URL('../workers/component-gate.worker.js', import.meta.url),
        { type: 'module' }
      );
      this.#gate = Comlink.wrap(this.#worker);
      this.#initialized = true;
      console.log('[ComponentGate] Worker initialized');
    } catch (error) {
      console.error('[ComponentGate] Failed to initialize worker:', error);
      throw error;
    }
  }

  /**
   * Ensure worker is initialized
   * @private
   */
  async #ensureInit() {
    if (!this.#gate) {
      await this.init();
    }
  }

  /**
   * Validate component code
   * @param {string} code - JavaScript code to validate
   * @returns {Promise<Object>} Validation result
   */
  async validate(code) {
    await this.#ensureInit();
    return this.#gate.validate(code);
  }

  /**
   * Analyze component code and extract metadata
   * @param {string} code - JavaScript code to analyze
   * @returns {Promise<Object>} Component metadata
   */
  async analyze(code) {
    await this.#ensureInit();
    return this.#gate.analyze(code);
  }

  /**
   * Check code syntax
   * @param {string} code - Code to check
   * @returns {Promise<Object>} Syntax check result
   */
  async checkSyntax(code) {
    await this.#ensureInit();
    return this.#gate.checkSyntax(code);
  }

  /**
   * Validate and load component code if valid
   * @param {string} code - JavaScript code to validate and load
   * @returns {Promise<Object>} Loaded module exports
   * @throws {Error} If validation fails
   */
  async loadValidated(code) {
    const result = await this.validate(code);

    if (!result.valid) {
      const errorMessages = result.issues.map(i => `- ${i.message}`).join('\n');
      throw new Error(`Component validation failed:\n${errorMessages}`);
    }

    // Log warnings but don't block
    if (result.warnings?.length > 0) {
      console.warn('[ComponentGate] Warnings:', result.warnings);
    }

    // Create blob URL for dynamic import
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    try {
      const module = await import(/* @vite-ignore */ url);
      console.log('[ComponentGate] Component loaded successfully');
      return module;
    } catch (error) {
      console.error('[ComponentGate] Failed to load component:', error);
      throw new Error(`Failed to load component: ${error.message}`);
    } finally {
      // Clean up blob URL
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Validate, analyze, and load component with full report
   * @param {string} code - JavaScript code
   * @returns {Promise<Object>} Full result with validation, analysis, and module
   */
  async processComponent(code) {
    const [validation, analysis, syntax] = await Promise.all([
      this.validate(code),
      this.analyze(code),
      this.checkSyntax(code),
    ]);

    const result = {
      validation,
      analysis,
      syntax,
      module: null,
      loaded: false,
    };

    if (validation.valid && syntax.valid) {
      try {
        result.module = await this.loadValidated(code);
        result.loaded = true;
      } catch (error) {
        result.loadError = error.message;
      }
    }

    return result;
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
      this.#gate = null;
      this.#initialized = false;
      console.log('[ComponentGate] Worker terminated');
    }
  }
}

// Export singleton instance
export const componentGate = new ComponentGateService();

// Also export class for testing or multiple instances
export { ComponentGateService };
