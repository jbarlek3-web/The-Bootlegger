'use strict';
/* The Bootlegger — glfx: WebGL2 lighting + film post-processing.
 * The 2D canvas keeps drawing the fully-lit scene; every frame it is uploaded
 * as a texture and run through: point-light accumulation with day/night
 * ambient -> bloom (bright pass + separable blur) -> sepia grade, vignette,
 * chromatic aberration, film grain. Falls back to the old canvas night
 * overlay when WebGL2 is unavailable. */

(function () {
  const MAXL = 48;

  const VS = `#version 300 es
  layout(location=0) in vec2 aPos;
  uniform float uFlip;
  out vec2 vUV;
  void main() {
    vUV = aPos * 0.5 + 0.5;
    vUV.y = mix(vUV.y, 1.0 - vUV.y, uFlip);
    gl_Position = vec4(aPos, 0.0, 1.0);
  }`;

  const BRIGHT_FS = `#version 300 es
  precision highp float;
  in vec2 vUV; out vec4 frag;
  uniform sampler2D uScene;
  void main() {
    vec3 c = texture(uScene, vUV).rgb;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    frag = vec4(c * smoothstep(0.62, 0.9, l), 1.0);
  }`;

  const BLUR_FS = `#version 300 es
  precision highp float;
  in vec2 vUV; out vec4 frag;
  uniform sampler2D uScene;
  uniform vec2 uDir;               // (1/w, 0) or (0, 1/h)
  void main() {
    vec3 c = texture(uScene, vUV).rgb * 0.227;
    c += texture(uScene, vUV + uDir * 1.385).rgb * 0.316;
    c += texture(uScene, vUV - uDir * 1.385).rgb * 0.316;
    c += texture(uScene, vUV + uDir * 3.231).rgb * 0.070;
    c += texture(uScene, vUV - uDir * 3.231).rgb * 0.070;
    frag = vec4(c, 1.0);
  }`;

  const FINAL_FS = `#version 300 es
  precision highp float;
  in vec2 vUV; out vec4 frag;
  uniform sampler2D uScene;        // raw 2D scene
  uniform sampler2D uBloom;
  uniform vec2 uRes;
  uniform float uDark;
  uniform float uTime;
  uniform int uN;
  uniform vec4 uL[${MAXL}];        // x, y, radius, intensity
  uniform vec3 uLC[${MAXL}];       // color
  void main() {
    // subtle radial chromatic aberration
    vec2 off = (vUV - 0.5) * (1.6 / uRes.x);
    vec3 col;
    col.r = texture(uScene, vUV + off).r;
    col.g = texture(uScene, vUV).g;
    col.b = texture(uScene, vUV - off).b;
    // day/night ambient + point-light accumulation
    vec2 px = vUV * uRes;
    vec3 lit = col * mix(vec3(1.0), vec3(0.34, 0.38, 0.56), uDark);
    for (int k = 0; k < ${MAXL}; k++) {
      if (k >= uN) break;
      float d = distance(px, uL[k].xy);
      float a = max(0.0, 1.0 - d / uL[k].z);
      a *= a;
      lit += col * uLC[k] * a * uL[k].w;            // re-lit surface
      lit += uLC[k] * a * a * uL[k].w * 0.20;       // atmospheric halo
    }
    col = lit + texture(uBloom, vUV).rgb * 0.85;
    // period grade: mild desaturation, warm split-tone
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(l), col, 0.84);
    col = pow(col, vec3(0.95, 1.0, 1.07));
    col *= vec3(1.07, 0.99, 0.88);
    // gentle S-curve
    col = mix(col, col * col * (3.0 - 2.0 * col), 0.35);
    // vignette
    float vig = 1.0 - smoothstep(0.55, 1.28, length(vUV - 0.5) * 1.9);
    col *= mix(0.72, 1.0, vig);
    // film grain, heavier after dark
    float gn = fract(sin(dot(vUV * uRes + mod(uTime, 977.0), vec2(12.9898, 78.233))) * 43758.5453);
    col += (gn - 0.5) * (0.028 + 0.034 * uDark);
    frag = vec4(col, 1.0);
  }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, fsSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function makeTex(gl, w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function makeFBO(gl, w, h) {
    const tex = makeTex(gl, w, h);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, w, h };
  }

  /* when the shader pipeline is unavailable, approximate the period grade
   * with a compositor-side CSS filter on the 2D canvas */
  function fallbackGrade(src) {
    if (src) src.style.filter = 'sepia(0.22) saturate(0.92) contrast(1.05) brightness(0.985)';
    B.glfx = { ok: false };
  }

  B.initGlfx = function () {
    const src = document.getElementById('game');
    if (!src) { B.glfx = { ok: false }; return; }
    const W = B.VIEW_W, H = B.VIEW_H, BW = W >> 2, BH = H >> 2;
    const cv = document.createElement('canvas');
    cv.id = 'glfx';
    cv.width = W; cv.height = H;
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;';
    let gl;
    try {
      gl = cv.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
    } catch (e) { gl = null; }
    if (!gl) { fallbackGrade(src); return; }

    let pBright, pBlur, pFinal;
    try {
      pBright = program(gl, BRIGHT_FS);
      pBlur = program(gl, BLUR_FS);
      pFinal = program(gl, FINAL_FS);
    } catch (e) { fallbackGrade(src); return; }

    src.parentNode.insertBefore(cv, src.nextSibling);

    // fullscreen triangle
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const sceneTex = makeTex(gl, W, H);
    const fA = makeFBO(gl, BW, BH);
    const fB = makeFBO(gl, BW, BH);

    const U = p => ({
      flip: gl.getUniformLocation(p, 'uFlip'),
      scene: gl.getUniformLocation(p, 'uScene'),
      bloom: gl.getUniformLocation(p, 'uBloom'),
      res: gl.getUniformLocation(p, 'uRes'),
      dark: gl.getUniformLocation(p, 'uDark'),
      time: gl.getUniformLocation(p, 'uTime'),
      dir: gl.getUniformLocation(p, 'uDir'),
      n: gl.getUniformLocation(p, 'uN'),
      l: gl.getUniformLocation(p, 'uL'),
      lc: gl.getUniformLocation(p, 'uLC'),
    });
    const uBright = U(pBright), uBlur = U(pBlur), uFinal = U(pFinal);

    const lData = new Float32Array(MAXL * 4);
    const lCol = new Float32Array(MAXL * 3);

    /* gather this frame's light sources in screen pixels */
    function gatherLights(cam) {
      const ts = B.TILE;
      let n = 0;
      const dark = B.darkness();
      const push = (x, y, r, ix, cr, cg, cb) => {
        if (n >= MAXL) return;
        if (x < -r || y < -r || x > W + r || y > H + r) return;
        lData[n * 4] = x; lData[n * 4 + 1] = y; lData[n * 4 + 2] = r; lData[n * 4 + 3] = ix;
        lCol[n * 3] = cr; lCol[n * 3 + 1] = cg; lCol[n * 3 + 2] = cb;
        n++;
      };
      if (dark > 0.05) {
        for (const d of B.decor) {
          if (d.type !== 'lamp') continue;
          push((d.x - cam.x) * ts + 16, (d.y - cam.y) * ts + 3, 130, 1.05 * dark, 1.0, 0.82, 0.46);
        }
        // the Tiger's alley glow when the joint is jumping
        if (B.state && B.state.speakeasy.openForBusiness && B.isNight() && !B.state.speakeasy.closedTonight) {
          push((51.5 - cam.x) * ts, (63.5 - cam.y) * ts, 95, 0.9, 1.0, 0.52, 0.34);
        }
        // headlights: player truck + prowl car
        const beams = [];
        if (B.truck) beams.push(B.truck);
        for (const c of B.npcs) if (c.kind === 'patrolcar' && !c.hidden) beams.push(c);
        for (const v of beams) {
          const vx = (v.x - cam.x) * ts, vy = (v.y - cam.y) * ts;
          const fx = Math.cos(v.facing), fy = Math.sin(v.facing);
          push(vx + fx * 34, vy + fy * 34, 85, 0.85 * dark, 1.0, 0.9, 0.62);
          push(vx + fx * 86, vy + fy * 86, 120, 0.55 * dark, 1.0, 0.88, 0.58);
        }
      }
      return n;
    }

    /* if the GPU can't hold the frame budget (software GL), bow out to the
     * canvas-2D fallback so the game itself never slows down */
    let frames = 0, tPrev = 0, tAcc = 0;
    function tooSlow() {
      const now = performance.now();
      const d = now - tPrev;
      if (tPrev && d < 250) { tAcc += d; frames++; }   // ignore tab-switch gaps
      tPrev = now;
      if (frames === 45) {
        if (tAcc / frames > 30) return true;
        frames = 46;                 // measured fast — stop sampling
      }
      return false;
    }
    function teardown() {
      cv.remove();
      fallbackGrade(src);
    }

    B.glfx = {
      ok: true,
      render(cam) {
        if (tooSlow()) return teardown();
        const dark = B.darkness();
        // 1. upload the 2D scene
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);

        // 2. bright pass -> fA (quarter res)
        gl.useProgram(pBright);
        gl.uniform1f(uBright.flip, 0);
        gl.uniform1i(uBright.scene, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fA.fbo);
        gl.viewport(0, 0, BW, BH);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // 3. separable blur A->B->A
        gl.useProgram(pBlur);
        gl.uniform1f(uBlur.flip, 0);
        gl.uniform1i(uBlur.scene, 0);
        gl.bindTexture(gl.TEXTURE_2D, fA.tex);
        gl.uniform2f(uBlur.dir, 1 / BW, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fB.fbo);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindTexture(gl.TEXTURE_2D, fB.tex);
        gl.uniform2f(uBlur.dir, 0, 1 / BH);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fA.fbo);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // 4. single full-res pass: lighting + bloom + grade to screen (flipped)
        const n = gatherLights(cam);
        gl.useProgram(pFinal);
        gl.uniform1f(uFinal.flip, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.uniform1i(uFinal.scene, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, fA.tex);
        gl.uniform1i(uFinal.bloom, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(uFinal.res, W, H);
        gl.uniform1f(uFinal.dark, dark);
        gl.uniform1f(uFinal.time, B.frame * 0.37);
        gl.uniform1i(uFinal.n, n);
        gl.uniform4fv(uFinal.l, lData);
        gl.uniform3fv(uFinal.lc, lCol);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, W, H);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  };
})();
