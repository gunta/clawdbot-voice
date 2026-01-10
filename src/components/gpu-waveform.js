/**
 * GPU Waveform Component
 * WebGPU-powered HDR waveform visualization
 * Always animated, uses compute shaders for maximum performance
 *
 * @see https://developer.chrome.com/blog/new-in-webgpu-129 - HDR canvas support
 * @see https://gpuweb.github.io/gpuweb/ - WebGPU specification
 */
import { html } from 'htm/preact';
import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { createShadowComponent } from '../lib/shadow-component.js';
import { ErrorBoundary } from '../lib/error-boundary.js';

/* global GPUBufferUsage, GPUShaderStage */

// WebGPU Shader - WGSL
// Minimalist organic waveform with retina-quality AA
const SHADER = /* wgsl */ `
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

function GpuWaveform({ host }) {
  const canvasRef = useRef(null);
  const isActive = useSignal(false);
  const isHDR = useSignal(false);
  const fallbackMessage = useSignal(null);

  // WebGPU state refs (not signals - these don't trigger re-renders)
  const gpuStateRef = useRef({
    device: null,
    context: null,
    pipeline: null,
    uniformBuffer: null,
    bindGroup: null,
    animationFrame: null,
    startTime: 0,
    initialized: false,
    isHDR: false,
  });

  // Gentle breathing intensity
  function simulateAudioIntensity(time) {
    const breath = Math.sin(time * 0.3) * 0.2 + 0.6;
    const drift = Math.sin(time * 0.7) * 0.1;
    return Math.max(0.4, Math.min(0.85, breath + drift));
  }

  // Show fallback UI
  function showFallback(message) {
    fallbackMessage.value = message;
  }

  // Animation render loop
  function renderFrame() {
    const state = gpuStateRef.current;
    if (!state.initialized || !state.device || !state.context) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Full retina resolution
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);

    // Resize canvas and reconfigure context if needed
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;

      // Must reconfigure WebGPU context after resize
      try {
        state.context.configure({
          device: state.device,
          format: state.isHDR ? 'rgba16float' : navigator.gpu.getPreferredCanvasFormat(),
          toneMapping: state.isHDR ? { mode: 'extended' } : undefined,
          alphaMode: 'premultiplied',
        });
      } catch (e) {
        // Fallback if HDR config fails
        state.context.configure({
          device: state.device,
          format: navigator.gpu.getPreferredCanvasFormat(),
          alphaMode: 'premultiplied',
        });
      }
    }

    // Calculate time
    const time = (performance.now() - state.startTime) / 1000;

    // Simulate audio-reactive intensity (always animated)
    const intensity = simulateAudioIntensity(time);

    // Update uniforms (must match WGSL struct alignment)
    // Layout: time(f32) + padding(f32) + resolution(vec2<f32>) + intensity(f32) + padding(3xf32)
    const uniformData = new Float32Array([
      time,           // offset 0: time
      0,              // offset 4: padding (vec2 needs 8-byte alignment)
      canvas.width,   // offset 8: resolution.x
      canvas.height,  // offset 12: resolution.y
      intensity,      // offset 16: intensity
      0, 0, 0,        // offset 20: padding to 32 bytes
    ]);
    state.device.queue.writeBuffer(state.uniformBuffer, 0, uniformData);

    // Create command encoder
    const commandEncoder = state.device.createCommandEncoder();

    // Get current texture
    const textureView = state.context.getCurrentTexture().createView();

    // Begin render pass
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    renderPass.setPipeline(state.pipeline);
    renderPass.setBindGroup(0, state.bindGroup);
    renderPass.draw(6); // 6 vertices for full-screen quad
    renderPass.end();

    // Submit commands
    state.device.queue.submit([commandEncoder.finish()]);

    // Continue animation
    state.animationFrame = requestAnimationFrame(renderFrame);
  }

  // Start animation loop
  function startAnimation() {
    renderFrame();
  }

  // Initialize WebGPU
  async function initWebGPU() {
    // Check WebGPU support
    if (!navigator.gpu) {
      console.warn('[GpuWaveform] WebGPU not supported');
      showFallback('WebGPU not supported');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = gpuStateRef.current;

    try {
      // Request adapter and device
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        throw new Error('No WebGPU adapter found');
      }

      state.device = await adapter.requestDevice();

      // Get WebGPU context
      state.context = canvas.getContext('webgpu');

      if (!state.context) {
        throw new Error('Failed to get WebGPU context');
      }

      // Check for HDR support
      const format = navigator.gpu.getPreferredCanvasFormat();

      // Try to use rgba16float for HDR
      let canvasFormat = 'rgba16float';
      let toneMapping = { mode: 'extended' };

      // Configure canvas with HDR settings
      try {
        state.context.configure({
          device: state.device,
          format: canvasFormat,
          toneMapping: toneMapping,
          alphaMode: 'premultiplied',
        });
        state.isHDR = true;
        isHDR.value = true;
        host.setAttribute('hdr', '');
        console.log('[GpuWaveform] HDR mode enabled (rgba16float + extended tone mapping)');
      } catch (e) {
        // Fallback to standard format
        console.warn('[GpuWaveform] HDR not available, using standard format');
        canvasFormat = format;
        state.context.configure({
          device: state.device,
          format: canvasFormat,
          alphaMode: 'premultiplied',
        });
      }

      // Create shader module
      const shaderModule = state.device.createShaderModule({
        label: 'Waveform Shader',
        code: SHADER,
      });

      // Create uniform buffer
      // WGSL alignment: time(f32)=4, pad=4, resolution(vec2)=8, intensity(f32)=4, pad=12 -> 32 bytes
      state.uniformBuffer = state.device.createBuffer({
        size: 32, // Aligned for: f32 + padding + vec2<f32> + f32 + padding
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // Create bind group layout
      const bindGroupLayout = state.device.createBindGroupLayout({
        entries: [{
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        }],
      });

      // Create bind group
      state.bindGroup = state.device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
          binding: 0,
          resource: { buffer: state.uniformBuffer },
        }],
      });

      // Create pipeline
      state.pipeline = state.device.createRenderPipeline({
        layout: state.device.createPipelineLayout({
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

      state.initialized = true;
      state.startTime = performance.now();
      startAnimation();

      console.log('[GpuWaveform] WebGPU initialized successfully');

    } catch (error) {
      console.error('[GpuWaveform] WebGPU initialization failed:', error);
      showFallback('WebGPU init failed');
    }
  }

  // Cleanup WebGPU resources
  function cleanup() {
    const state = gpuStateRef.current;

    if (state.animationFrame) {
      cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }

    if (state.uniformBuffer) {
      state.uniformBuffer.destroy();
      state.uniformBuffer = null;
    }

    state.device = null;
    state.context = null;
    state.pipeline = null;
    state.bindGroup = null;
    state.initialized = false;
  }

  // Initialize WebGPU on mount, cleanup on unmount
  useEffect(() => {
    initWebGPU();

    return () => {
      cleanup();
    };
  }, []);

  // Expose public API to host element
  if (!Object.getOwnPropertyDescriptor(host, 'active')) {
    Object.defineProperty(host, 'active', {
      configurable: true,
      get() {
        return host.hasAttribute('active');
      },
      set(value) {
        const newActive = Boolean(value);
        const wasActive = host.hasAttribute('active');

        if (wasActive !== newActive) {
          console.log('[GpuWaveform] Active:', newActive);
        }

        host.toggleAttribute('active', newActive);
        isActive.value = newActive;

        // Clear inline styles so CSS can take over
        host.style.opacity = '';
        host.style.visibility = '';
      },
    });
  }

  if (!Object.getOwnPropertyDescriptor(host, 'isHDR')) {
    Object.defineProperty(host, 'isHDR', {
      configurable: true,
      get() {
        return isHDR.value;
      },
    });
  }

  // Render fallback or canvas
  if (fallbackMessage.value) {
    return html`
      <div class="fallback">${fallbackMessage.value}</div>
    `;
  }

  return html`
    <${ErrorBoundary} name="GpuWaveform">
      <canvas ref=${canvasRef}></canvas>
    <//>
  `;
}

export default createShadowComponent(GpuWaveform, {
  tag: 'gpu-waveform',
  styleUrl: './src/components/styles/gpu-waveform.css',
});
