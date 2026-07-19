'use strict';
/* The Bootlegger — WebGL2 post pipeline.
 * The 2D canvas draws the scene; this layer relights it: point-light
 * accumulation (street lamps, headlamps, signage), dual-Kawase bloom, then a
 * film pass (chromatic aberration, ACES tonemap, night tint, vignette).
 * If WebGL2 is unavailable the game falls back to the 2D lighting overlay. */

(function () {
  const MAX_LIGHTS = 16;

  const VERT = `#version 300 es
  in vec2 aPos;
  out vec2 vUV;
  void main() {
    vUV = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }`;

  const LIGHT_FRAG = `#version 300 es
  precision highp float;
  in vec2 vUV;
  uniform sampler2D uScene;
  uniform vec2 uResolution;
  uniform float uAmbient;
  uniform vec4 uLightPosRI[${MAX_LIGHTS}];   // x, y (px, y-down), radius, intensity
  uniform vec3 uLightColor[${MAX_LIGHTS}];
  uniform int uLightCount;
  out vec4 fragColor;
  void main() {
    vec3 scene = texture(uScene, vec2(vUV.x, 1.0 - vUV.y)).rgb;
    vec2 fragPx = vec2(vUV.x, 1.0 - vUV.y) * uResolution;
    vec3 lit = scene * uAmbient;
    vec3 N = vec3(0.0, 0.0, 1.0);
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      if (i >= uLightCount) break;
      vec4 L = uLightPosRI[i];
      float d = length(L.xy - fragPx);
      float atten = clamp(1.0 - d / L.z, 0.0, 1.0);
      atten *= atten;
      vec3 dir = normalize(vec3(L.xy - fragPx, 60.0));
      float diff = max(dot(N, dir), 0.0);
      lit += scene * uLightColor[i] * diff * atten * L.w;
    }
    fragColor = vec4(min(lit, 1.5), 1.0);
  }`;

  const BRIGHT_FRAG = `#version 300 es
  precision mediump float;
  in vec2 vUV;
  uniform sampler2D uScene;
  uniform float uThreshold;
  out vec4 fragColor;
  void main() {
    vec3 c = texture(uScene, vUV).rgb;
    float b = dot(c, vec3(0.2126, 0.7152, 0.0722));
    fragColor = b > uThreshold ? vec4(c * (b - uThreshold), 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
  }`;

  const BLUR_FRAG = `#version 300 es
  precision mediump float;
  in vec2 vUV;
  uniform sampler2D uTex;
  uniform vec2 uTexelSize;
  uniform float uOffset;
  out vec4 fragColor;
  void main() {
    vec4 sum = texture(uTex, vUV + uTexelSize * vec2( uOffset,  uOffset));
    sum     += texture(uTex, vUV + uTexelSize * vec2(-uOffset,  uOffset));
    sum     += texture(uTex, vUV + uTexelSize * vec2( uOffset, -uOffset));
    sum     += texture(uTex, vUV + uTexelSize * vec2(-uOffset, -uOffset));
    fragColor = sum * 0.25;
  }`;

  const POST_FRAG = `#version 300 es
  precision mediump float;
  in vec2 vUV;
  uniform sampler2D uScene;
  uniform sampler2D uBloom;
  uniform float uChromatic;
  uniform float uVignette;
  uniform float uNightTint;
  out vec4 fragColor;
  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  void main() {
    // the lighting pass already un-flipped the canvas upload; sample straight
    vec2 uv = vUV;
    vec2 dir = uv - 0.5;
    float s = uChromatic * length(dir);
    float r = texture(uScene, uv + dir * s).r;
    float g = texture(uScene, uv).g;
    float b = texture(uScene, uv - dir * s * 0.5).b;
    vec3 color = vec3(r, g, b);
    color += texture(uBloom, uv).rgb * 0.55;
    color = mix(color, color * vec3(0.62, 0.74, 1.18), uNightTint * 0.42);
    color = aces(color);
    float vig = 1.0 - smoothstep(0.42, 0.95, length(dir) * uVignette * 2.0);
    fragColor = vec4(color * vig, 1.0);
  }`;

  function compile(gl, src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, fragSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, VERT, gl.VERTEX_SHADER));
    gl.attachShader(p, compile(gl, fragSrc, gl.FRAGMENT_SHADER));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function fbo(gl, w, h) {
    const f = gl.createFramebuffer(), t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { f, t, w, h };
  }

  B.initGlfx = function (sourceCanvas) {
    const out = document.getElementById('glout');
    let gl;
    try {
      gl = out.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
    } catch (e) { gl = null; }
    if (!gl) { out.classList.add('hidden'); B.glfx = null; return; }

    const W = out.width = sourceCanvas.width;
    const H = out.height = sourceCanvas.height;
    const HW = W >> 1, HH = H >> 1;

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const progs = {
      light: program(gl, LIGHT_FRAG),
      bright: program(gl, BRIGHT_FRAG),
      blur: program(gl, BLUR_FRAG),
      post: program(gl, POST_FRAG),
    };
    for (const p of Object.values(progs)) {
      gl.useProgram(p);
      const loc = gl.getAttribLocation(p, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    const sceneTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const litFBO = fbo(gl, W, H);
    const brightFBO = fbo(gl, HW, HH);
    const pingFBO = fbo(gl, HW, HH);

    const posRI = new Float32Array(MAX_LIGHTS * 4);
    const colors = new Float32Array(MAX_LIGHTS * 3);

    function draw() { gl.drawArrays(gl.TRIANGLES, 0, 3); }
    function bindQuad(p) {
      gl.useProgram(p);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const loc = gl.getAttribLocation(p, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    B.glfx = {
      ok: true,
      render(lights, ambient, nightTint) {
        // upload the 2D scene
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

        // 1 — relight into full-res FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, litFBO.f);
        gl.viewport(0, 0, W, H);
        bindQuad(progs.light);
        gl.uniform1i(gl.getUniformLocation(progs.light, 'uScene'), 0);
        gl.uniform2f(gl.getUniformLocation(progs.light, 'uResolution'), W, H);
        gl.uniform1f(gl.getUniformLocation(progs.light, 'uAmbient'), ambient);
        const n = Math.min(lights.length, MAX_LIGHTS);
        for (let i = 0; i < n; i++) {
          const L = lights[i];
          posRI[i * 4] = L.x; posRI[i * 4 + 1] = L.y; posRI[i * 4 + 2] = L.r; posRI[i * 4 + 3] = L.i;
          colors[i * 3] = L.c[0]; colors[i * 3 + 1] = L.c[1]; colors[i * 3 + 2] = L.c[2];
        }
        gl.uniform4fv(gl.getUniformLocation(progs.light, 'uLightPosRI'), posRI);
        gl.uniform3fv(gl.getUniformLocation(progs.light, 'uLightColor'), colors);
        gl.uniform1i(gl.getUniformLocation(progs.light, 'uLightCount'), n);
        draw();

        // 2 — bright pass at half res
        gl.bindFramebuffer(gl.FRAMEBUFFER, brightFBO.f);
        gl.viewport(0, 0, HW, HH);
        bindQuad(progs.bright);
        gl.bindTexture(gl.TEXTURE_2D, litFBO.t);
        gl.uniform1i(gl.getUniformLocation(progs.bright, 'uScene'), 0);
        gl.uniform1f(gl.getUniformLocation(progs.bright, 'uThreshold'), 0.72);
        draw();

        // 3 — dual-Kawase blur ping-pong
        bindQuad(progs.blur);
        gl.uniform1i(gl.getUniformLocation(progs.blur, 'uTex'), 0);
        gl.uniform2f(gl.getUniformLocation(progs.blur, 'uTexelSize'), 1 / HW, 1 / HH);
        let src = brightFBO, dst = pingFBO;
        [0.5, 1.5, 2.5, 3.5].forEach(off => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, dst.f);
          gl.viewport(0, 0, HW, HH);
          gl.bindTexture(gl.TEXTURE_2D, src.t);
          gl.uniform1f(gl.getUniformLocation(progs.blur, 'uOffset'), off);
          draw();
          const t = src; src = dst; dst = t;
        });

        // 4 — film pass to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, W, H);
        bindQuad(progs.post);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, litFBO.t);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, src.t);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(gl.getUniformLocation(progs.post, 'uScene'), 0);
        gl.uniform1i(gl.getUniformLocation(progs.post, 'uBloom'), 1);
        gl.uniform1f(gl.getUniformLocation(progs.post, 'uChromatic'), 0.004);
        gl.uniform1f(gl.getUniformLocation(progs.post, 'uVignette'), 0.62);
        gl.uniform1f(gl.getUniformLocation(progs.post, 'uNightTint'), nightTint);
        draw();
      },
    };
  };

  /* gather this frame's lights in screen-space pixels */
  B.collectLights = function (cam) {
    const ts = B.TILE, out = [];
    const dark = B.darkness();
    const px = (x, y) => [(x - cam.x) * ts, (y - cam.y) * ts];
    const onScreen = (x, y, m) => x > -m && y > -m && x < B.VIEW_W + m && y < B.VIEW_H + m;

    if (dark > 0.12) {
      // street lamps
      for (const d of B.decor) {
        if (d.type !== 'lamp') continue;
        const [x, y] = px(d.x + 0.5, d.y + 0.15);
        if (!onScreen(x, y, 220)) continue;
        out.push({ x, y, r: 210, i: 1.15 * dark, c: [1.0, 0.78, 0.42] });
      }
      // the Tiger's marquee + alley lamp
      if (B.state && B.state.speakeasy.openForBusiness && !B.state.speakeasy.closedTonight && B.isNight()) {
        const [mx, my] = px(46.5, 68.2);
        if (onScreen(mx, my, 240)) out.push({ x: mx, y: my, r: 230, i: 1.1, c: [1.0, 0.72, 0.35] });
        const [ax, ay] = px(52.0, 63.5);
        if (onScreen(ax, ay, 150)) out.push({ x: ax, y: ay, r: 130, i: 1.2, c: [1.0, 0.32, 0.22] });
      }
      // the Ambassador's HOTEL neon
      const [hx, hy] = px(67.2, 34.2);
      if (onScreen(hx, hy, 160)) out.push({ x: hx, y: hy, r: 120, i: 0.8, c: [1.0, 0.35, 0.28] });
      // headlamps: player truck + prowl car
      const heads = [];
      if (B.player.inTruck || B.dist(B.truck.x, B.truck.y, B.player.x, B.player.y) < 30) heads.push(B.truck);
      const prowl = B.npcById && B.npcById('prowl');
      if (prowl && !prowl.hidden) heads.push(prowl);
      for (const c of B.npcs) if (c.kind === 'car' && !c.hidden) heads.push(c);
      for (const v of heads) {
        const hx = v.x + Math.cos(v.facing) * 2.4, hy = v.y + Math.sin(v.facing) * 2.4;
        const [x, y] = px(hx, hy);
        if (!onScreen(x, y, 200)) continue;
        out.push({ x, y, r: 180, i: 0.9 * dark, c: [1.0, 0.92, 0.7] });
      }
    }
    // sort nearest-to-center first so the cap keeps the ones that matter
    out.sort((a, b) =>
      Math.hypot(a.x - B.VIEW_W / 2, a.y - B.VIEW_H / 2) - Math.hypot(b.x - B.VIEW_W / 2, b.y - B.VIEW_H / 2));
    return out.slice(0, MAX_LIGHTS);
  };
})();
