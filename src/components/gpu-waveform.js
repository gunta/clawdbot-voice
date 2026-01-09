/**
 * GPU Waveform Component
 * WebGPU-powered HDR waveform visualization
 * Always animated, uses compute shaders for maximum performance
 * 
 * @see https://developer.chrome.com/blog/new-in-webgpu-129 - HDR canvas support
 * @see https://gpuweb.github.io/gpuweb/ - WebGPU specification
 */

/* global GPUBufferUsage, GPUShaderStage */

export class GpuWaveform extends HTMLElement {
  #canvas = null;
  #context = null;
  #device = null;
  #pipeline = null;
  #uniformBuffer = null;
  #bindGroup = null;
  #animationFrame = null;
  #startTime = 0;
  #isHDR = false;
  #initialized = false;

  // WebGPU Shader - WGSL
  // Minimalist organic waveform with retina-quality AA
  static SHADER = /* wgsl */ `
    struct Uniforms {
      time: f32,
      resolution: vec2<f32>,
      intensity: f32,
    }

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    }

    @vertex
    fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var positions = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(1.0, 1.0)
      );
      var output: VertexOutput;
      output.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
      output.uv = positions[vertexIndex] * 0.5 + 0.5;
      return output;
    }

    // Quintic smooth interpolation (C2 continuous)
    fn quintic(t: f32) -> f32 {
      return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }

    fn hash(p: f32) -> f32 {
      return fract(sin(p * 127.1) * 43758.5453);
    }
    
    fn smoothNoise(x: f32) -> f32 {
      let i = floor(x);
      let f = fract(x);
      return mix(hash(i), hash(i + 1.0), quintic(f)) * 2.0 - 1.0;
    }

    // Organic wave with golden ratio frequencies
    fn wave(x: f32, t: f32, intensity: f32) -> f32 {
      let phi = 1.618033988749;
      var y = sin(x * 1.2 + t * 0.6) * 0.35;
      y += sin(x * phi * 0.8 + t * 0.4 * phi) * 0.22;
      y += sin(x * phi * phi * 0.5 - t * 0.25) * 0.12;
      y += smoothNoise(x * 0.4 + t * 0.3) * 0.15;
      return y * (0.6 + intensity * 0.5);
    }

    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let uv = input.uv;
      let t = uniforms.time;
      let res = uniforms.resolution;
      let intensity = uniforms.intensity;
      
      // Shorter horizontal span - wave only in center 60%
      let xNorm = (uv.x - 0.5) * 2.0;  // -1 to 1
      let x = xNorm * 2.5;              // Shorter wave span
      let y = (uv.y - 0.5) * 2.0;
      
      // High-precision pixel size (retina aware)
      let pxY = 2.0 / res.y;
      
      // Wave with derivative for proper SDF
      let waveY = wave(x, t, intensity);
      let dx = 0.002;
      let waveY2 = wave(x + dx, t, intensity);
      let slope = (waveY2 - waveY) / dx;
      
      // True SDF distance to curve
      let rawDist = y - waveY;
      let dist = abs(rawDist) / sqrt(1.0 + slope * slope);
      
      // Retina-quality AA: use 2px smooth transition
      let aaWidth = pxY * 2.0;
      let lineWidth = pxY * 1.0;
      
      // Smooth line with proper AA
      let line = 1.0 - smoothstep(lineWidth, lineWidth + aaWidth, dist);
      
      // Horizontal fade at edges (wave fades to nothing at sides)
      let edgeFade = 1.0 - smoothstep(0.7, 1.0, abs(xNorm));
      
      // Final brightness - just the line, pure white, no glow/shadow
      let brightness = line * edgeFade;
      
      // HDR white output - premultiplied alpha (no dark halos)
      let hdr = brightness * 2.5;
      
      return vec4<f32>(hdr, hdr, hdr, brightness);
    }
  `;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    this.#render();
    await this.#initWebGPU();
  }

  disconnectedCallback() {
    this.#cleanup();
  }

  #render() {
    // Apply inline style immediately to prevent FOUC
    this.style.opacity = '0';
    this.style.visibility = 'hidden';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          max-width: 280px;
          margin: 0 auto;
          height: var(--gpu-waveform-height, 40px);
          opacity: 0;
          visibility: hidden;
          transform: translateY(5px) scale(0.95);
          transition: opacity 0.5s ease, visibility 0.5s ease, transform 0.5s ease;
          pointer-events: none;
        }

        /* Fade in when active (Her or Clawd speaking) */
        :host([active]) {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: oklch(1 0 0 / 0.3);
          font-family: var(--font-body, 'Cormorant Garamond', serif);
          font-size: 0.8rem;
          font-style: italic;
        }

        :host([hdr]) canvas {
          /* HDR indicator */
        }
      </style>
      <canvas></canvas>
    `;
    this.#canvas = this.shadowRoot.querySelector('canvas');
  }

  async #initWebGPU() {
    // Check WebGPU support
    if (!navigator.gpu) {
      console.warn('[GpuWaveform] WebGPU not supported');
      this.#showFallback('WebGPU not supported');
      return;
    }

    try {
      // Request adapter and device
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        throw new Error('No WebGPU adapter found');
      }

      this.#device = await adapter.requestDevice();

      // Get WebGPU context
      this.#context = this.#canvas.getContext('webgpu');

      if (!this.#context) {
        throw new Error('Failed to get WebGPU context');
      }

      // Check for HDR support
      const format = navigator.gpu.getPreferredCanvasFormat();
      
      // Try to use rgba16float for HDR
      let canvasFormat = 'rgba16float';
      let toneMapping = { mode: 'extended' };
      
      // Configure canvas with HDR settings
      try {
        this.#context.configure({
          device: this.#device,
          format: canvasFormat,
          toneMapping: toneMapping,
          alphaMode: 'premultiplied',
        });
        this.#isHDR = true;
        this.setAttribute('hdr', '');
        console.log('[GpuWaveform] HDR mode enabled (rgba16float + extended tone mapping)');
      } catch (e) {
        // Fallback to standard format
        console.warn('[GpuWaveform] HDR not available, using standard format');
        canvasFormat = format;
        this.#context.configure({
          device: this.#device,
          format: canvasFormat,
          alphaMode: 'premultiplied',
        });
      }

      // Create shader module
      const shaderModule = this.#device.createShaderModule({
        label: 'Waveform Shader',
        code: GpuWaveform.SHADER,
      });

      // Create uniform buffer
      // WGSL alignment: time(f32)=4, pad=4, resolution(vec2)=8, intensity(f32)=4, pad=12 → 32 bytes
      this.#uniformBuffer = this.#device.createBuffer({
        size: 32, // Aligned for: f32 + padding + vec2<f32> + f32 + padding
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Create bind group layout
      const bindGroupLayout = this.#device.createBindGroupLayout({
        entries: [{
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        }],
      });

      // Create bind group
      this.#bindGroup = this.#device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
          binding: 0,
          resource: { buffer: this.#uniformBuffer },
        }],
      });

      // Create pipeline
      this.#pipeline = this.#device.createRenderPipeline({
        layout: this.#device.createPipelineLayout({
          bindGroupLayouts: [bindGroupLayout],
        }),
        vertex: {
          module: shaderModule,
          entryPoint: 'vertexMain',
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fragmentMain',
          targets: [{
            format: canvasFormat,
            blend: {
              color: {
                srcFactor: 'one',
                dstFactor: 'one',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one',
                operation: 'add',
              },
            },
          }],
        },
        primitive: {
          topology: 'triangle-list',
        },
      });

      this.#initialized = true;
      this.#startTime = performance.now();
      this.#startAnimation();

      console.log('[GpuWaveform] WebGPU initialized successfully');

    } catch (error) {
      console.error('[GpuWaveform] WebGPU initialization failed:', error);
      this.#showFallback('WebGPU init failed');
    }
  }

  #showFallback(message) {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: var(--gpu-waveform-height, 60px); }
        .fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: oklch(1 0 0 / 0.2);
          font-family: var(--font-body, serif);
          font-size: 0.75rem;
          font-style: italic;
        }
      </style>
      <div class="fallback">${message}</div>
    `;
  }

  // Gentle breathing intensity
  #simulateAudioIntensity(time) {
    // Slow peaceful breathing
    const breath = Math.sin(time * 0.3) * 0.2 + 0.6;
    const drift = Math.sin(time * 0.7) * 0.1;
    return Math.max(0.4, Math.min(0.85, breath + drift));
  }

  #startAnimation() {
    const render = () => {
      if (!this.#initialized || !this.#device || !this.#context) return;

      // Full retina resolution - no cap!
      const rect = this.#canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);

      // Resize canvas and reconfigure context if needed
      if (this.#canvas.width !== width || this.#canvas.height !== height) {
        this.#canvas.width = width;
        this.#canvas.height = height;
        
        // Must reconfigure WebGPU context after resize
        try {
          this.#context.configure({
            device: this.#device,
            format: this.#isHDR ? 'rgba16float' : navigator.gpu.getPreferredCanvasFormat(),
            toneMapping: this.#isHDR ? { mode: 'extended' } : undefined,
            alphaMode: 'premultiplied',
          });
        } catch (e) {
          // Fallback if HDR config fails
          this.#context.configure({
            device: this.#device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: 'premultiplied',
          });
        }
      }

      // Calculate time
      const time = (performance.now() - this.#startTime) / 1000;

      // Simulate audio-reactive intensity (always animated)
      const intensity = this.#simulateAudioIntensity(time);

      // Update uniforms (must match WGSL struct alignment)
      // Layout: time(f32) + padding(f32) + resolution(vec2<f32>) + intensity(f32) + padding(3xf32)
      const uniformData = new Float32Array([
        time,                    // offset 0: time
        0,                       // offset 4: padding (vec2 needs 8-byte alignment)
        this.#canvas.width,      // offset 8: resolution.x
        this.#canvas.height,     // offset 12: resolution.y
        intensity,               // offset 16: intensity
        0, 0, 0,                 // offset 20: padding to 32 bytes
      ]);
      this.#device.queue.writeBuffer(this.#uniformBuffer, 0, uniformData);

      // Create command encoder
      const commandEncoder = this.#device.createCommandEncoder();

      // Get current texture
      const textureView = this.#context.getCurrentTexture().createView();

      // Begin render pass
      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });

      renderPass.setPipeline(this.#pipeline);
      renderPass.setBindGroup(0, this.#bindGroup);
      renderPass.draw(6); // 6 vertices for full-screen quad
      renderPass.end();

      // Submit commands
      this.#device.queue.submit([commandEncoder.finish()]);

      // Continue animation
      this.#animationFrame = requestAnimationFrame(render);
    };

    render();
  }

  #cleanup() {
    if (this.#animationFrame) {
      cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = null;
    }
    
    if (this.#uniformBuffer) {
      this.#uniformBuffer.destroy();
      this.#uniformBuffer = null;
    }

    this.#device = null;
    this.#context = null;
    this.#pipeline = null;
    this.#bindGroup = null;
    this.#initialized = false;
  }

  // Public API
  get active() {
    return this.hasAttribute('active');
  }

  set active(value) {
    const isActive = Boolean(value);
    const wasActive = this.active;
    
    if (wasActive !== isActive) {
      console.log('[GpuWaveform] Active:', isActive);
    }
    
    this.toggleAttribute('active', isActive);
    
    // Clear inline styles so CSS can take over
    this.style.opacity = '';
    this.style.visibility = '';
  }

  get isHDR() {
    return this.#isHDR;
  }
}

customElements.define('gpu-waveform', GpuWaveform);
