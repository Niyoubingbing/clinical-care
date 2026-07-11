"use client";

import { useEffect, useRef } from "react";

export default function LiquidGlassScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pointer → CSS custom properties (drives the DOM light glow on
  // .app-content::before). Throttled to one rAF.
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    const updatePointer = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--glass-pointer-x", `${event.clientX}px`);
        root.style.setProperty("--glass-pointer-y", `${event.clientY}px`);
      });
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vertexSource = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;

    // Upgraded background shader:
    //  - richer cyan-blue / coral-gold / mint colour bands
    //  - stronger animated caustic network
    //  - pointer-following specular highlight (moved out of the CSS layer)
    //  - subtle animated film grain so the backdrop "lives"
    //  - very slow ambient breathing (hue/brightness, ~40s period)
    const fragmentSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform vec2 u_pointer;
      uniform float u_time;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float blob(vec2 uv, vec2 center, float radius) {
        float d = length(uv - center);
        return 1.0 - smoothstep(radius * 0.55, radius, d);
      }

      // Layered sine caustic field (brighter, more structured than before).
      float caustics(vec2 uv, float t) {
        float v = 0.0;
        v += sin(uv.x * 9.0  + t * 1.3 + sin(uv.y * 7.0 + t));
        v += sin(uv.y * 11.0 - t * 1.1 + sin(uv.x * 6.0 - t * 0.8));
        v += sin((uv.x + uv.y) * 8.0 + t * 0.9);
        v = v / 3.0;
        return pow(max(v, 0.0), 3.0);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        float aspect = u_resolution.x / u_resolution.y;
        vec2 p = uv; p.x *= aspect;
        vec2 mouse = u_pointer / u_resolution; mouse.x *= aspect;

        float t = u_time * 0.08;
        // slow ambient breath (≈40s)
        float breath = 0.5 + 0.5 * sin(u_time * 0.16);

        vec2 c1 = vec2(-0.05 + sin(t) * 0.10, 0.74 + cos(t * 1.3) * 0.06);
        vec2 c2 = vec2(aspect + 0.05 + cos(t * 0.8) * 0.10, 0.44 + sin(t) * 0.08);
        vec2 c3 = vec2(aspect * 0.5 + sin(t * 0.7) * 0.14, -0.06 + cos(t * 0.9) * 0.07);

        float b1 = blob(p, c1, 0.50);
        float b2 = blob(p, c2, 0.46);
        float b3 = blob(p, c3, 0.40);

        vec3 base = mix(vec3(0.90, 0.95, 1.0), vec3(0.96, 0.92, 1.0), uv.y);
        vec3 cyanBlue = mix(vec3(0.20, 0.86, 0.98), vec3(0.36, 0.32, 0.98), smoothstep(0.05, 0.85, uv.y));
        vec3 coralGold = mix(vec3(1.0, 0.30, 0.66), vec3(1.0, 0.84, 0.36), smoothstep(0.15, 0.85, uv.x));
        vec3 mint = mix(vec3(0.14, 0.88, 0.74), vec3(0.20, 0.56, 1.0), uv.x);

        vec3 color = base;
        color = mix(color, cyanBlue, b1 * 0.95);
        color = mix(color, coralGold, b2 * 0.92);
        color = mix(color, mint, b3 * 0.86);

        // caustics, masked by the blobs so they read as light on glass
        float ca = caustics(uv, u_time * 0.6);
        color += ca * (b1 + b2 + b3) * 0.22;

        // pointer-following specular highlight (shader-driven)
        float md = length(p - mouse);
        float spec = exp(-md * md * 6.0);
        color += spec * vec3(0.5, 0.62, 1.0) * 0.5;

        // subtle animated grain
        float g = hash(gl_FragCoord.xy + u_time * 1.3) - 0.5;
        color += g * 0.025;

        // ambient breathing tint
        color = mix(color, color * vec3(1.02, 1.0, 1.04), breath * 0.5);

        // gentle vignette
        float vig = smoothstep(1.1, 0.2, length(uv - 0.5));
        color *= 0.92 + vig * 0.08;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, "u_resolution");
    const pointer = gl.getUniformLocation(program, "u_pointer");
    const time = gl.getUniformLocation(program, "u_time");
    const pointerState = { x: innerWidth * 0.5, y: innerHeight * 0.62 };
    const start = performance.now();

    const ratio = () => Math.min(devicePixelRatio || 1, 1.5);

    const resize = () => {
      const r = ratio();
      canvas.width = Math.round(innerWidth * r);
      canvas.height = Math.round(innerHeight * r);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const onPointer = (event: PointerEvent) => {
      const r = ratio();
      pointerState.x = event.clientX * r;
      pointerState.y = (innerHeight - event.clientY) * r;
    };

    const draw = (now: number) => {
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointer, pointerState.x, pointerState.y);
      gl.uniform1f(time, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });

    let animationFrame = 0;
    if (reduceMotion) {
      // Render a single static frame; the highlight still follows the
      // pointer on demand, but no autonomous animation runs.
      draw(start);
      const redraw = () => draw(performance.now());
      window.addEventListener("pointermove", redraw, { passive: true });
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointermove", redraw);
        gl.deleteProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        gl.deleteBuffer(buffer);
      };
    }

    const render = (now: number) => {
      draw(now);
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div className="liquid-scene" aria-hidden="true">
      <canvas ref={canvasRef} className="liquid-canvas" />
      <div className="liquid-orb liquid-orb-a" />
      <div className="liquid-orb liquid-orb-b" />
      <div className="liquid-orb liquid-orb-c" />
      <div className="liquid-grain" />
      {/* SVG filter definitions used by the glass ::before / ::after layers.
          - #liquid-glass-warp: fractal-noise displacement → living liquid edge.
          - #liquid-glass-chroma: RGB channel offset → chromatic refraction. */}
      <svg className="liquid-filters" width="0" height="0" aria-hidden="true">
        <filter id="liquid-glass-warp" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.022"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="0.8" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="8"
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
        <filter id="liquid-glass-chroma" x="-12%" y="-12%" width="124%" height="124%">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="r"
          />
          <feOffset in="r" dx="1.2" dy="0" result="ro" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="g"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="b"
          />
          <feOffset in="b" dx="-1.2" dy="0" result="bo" />
          <feBlend in="ro" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="bo" mode="screen" />
        </filter>
      </svg>
    </div>
  );
}
