/**
 * Calligrapher.js - Realistic Handwriting Generator
 * Based on calligrapher.ai by Sean Vasquez
 * 
 * Uses a recurrent neural network to generate realistic handwriting
 * from text input. Renders as SVG paths.
 */

// Character mapping
const CHAR_MAP = {
  '': 0, '': 2, ' ': 8, '"': 4, '&': 84, '(': 66, '*': 80, ',': 37, '.': 7,
  '0': 62, '2': 63, '4': 68, '6': 71, '8': 76, ':': 74, 'B': 47, 'D': 52,
  'F': 53, 'H': 41, 'J': 64, 'L': 48, 'N': 38, 'P': 46, 'R': 55, 'T': 31,
  'V': 39, 'X': 79, 'Z': 78, 'b': 32, 'd': 27, 'f': 35, 'h': 30, 'j': 43,
  'l': 26, 'n': 15, 'p': 29, 'r': 6, 't': 21, 'v': 34, 'x': 44, 'z': 10,
  '': 1, '': 3, '!': 72, '#': 56, "'": 16, ')': 67, '+': 82, '-': 40,
  '/': 77, '1': 59, '3': 69, '5': 61, '7': 70, '9': 60, ';': 73, '?': 51,
  'A': 9, 'C': 57, 'E': 42, 'G': 45, 'I': 23, 'K': 58, 'M': 5, 'O': 36,
  'Q': 75, 'S': 18, 'U': 65, 'W': 54, 'Y': 50, '[': 81, ']': 83, 'a': 14,
  'c': 20, 'e': 19, 'g': 33, 'i': 13, 'k': 28, 'm': 12, 'o': 25, 'q': 49,
  's': 17, 'u': 11, 'w': 24, 'y': 22
};

// Math shortcuts
const N = Math.exp;
const P = Math.sqrt;
const Q = Math.log;
const R = Math.random;
const W = Math.floor;
const X = P(0.5);
const G = 256;
const J = 512;

// Helper: array length
const K = r => r.length;
// Helper: slice array
const O = (r, e, t) => r.slice(e, t);
// Helper: create Float32Array
const Y = function() { return new Float32Array(...arguments); };

// Map operation
const mapArr = fn => arr => {
  const result = Y(K(arr));
  for (let i = 0; i < K(arr); i++) result[i] = fn(arr[i]);
  return result;
};

const l = mapArr(r => Q(r));
const o = mapArr(r => 1 / (1 + N(-r)));
const n = mapArr(r => Q(1 + N(r)));
const v = mapArr(r => { const e = N(2 * r); return (e - 1) / (e + 1); });

// Pairwise operations
const pairOp = fn => (arr1, arr2) => {
  const isScalar = typeof arr2 === 'number';
  const result = Y(K(arr1));
  for (let i = 0; i < K(arr1); i++) {
    result[i] = fn(arr1[i], isScalar ? arr2 : arr2[i]);
  }
  return result;
};

const u = pairOp((a, b) => a + b);
const f = pairOp((a, b) => a - b);
const s = pairOp((a, b) => a * b);
const h = pairOp((a, b) => a / b);

// Softmax
const d = arr => {
  const result = Y(K(arr));
  let sum = 0;
  for (let i = 0; i < K(arr); i++) {
    result[i] = N(arr[i]);
    sum += result[i];
  }
  for (let i = 0; i < K(result); i++) result[i] = result[i] / sum;
  return result;
};

// Add bias
const p = (arr, bias) => {
  for (let i = 0; i < K(arr) / G; i++) {
    for (let j = 0; j < K(bias); j++) {
      arr[i * G + j] = arr[i * G + j] + bias[j];
    }
  }
  return arr;
};

// Concatenate
const w = (arr1, arr2) => {
  const total = K(arr1) + K(arr2);
  const result = Y(total);
  for (let i = 0; i < K(arr1); i++) result[i] = arr1[i];
  for (let i = 0; i < K(arr2); i++) result[i + K(arr1)] = arr2[i];
  return result;
};

// Matrix multiply
const m = (vec, mat) => {
  const cols = K(mat) / K(vec);
  const result = Y(cols);
  for (let j = 0; j < cols; j++) {
    let sum = 0;
    for (let i = 0; i < K(vec); i++) {
      sum += vec[i] * mat[i * cols + j];
    }
    result[j] = sum;
  }
  return result;
};

// Sparse matrix multiply
const g = (vec, sparse) => {
  const [shape, values, indices, pointers] = sparse;
  const rows = shape[0];
  const result = Y(rows);
  for (let i = 0; i < rows; i++) {
    const start = pointers[i];
    const end = pointers[i + 1];
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += values[j] * vec[indices[j]];
    }
    result[i] = sum;
  }
  return result;
};

// Split array
const b = (arr, parts) => {
  const size = K(arr) / parts;
  const result = [];
  for (let i = 0; i < parts; i++) {
    result.push(O(arr, i * size, (i + 1) * size));
  }
  return result;
};

// Tile array
const M = (arr, times) => {
  const result = Y(K(arr) * times);
  for (let i = 0; i < K(arr); i++) {
    for (let j = 0; j < times; j++) {
      result[i * times + j] = arr[i];
    }
  }
  return result;
};

// Sum along axis
const y = (arr, shape) => {
  const result = Y(shape[1]);
  for (let i = 0; i < shape[0]; i++) {
    for (let j = 0; j < shape[1]; j++) {
      result[j] += arr[i * shape[1] + j];
    }
  }
  return result;
};

// Gather
const x = (arr, indices, cols) => {
  const result = Y(K(indices) * cols);
  for (let i = 0; i < K(indices); i++) {
    const idx = indices[i];
    const row = O(arr, idx * cols, (idx + 1) * cols);
    result.set(row, i * cols);
  }
  return result;
};

// Convert string to bytes
const D = arr => {
  let str = '';
  for (let i = 0; i < K(arr); i++) {
    str += String.fromCharCode(arr[i]);
  }
  return str;
};

// Sparse array helpers
const V = (values, positions, shape) => {
  let ptr = 0;
  const data = [];
  const indices = [];
  const rowPtrs = [];
  
  for (let i = 0; i < K(values); i++) {
    const val = values[i];
    ptr += positions[i];
    const row = W(ptr / shape[1]);
    const col = ptr % shape[1];
    if (val !== 0) {
      data.push(val);
      indices.push(col);
      rowPtrs.push(row);
    }
  }
  
  const pointers = [0];
  let idx = 0;
  for (let r = 0; r < shape[0]; r++) {
    while (rowPtrs[idx] === r) idx++;
    pointers.push(idx);
  }
  
  return [shape, Y(data), Y(indices), pointers];
};

const _ = (values, positions, shape) => {
  const total = shape.reduce((a, b) => a * b, 1);
  const result = Y(total);
  let ptr = 0;
  for (let i = 0; i < K(values); i++) {
    ptr += positions[i];
    result[ptr] = values[i];
  }
  return result;
};

/**
 * Calligrapher class
 */
export class Calligrapher {
  constructor() {
    this.model = null;
    this.loaded = false;
    this.loadPromise = null;
  }

  async load(modelPath) {
    if (this.loadPromise) return this.loadPromise;
    
    this.loadPromise = fetch(modelPath)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load model: ${res.status}`);
        return res.arrayBuffer();
      })
      .then(buffer => {
        console.log('[Calligrapher] Model buffer size:', buffer.byteLength);
        this.model = this._parseModel(buffer);
        this.loaded = true;
        console.log('[Calligrapher] Model loaded, keys:', Object.keys(this.model).join(','));
        // Log some key shapes for debugging
        for (const key of ['g', 's', 'b', 't', 'j', 'E']) {
          if (this.model[key]) {
            const arr = Array.isArray(this.model[key]) ? this.model[key][0] : this.model[key];
            console.log(`[Calligrapher] ${key}: length=${K(arr)}`);
          }
        }
        return this;
      });
    
    return this.loadPromise;
  }

  _parseModel(buffer) {
    let offset = 0;
    const model = {};
    const view = new DataView(buffer);
    
    while (offset < buffer.byteLength) {
      // Read name length and name
      const nameLen = view.getUint8(offset);
      offset += 1;
      const nameBytes = new Uint8Array(nameLen);
      for (let i = 0; i < nameLen; i++) {
        nameBytes[i] = view.getUint8(offset);
        offset += 1;
      }
      const name = D(nameBytes);
      
      // Read sparse flag
      const isSparse = view.getUint8(offset);
      offset += 1;
      
      // Read values
      const numValues = view.getUint32(offset, true);
      offset += 4;
      const values = new Float32Array(numValues);
      for (let i = 0; i < numValues; i++) {
        values[i] = view.getFloat32(offset, true);
        offset += 4;
      }
      
      // Read positions if sparse
      let positions;
      if (isSparse) {
        positions = new Uint8Array(numValues);
        for (let i = 0; i < numValues; i++) {
          positions[i] = view.getUint16(offset, true);
          offset += 1;
        }
      }
      
      // Read shape
      const numDims = view.getUint8(offset);
      offset += 1;
      const shape = new Uint16Array(numDims);
      for (let i = 0; i < numDims; i++) {
        shape[i] = view.getUint16(offset, true);
        offset += 2;
      }
      
      // Convert to proper format
      let data;
      if (['y', 'w', 'r', 'l'].includes(name)) {
        data = V(values, positions, shape);
      } else if (isSparse) {
        data = _(values, positions, shape);
      } else {
        data = values;
      }
      
      model[name] = data;
    }
    
    return model;
  }

  // Character embedding
  _A(indices) {
    const $ = this.model;
    indices = [0, ...indices, 0];
    indices = Y(indices);
    
    // Gather embeddings
    let emb = x($.s, indices, G);
    
    // Conv layer
    const convLen = K(indices) - 2;
    const convOut = Y(convLen * G);
    for (let i = 0; i < convLen; i++) {
      const window = O(emb, i * G, (i + 3) * G);
      for (let j = 0; j < G; j++) {
        let sum = 0;
        for (let k = 0; k < K(window); k++) {
          sum += window[k] * $.b[j + G * k];
        }
        convOut[i * G + j] = sum;
      }
    }
    
    // Add bias and tanh
    p(convOut, $.t);
    const output = v(convOut);
    
    // Create combined embedding
    const combined = Y(convLen * J);
    for (let i = 0; i < convLen; i++) {
      for (let j = 0; j < G; j++) {
        combined[i * J + j] = emb[(i + 1) * G + j];
      }
      for (let j = 0; j < G; j++) {
        combined[i * J + G + j] = output[i * G + j];
      }
    }
    
    // Final projection
    const projected = Y(convLen * J);
    for (let i = 0; i < convLen; i++) {
      for (let j = 0; j < J; j++) {
        let sum = 0;
        for (let k = 0; k < J; k++) {
          sum += combined[i * J + k] * $.j[k * J + j];
        }
        projected[i * J + j] = sum + $.E[j];
      }
    }
    
    return v(projected);
  }

  // LSTM cell
  _C(input, state, layer) {
    const $ = this.model;
    let weights, bias, prevH, prevC;
    
    if (layer === 1) {
      weights = $.y;
      bias = $.p;
      prevH = state.a;
      prevC = state.d;
    } else if (layer === 2) {
      weights = $.w;
      bias = $.q;
      prevH = state.b;
      prevC = state.e;
    } else {
      weights = $.r;
      bias = $.f;
      prevH = state.c;
      prevC = state.f;
    }
    
    // Debug: check for NaN in inputs
    if (this._debugFirst && layer === 1) {
      console.log('[LSTM] Layer 1 input len:', K(input), 'prevC len:', K(prevC), 'prevH len:', K(prevH));
      console.log('[LSTM] weights:', weights ? (Array.isArray(weights) ? 'sparse' : 'dense') : 'undefined');
      console.log('[LSTM] bias len:', bias ? K(bias) : 'undefined');
      this._debugFirst = false;
    }
    
    const combined = w(input, prevC);
    if (this._debugFirst && layer === 1) {
      console.log('[LSTM] combined len:', K(combined), 'has NaN:', Array.from(combined).some(isNaN));
      console.log('[LSTM] weights format:', weights);
      console.log('[LSTM] weights[0]:', weights[0]);
    }
    
    let gatesPre;
    try {
      gatesPre = g(combined, weights);
    } catch (e) {
      console.error('[LSTM] Error in sparse mul:', e);
      throw e;
    }
    if (this._debugFirst && layer === 1) {
      console.log('[LSTM] gatesPre len:', K(gatesPre), 'has NaN:', Array.from(gatesPre).some(isNaN));
    }
    
    const gates = u(gatesPre, bias);
    if (this._debugFirst && layer === 1) {
      console.log('[LSTM] gates len:', K(gates), 'has NaN:', Array.from(gates).some(isNaN));
    }
    
    const [i_gate, f_gate, g_gate, o_gate] = b(gates, 4);
    
    const newC = u(s(o(g_gate), prevH), s(o(i_gate), v(f_gate)));
    const newH = s(o(o_gate), v(newC));
    
    if (this._debugFirst && layer === 1) {
      console.log('[LSTM] newC has NaN:', Array.from(newC).some(isNaN), 'newH has NaN:', Array.from(newH).some(isNaN));
    }
    
    if (layer === 1) {
      state.a = newC;
      state.d = newH;
    } else if (layer === 2) {
      state.b = newC;
      state.e = newH;
    } else {
      state.c = newC;
      state.f = newH;
    }
    
    return newH;
  }

  // Attention
  _k(hidden, state, charEmbed) {
    const $ = this.model;
    let params = m(hidden, $.h);
    params = u(params, $.n);
    const [alpha, beta, kappa] = b(params, 3);
    
    const expBeta = n(beta);
    const expKappa = n(kappa);
    const newKappa = u(state.k, h(expKappa, 15));
    state.k = newKappa;
    
    const window = state.u;
    const windowCols = K(window) / 10;
    
    const alphaT = M(alpha, windowCols - 1);
    const betaT = M(expBeta, windowCols);
    const kappaT = M(newKappa, windowCols);
    
    const phi = o(h(f(window, kappaT), betaT));
    
    // Compute phi differences
    const phiDiff = Y(10 * (windowCols - 1));
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < windowCols - 1; j++) {
        phiDiff[i * (windowCols - 1) + j] = phi[i * windowCols + j + 1] - phi[i * windowCols + j];
      }
    }
    
    const weighted = s(alphaT, phiDiff);
    const context = y(weighted, [10, K(weighted) / 10]);
    
    // Apply to char embeddings
    const contextT = M(context, G);
    const attended = y(s(contextT, charEmbed), [K(context), G]);
    state.w = attended;
    
    return attended;
  }

  // Forward pass
  _F(input, state, charEmbed, bias) {
    const $ = this.model;
    
    // Input projection
    let t = m(input, $.i);
    if (this._debugFirst) console.log('[Forward] After input proj:', K(t), 'has NaN:', Array.from(t).some(isNaN));
    
    t = u(t, $.W);
    if (this._debugFirst) console.log('[Forward] After add W:', K(t), 'has NaN:', Array.from(t).some(isNaN));
    
    t = s(u(t, state.z), X);
    if (this._debugFirst) console.log('[Forward] After state.z mul:', K(t), 'has NaN:', Array.from(t).some(isNaN));
    
    // Layer 1
    const h1 = this._C(t, state, 1);
    if (this._debugFirst) console.log('[Forward] h1 has NaN:', Array.from(h1).some(isNaN));
    t = s(u(t, h1), X);
    
    // Attention
    const att1 = this._k(h1, state, charEmbed);
    const h1a = w(h1, att1);
    
    // Layer 2
    const h2 = this._C(h1a, state, 2);
    const ctx = this._k(h2, state, charEmbed);
    const h2a = w(h2, ctx);
    
    // Sparse projection
    let h2p = g(h2a, $.l);
    h2p = u(h2p, $.Q);
    h2p = v(h2p);
    t = s(u(t, h2p), X);
    
    // EOS probability
    const eos = o(u(m(ctx, $.c), $.u))[0];
    
    // Layer 3
    const h3 = this._C(t, state, 3);
    t = s(u(t, h3), X);
    
    // Output
    let output = m(t, $.z);
    output = u(output, $.v);
    
    return [output, eos];
  }

  // Sample
  _U(output, bias) {
    const [eosLogit, ...rest] = output;
    const eosProb = 1 / (1 + N(-eosLogit));
    const eos = R() < eosProb ? 1 : 0;
    
    // Extract mixture parameters (20 mixtures, 6 params each)
    const piRaw = Y(20);
    const muX = Y(20);
    const muY = Y(20);
    const sigmaX = Y(20);
    const sigmaY = Y(20);
    const rho = Y(20);
    
    for (let i = 0; i < 20; i++) {
      piRaw[i] = rest[i * 6];
      muX[i] = rest[i * 6 + 1];
      muY[i] = rest[i * 6 + 2];
      sigmaX[i] = rest[i * 6 + 3];
      sigmaY[i] = rest[i * 6 + 4];
      rho[i] = rest[i * 6 + 5];
    }
    
    // Apply bias and softmax to mixture weights
    const biasedPi = l(d(s(l(d(piRaw)), 1 + bias)));
    for (let i = 0; i < K(biasedPi); i++) {
      if (biasedPi[i] < Q(0.02)) {
        biasedPi[i] -= 100;
      }
    }
    
    // Gumbel-softmax sampling
    let maxVal = -1e6;
    let maxIdx = 0;
    for (let i = 0; i < K(biasedPi); i++) {
      const gumbel = -Q(-Q(R()));
      const score = biasedPi[i] + gumbel;
      if (score > maxVal) {
        maxVal = score;
        maxIdx = i;
      }
    }
    
    // Get selected component
    const mx = muX[maxIdx];
    const my = muY[maxIdx];
    const sx = N(sigmaX[maxIdx]) / N(bias);
    const sy = N(sigmaY[maxIdx]) / N(bias);
    const r = v(Y([rho[maxIdx]]))[0];
    
    // Sample from bivariate Gaussian
    const z1 = P(-2 * Q(1 - R())) * Math.cos(2 * Math.PI * (1 - R()));
    const z2 = P(-2 * Q(1 - R())) * Math.cos(2 * Math.PI * (1 - R()));
    
    const dx = mx + sx * z1;
    const dy = my + sy * (r * z1 + P(1 - r * r) * z2);
    
    return Y([dx, dy, eos]);
  }

  // Initialize state
  _initState(seqLen, styleIdx) {
    this._debugFirst = true;
    const $ = this.model;
    
    const windowInit = Y(10 * seqLen);
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < seqLen; j++) {
        windowInit[i * seqLen + j] = j - 0.5;
      }
    }
    
    const styleVec = O($.g, 64 * styleIdx, 64 * (styleIdx + 1));
    const primeVec = u(m(styleVec, $.k), $.R);
    
    return {
      a: $.d.slice(),
      b: $.o.slice(),
      c: $.e.slice(),
      d: $.m.slice(),
      e: $.x.slice(),
      f: $.a.slice(),
      w: $.T.slice(),
      k: Y(10),
      u: windowInit,
      z: primeVec
    };
  }

  // Text to indices
  _textToIndices(text) {
    const indices = text.split('').map(c => c in CHAR_MAP ? CHAR_MAP[c] : 1);
    return [2, ...indices, 3];
  }

  /**
   * Generate handwritten strokes
   */
  async generate(text, options = {}) {
    if (!this.loaded) {
      throw new Error('Model not loaded');
    }
    
    const {
      speed = 2.5,
      legibility = 0.75,
      style = -1
    } = options;
    
    const cleanText = text.trim().replace(/\s+/g, ' ');
    if (!cleanText) return [];
    
    const indices = this._textToIndices(cleanText);
    
    // Get style
    let styleIdx;
    if (style < 0 || style > 9) {
      const numStyles = K(this.model.g) / 64;
      styleIdx = W(numStyles * R());
    } else {
      const styleMap = { 1: 44, 2: 54, 3: 23, 4: 1, 5: 19, 6: 6, 7: 30, 8: 11, 9: 21 };
      styleIdx = styleMap[style] || W((K(this.model.g) / 64) * R());
    }
    
    // Initialize
    const state = this._initState(K(indices) + 1, styleIdx);
    const charEmbed = this._A(indices);
    
    // Generate strokes
    const strokes = [];
    let input = Y([0, 0, 1]);
    const maxSteps = 40 * K(cleanText);
    const speedVal = parseFloat(speed) || 2.5;
    let nanCount = 0;
    
    for (let step = 0; step < maxSteps; step++) {
      try {
        const [output, attention] = this._F(input, state, charEmbed, legibility);
        
        if (attention > 0.5) break;
        
        const nextPoint = this._U(output, legibility);
        
        // Check for NaN
        if (isNaN(nextPoint[0]) || isNaN(nextPoint[1])) {
          nanCount++;
          if (nanCount === 1) {
            console.warn('[Calligrapher] First NaN at step', step);
          }
          continue;
        }
        
        strokes.push([nextPoint[0], nextPoint[1], nextPoint[2]]);
        input = nextPoint;
        
        // Speed affects how many steps we skip
        if (speedVal > 5) {
          step += Math.floor((speedVal - 5) / 2);
        }
      } catch (e) {
        console.error('[Calligrapher] Error at step', step, e);
        break;
      }
    }
    
    if (nanCount > 0) {
      console.warn('[Calligrapher] Total NaN steps:', nanCount);
    }
    
    return strokes;
  }

  /**
   * Convert strokes to SVG paths
   */
  strokesToSVG(strokes, options = {}) {
    const {
      scale = 10,
      strokeWidth = 0.75,
      offsetX = 0,
      offsetY = 0
    } = options;
    
    if (strokes.length === 0) return [];
    
    // Convert to screen coordinates
    const points = [];
    let px = offsetX;
    let py = offsetY;
    
    for (const [dx, dy, eos] of strokes) {
      px += scale * dx;
      py -= scale * dy;
      points.push([px, py, eos]);
    }
    
    // Split into strokes
    const groups = [];
    let current = [];
    
    for (const point of points) {
      current.push(point);
      if (point[2] === 1) {
        groups.push(current);
        current = [];
      }
    }
    if (current.length > 0) groups.push(current);
    
    // Convert each group to path
    const paths = [];
    for (const group of groups) {
      if (group.length < 2) continue;
      paths.push(this._createPath(group, scale, strokeWidth));
    }
    
    return paths;
  }

  _createPath(points, scale, width) {
    // Calculate velocities
    const velocities = points.map((p, i) => {
      let vx, vy;
      if (i === 0) {
        vx = points[i + 1][0] - p[0];
        vy = points[i + 1][1] - p[1];
      } else if (i === points.length - 1) {
        vx = p[0] - points[i - 1][0];
        vy = p[1] - points[i - 1][1];
      } else {
        vx = points[i + 1][0] - points[i - 1][0];
        vy = points[i + 1][1] - points[i - 1][1];
      }
      return P(vx * vx + vy * vy);
    });
    
    // Smooth velocities
    const smoothed = velocities.map((v, i) => {
      const start = Math.max(i - 2, 0);
      const end = Math.min(i + 3, velocities.length);
      let sum = 0;
      for (let j = start; j < end; j++) sum += velocities[j];
      return sum / (end - start);
    });
    
    // Build outline
    const left = [];
    const right = [];
    
    for (let i = 0; i < points.length; i++) {
      let nx, ny;
      if (i === 0) {
        nx = points[i + 1][0] - points[i][0];
        ny = points[i + 1][1] - points[i][1];
      } else if (i === points.length - 1) {
        nx = points[i][0] - points[i - 1][0];
        ny = points[i][1] - points[i - 1][1];
      } else {
        nx = points[i + 1][0] - points[i - 1][0];
        ny = points[i + 1][1] - points[i - 1][1];
      }
      
      const len = Math.max(P(nx * nx + ny * ny), 14);
      const perpX = -ny / len;
      const perpY = nx / len;
      
      const w = (smoothed[i] / width) * 2;
      
      left.push([points[i][0] + w * perpX, points[i][1] + w * perpY]);
      right.push([points[i][0] - w * perpX, points[i][1] - w * perpY]);
    }
    
    // Create smooth path
    const outline = [...left, ...right.reverse()];
    const fix = n => n.toFixed(2);
    
    const parts = [`M ${fix(outline[0][0])},${fix(outline[0][1])}`];
    
    for (let i = 0; i < outline.length; i++) {
      const p0 = outline[(i - 1 + outline.length) % outline.length];
      const p1 = outline[i];
      const p2 = outline[(i + 1) % outline.length];
      const p3 = outline[(i + 2) % outline.length];
      
      const t1 = [p2[0] - p0[0], p2[1] - p0[1]];
      const t2 = [p3[0] - p1[0], p3[1] - p1[1]];
      
      const cp1 = [p1[0] + t1[0] * 0.2, p1[1] + t1[1] * 0.2];
      const cp2 = [p2[0] - t2[0] * 0.2, p2[1] - t2[1] * 0.2];
      
      parts.push(`C ${fix(cp1[0])} ${fix(cp1[1])}, ${fix(cp2[0])} ${fix(cp2[1])}, ${fix(p2[0])} ${fix(p2[1])}`);
    }
    
    return parts.join(' ');
  }

  /**
   * Get bounding box of strokes
   */
  getBounds(strokes, scale = 10) {
    if (strokes.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 50, width: 100, height: 50 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    let x = 0, y = 0;
    
    for (const [dx, dy] of strokes) {
      x += scale * dx;
      y -= scale * dy;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    
    return {
      minX, minY, maxX, maxY,
      width: maxX - minX || 100,
      height: maxY - minY || 50
    };
  }
}

export const calligrapher = new Calligrapher();
export default Calligrapher;
