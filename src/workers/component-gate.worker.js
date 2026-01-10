/**
 * Component Gate Worker
 * Off-main-thread validation for AI-generated component code
 * Uses Comlink for seamless worker communication
 */
import * as Comlink from 'comlink';

/**
 * Security patterns that are forbidden in component code
 */
const FORBIDDEN_PATTERNS = [
  { pattern: /\beval\s*\(/, message: 'eval() is forbidden - use safe alternatives' },
  { pattern: /\bFunction\s*\(/, message: 'Function() constructor is forbidden' },
  { pattern: /\.innerHTML\s*=/, message: 'Direct innerHTML assignment is forbidden - use framework methods' },
  { pattern: /document\.write\s*\(/, message: 'document.write is forbidden' },
  { pattern: /\b(?:localStorage|sessionStorage)\b/, message: 'Direct storage access forbidden - use app context' },
  { pattern: /document\.cookie/, message: 'Direct cookie access is forbidden' },
  { pattern: /new\s+Worker\s*\(/, message: 'Creating workers from components is forbidden' },
  { pattern: /importScripts\s*\(/, message: 'importScripts is forbidden' },
  { pattern: /\.__proto__/, message: 'Prototype manipulation is forbidden' },
  { pattern: /Object\.setPrototypeOf/, message: 'Prototype manipulation is forbidden' },
];

/**
 * Required patterns that must be present in valid components
 */
const REQUIRED_PATTERNS = [
  {
    pattern: /attachShadow|shadowRoot|createShadowComponent/,
    message: 'Component must use Shadow DOM (attachShadow, shadowRoot, or createShadowComponent)'
  },
  {
    pattern: /contain:\s*content|:host\s*\{[^}]*contain/,
    message: 'Component must include CSS containment (contain: content)'
  },
];

/**
 * Warning patterns - not blocking but flagged
 */
const WARNING_PATTERNS = [
  { pattern: /console\.(log|warn|error|debug)/, message: 'Consider removing console statements for production' },
  { pattern: /debugger/, message: 'Debugger statement found' },
  { pattern: /TODO|FIXME|HACK/, message: 'Unresolved TODO/FIXME/HACK comment found' },
];

const ComponentGate = {
  /**
   * Validate component code for security and requirements
   * @param {string} code - JavaScript code to validate
   * @returns {Object} Validation result with valid flag and issues array
   */
  async validate(code) {
    const issues = [];
    const warnings = [];

    // Check forbidden patterns
    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
      if (pattern.test(code)) {
        issues.push({ type: 'security', severity: 'error', message });
      }
    }

    // Check required patterns
    for (const { pattern, message } of REQUIRED_PATTERNS) {
      if (!pattern.test(code)) {
        issues.push({ type: 'requirement', severity: 'error', message });
      }
    }

    // Check warning patterns
    for (const { pattern, message } of WARNING_PATTERNS) {
      if (pattern.test(code)) {
        warnings.push({ type: 'quality', severity: 'warning', message });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      stats: {
        linesOfCode: code.split('\n').length,
        hasExports: /export\s+(default\s+)?/.test(code),
        hasImports: /import\s+/.test(code),
      }
    };
  },

  /**
   * Analyze component code and extract metadata
   * @param {string} code - JavaScript code to analyze
   * @returns {Object} Component metadata
   */
  async analyze(code) {
    // Extract exports
    const exportMatches = code.match(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g) || [];
    const exports = exportMatches.map(e =>
      e.replace(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+/, '')
    );

    // Extract imports
    const importMatches = code.match(/import\s+.*from\s+['"][^'"]+['"]/g) || [];

    // Extract custom elements
    const elementMatches = code.match(/customElements\.define\s*\(\s*['"]([^'"]+)['"]/g) || [];
    const customElements = elementMatches.map(e => {
      const match = e.match(/['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    }).filter(Boolean);

    // Extract component names from createShadowComponent calls
    const shadowComponentMatches = code.match(/createShadowComponent\s*\(\s*(\w+)/g) || [];
    const shadowComponents = shadowComponentMatches.map(e =>
      e.replace(/createShadowComponent\s*\(\s*/, '')
    );

    // Detect signals usage
    const usesSignals = /useSignal|useComputed|signal|computed/.test(code);

    // Detect error boundary
    const hasErrorBoundary = /ErrorBoundary|withErrorBoundary/.test(code);

    return {
      exports,
      imports: importMatches,
      customElements,
      shadowComponents,
      usesSignals,
      hasErrorBoundary,
      estimatedComplexity: this._estimateComplexity(code),
    };
  },

  /**
   * Simple complexity estimation
   * @private
   */
  _estimateComplexity(code) {
    let score = 0;

    // Count conditional statements
    score += (code.match(/if\s*\(|switch\s*\(|\?\s*:/g) || []).length * 1;

    // Count loops
    score += (code.match(/for\s*\(|while\s*\(|\.map\(|\.forEach\(|\.filter\(/g) || []).length * 2;

    // Count functions
    score += (code.match(/function\s+\w+|=>\s*{|=>\s*[^{]/g) || []).length * 1;

    // Classify
    if (score <= 5) return 'low';
    if (score <= 15) return 'medium';
    return 'high';
  },

  /**
   * Quick syntax check using Function constructor (sandboxed)
   * @param {string} code - Code to check
   * @returns {Object} Syntax check result
   */
  async checkSyntax(code) {
    try {
      // This doesn't execute the code, just parses it
      new Function(code);
      return { valid: true, error: null };
    } catch (error) {
      return {
        valid: false,
        error: {
          message: error.message,
          line: error.lineNumber || null,
        }
      };
    }
  },
};

// Expose the gate API via Comlink
Comlink.expose(ComponentGate);
