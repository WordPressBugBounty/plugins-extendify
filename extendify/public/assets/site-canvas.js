// Falling snowflakes over the page: a WebGL shader on a canvas that never takes a click.
// It stays off for reduced motion, and a browser without WebGL2 simply shows no snow.
(() => {
	const script = document.currentScript;
	if (!script || new URL(script.src).searchParams.get('effect') !== 'snow') {
		return;
	}
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	canvas.style.cssText =
		'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483646';
	const gl = canvas.getContext('webgl2', {
		alpha: true,
		premultipliedAlpha: true,
		antialias: false,
		depth: false,
		powerPreference: 'low-power',
		failIfMajorPerformanceCaveat: true,
	});
	if (!gl) return;
	// Drawn in software, the shader would take the CPU from the page itself.
	const info = gl.getExtension('WEBGL_debug_renderer_info');
	const renderer = `${gl.getParameter(gl.RENDERER)} ${info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : ''}`;
	if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return;

	// Bundled from the shader library's blocks; the art controls sit at its top.
	// spellchecker:off
	const SNOW = `// Falling snowflakes over a web page, drawn on a transparent overlay.
// Near layers are six-armed crystals that turn as they fall; far layers are soft dots, too small to read as shapes.
// The output is premultiplied alpha, so the page shows through wherever no flake is.

#define DEBUG_MODE 0 // 0 final, 1 nearest flake distance, 3 cell ids, 5 masks (core red, rim green)

// Library code below is bundled from shader-skills (MIT): https://github.com/gokayfem/shader-skills
// ---- shader-skills library: common ----
const float TAU = 6.28318530717959;
// 2D rotation matrix. \`rot2(a) * v\` rotates v counter-clockwise by a radians. (cos, sin) is renormalized because GLSL ES leaves trig precision undefined: on SwiftShader and some mobile GPUs a raw cos/sin pair is far enough from unit length that rotations stop preserving distances.
mat2 rot2(float a) {
    vec2 cs = normalize(vec2(cos(a), sin(a)));
    return mat2(cs.x, cs.y, -cs.y, cs.x);
}

// ---- shader-skills library: hash ----
// PCG-style 1D integer hash.
uint pcgHash(uint v) {
    uint state = v * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}
// 3D integer hash, three decorrelated outputs.
uvec3 pcg3d(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}
// Map a uint to [0,1) using the top 24 bits, so the result can never round up to 1.0.
float uintToUnit(uint h) { return float(h >> 8u) * (1.0 / 16777216.0); }
vec2 uintToUnit(uvec2 h) { return vec2(h >> 8u) * (1.0 / 16777216.0); }
vec3 uintToUnit(uvec3 h) { return vec3(h >> 8u) * (1.0 / 16777216.0); }
vec4 uintToUnit(uvec4 h) { return vec4(h >> 8u) * (1.0 / 16777216.0); }
// Random float in [0,1) for an integer-valued input.
float hash11(float p) { return uintToUnit(pcgHash(uint(int(floor(p))))); }
// Random float in [0,1) for an integer-valued 2D input.
float hash12(vec2 p) {
    uvec2 q = uvec2(ivec2(floor(p)));
    return uintToUnit(pcgHash(q.x + pcgHash(q.y)));
}
// Random vec2 in [0,1)^2 for an integer-valued 2D input.
vec2 hash22(vec2 p) {
    ivec2 q = ivec2(floor(p));
    return uintToUnit(pcg3d(uvec3(q.x, q.y, 0x2545u))).xy;
}
// Random vec3 in [0,1)^3 for an integer-valued 2D input.
vec3 hash32(vec2 p) {
    ivec2 q = ivec2(floor(p));
    return uintToUnit(pcg3d(uvec3(q.x, q.y, 0x9E37u)));
}

// ---- shader-skills library: sdf2d ----
// Circle of radius r.
float sdCircle(vec2 p, float r) { return length(p) - r; }
// Unsigned distance to segment a-b. Subtract a width to get a stroke.
float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// ---- shader-skills library: domain ----
// Cell index for repetition with period s (integer-valued; use with hash functions).
float domRepeatId(float p, float s) { return floor(p / s + 0.5); }
vec2 domRepeatId(vec2 p, vec2 s) { return floor(p / s + 0.5); }
vec3 domRepeatId(vec3 p, vec3 s) { return floor(p / s + 0.5); }
// Polar repetition into n sectors around the origin. Returns the point rotated into the sector centered on +X. Single evaluation: exact for shapes symmetric about their sector's center line. For asymmetric or per-sector-varying shapes, evaluate this sector and its neighbor and take the min (see references/sdf-library-guide.md).
vec2 domPolar(vec2 p, float n) {
    if (dot(p, p) < 1e-20) return p;
    float sector = TAU / n;
    float id = floor(atan(p.y, p.x) / sector + 0.5);
    return rot2(-id * sector) * p;
}

// ---- shader-skills library: color ----
// Exact sRGB decode (EOTF): encoded [0,1] -> linear.
vec3 srgbToLinear(vec3 c) {
    c = max(c, 0.0);
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
// Exact sRGB encode (OETF): linear -> display [0,1]. Apply exactly once, after tonemapping. pow(c, 1/2.2) is visibly wrong near black (0.001 encodes to 0.013 here vs 0.043 with 2.2).
vec3 linearToSrgb(vec3 c) {
    c = max(c, 0.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// ---- shader-skills library: post ----
// Antialiased fill of a 2D SDF: 1 inside, 0 outside, box-filtered across one pixel. Uses screen derivatives, so call it outside non-uniform branches and loops. For a fixed pixel size use fillAA(d, px).
float fillAA(float d) {
    float w = length(vec2(dFdx(d), dFdy(d)));
    return clamp(0.5 - d / max(w, 1e-6), 0.0, 1.0);
}
// Antialiased fill with an explicit pixel size px (e.g. 2.0 / iResolution.y for the standard uv). Safe in loops and branches.
float fillAA(float d, float px) { return clamp(0.5 - d / px, 0.0, 1.0); }

// ---- shader ----
// Art controls
const int LAYERS = 4;              // depth layers, near to far
const int CRYSTAL_LAYERS = 2;      // the nearest layers draw crystals; the rest draw dots
const float CELL = 0.30;           // cell size of the nearest layer, in screen heights
const float DEPTH_STEP = 0.55;     // how much smaller and slower each farther layer is
const float FALL = 0.08;           // fall speed of the nearest layer, screen heights per second
const float WIND = 0.012;          // steady sideways drift
const float SWAY = 0.03;           // side-to-side sway
const float SIZE = 0.030;          // nearest crystal radius, in screen heights
const float DENSITY = 0.105;       // share of cells that hold a flake; far layers hold fewer
const float START = 2.0;           // seconds after the page loads before the first flakes fall in from the top
const float LIFT_EVERY = 10.0;     // seconds between each flake's chances of being lifted
const float LIFT_CHANCE = 0.3;     // share of those chances that lift it
const float LIFT_LENGTH = 1.0;     // how long a lift lasts, in seconds
const float LIFT = 0.08;           // how far a lift raises the nearest flakes, in half screen heights
const float PUSH = 0.05;           // how far it pushes them sideways
const float SPIN = 0.35;           // fastest crystal turn, radians per second
const float ARM_WIDTH = 0.07;      // arm half-width, as a share of the crystal radius
const vec3 FLAKE = vec3(1.0);      // sRGB
const vec3 RIM = vec3(0.47, 0.55, 0.64); // sRGB edge, so flakes show on white pages
const float FLAKE_ALPHA = 0.92;
const float RIM_ALPHA = 0.30;
const float RIM_WIDTH = 1.2;       // in pixels

// 0 most of the time; now and then a smooth bump that lifts a flake and lets it settle back.
// Each flake's integer seed shifts its own timing, so flakes lift one by one, never together.
float lift(float t, float seed) {
    float shifted = t + LIFT_EVERY * hash11(seed);
    float period = floor(shifted / LIFT_EVERY);
    float since = shifted - period * LIFT_EVERY;
    vec2 key = vec2(period, seed);
    float comes = step(1.0 - LIFT_CHANCE, hash12(key));
    float peak = LIFT_EVERY * (0.3 + 0.4 * hash12(key + vec2(0.0, 7919.0)));
    float x = (since - peak) / LIFT_LENGTH;
    return comes * exp(-x * x);
}

// A six-armed crystal of radius r. hv varies where its branches sit and how long they are.
float sdCrystal(vec2 q, float r, vec2 hv) {
    q = domPolar(q, 6.0);
    q.y = abs(q.y);
    float w = r * ARM_WIDTH;
    float d = sdSegment(q, vec2(0.0), vec2(r, 0.0)) - w;
    vec2 dir = vec2(0.5, 0.8660254);
    float a1 = r * mix(0.35, 0.50, hv.x);
    float a2 = r * mix(0.62, 0.75, hv.y);
    float l1 = r * mix(0.30, 0.42, hv.y);
    float l2 = r * mix(0.18, 0.28, hv.x);
    d = min(d, sdSegment(q, vec2(a1, 0.0), vec2(a1, 0.0) + dir * l1) - w * 0.85);
    d = min(d, sdSegment(q, vec2(a2, 0.0), vec2(a2, 0.0) + dir * l2) - w * 0.75);
    return min(d, sdCircle(q, r * 0.16));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float px = 2.0 / iResolution.y;
    float core = 0.0;
    float rim = 0.0;
    float nearest = 1e10;
    vec2 nearestId = vec2(0.0);
    for (int layer = 0; layer < LAYERS; layer++) {
        float k = float(layer);
        float depth = 1.0 + k * DEPTH_STEP;
        float cell = CELL / depth;
        float fade = mix(1.0, 0.45, k / float(LAYERS - 1));
        float soft = px * (1.0 + 0.8 * k); // farther flakes blur, like out of focus
        float density = DENSITY * mix(1.0, 0.7, k / float(LAYERS - 1));
        // Nothing falls before START; sliding the samples up after it moves the flakes down the screen.
        float fallen = max(iTime - START, 0.0);
        vec2 p = uv + vec2(fallen * WIND / depth + k * 7.31, fallen * FALL / depth + k * 3.17);
        vec2 id = domRepeatId(p, vec2(cell));
        vec2 side = sign(p - cell * id);
        // Flakes jitter, sway and lift past their cell's edge, so the neighbors p leans toward are checked too.
        for (int j = 0; j < 2; j++)
        for (int i = 0; i < 2; i++) {
            vec2 c = id + vec2(float(i), float(j)) * side;
            vec2 salt = c + vec2(0.0, 1024.0 * k);
            if (hash12(salt + vec2(57.0, 0.0)) > density) continue;
            vec2 h = hash22(salt);
            vec2 center = cell * (c + (h - 0.5) * 0.6);
            float r = SIZE / depth * (0.65 + 0.7 * h.y);
            // A flake that sat on screen when the snow started would pop in, so only those above the top fall in.
            if (center.y - k * 3.17 < 1.0 + r) continue;
            center.x += SWAY / depth * sin(iTime * (0.5 + 0.5 * h.x) + 6.2831853 * h.y);
            float up = lift(iTime, c.x * 131.0 + c.y * 17.0 + k * 1009.0) / depth;
            center += vec2(PUSH * (2.0 * h.x - 1.0), LIFT) * up;
            vec2 q = p - center;
            float d;
            if (layer < CRYSTAL_LAYERS) {
                q = rot2(6.2831853 * h.x + iTime * SPIN * (2.0 * h.x - 1.0)) * q;
                d = sdCrystal(q, r, h);
            } else {
                d = sdCircle(q, r * 0.35);
            }
            core = max(core, fillAA(d, soft) * fade);
            rim = max(rim, fillAA(d - px * RIM_WIDTH, soft) * fade);
            if (d < nearest) {
                nearest = d;
                nearestId = c;
            }
        }
    }
    float a = max(core * FLAKE_ALPHA, rim * RIM_ALPHA);
    float white = clamp(core * FLAKE_ALPHA / max(a, 1e-4), 0.0, 1.0);
    vec3 col = linearToSrgb(mix(srgbToLinear(RIM), srgbToLinear(FLAKE), white));
#if DEBUG_MODE == 1
    fragColor = vec4(vec3(clamp(0.5 + nearest / (8.0 * px), 0.0, 1.0)), 1.0);
#elif DEBUG_MODE == 3
    fragColor = vec4(hash32(nearestId), 1.0);
#elif DEBUG_MODE == 5
    fragColor = vec4(core, rim, 0.0, 1.0);
#else
    fragColor = vec4(col * a, a);
#endif
}`;
	// spellchecker:on

	const compile = (type, source) => {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
	};
	const vertex = compile(
		gl.VERTEX_SHADER,
		`#version 300 es
in vec2 corner;
void main() { gl_Position = vec4(corner, 0.0, 1.0); }`,
	);
	const fragment = compile(
		gl.FRAGMENT_SHADER,
		`#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
out vec4 outColor;
${SNOW}
void main() { mainImage(outColor, gl_FragCoord.xy); }`,
	);
	if (!vertex || !fragment) return;
	const program = gl.createProgram();
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.bindAttribLocation(program, 0, 'corner');
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
	gl.useProgram(program);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		gl.STATIC_DRAW,
	);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	const resolution = gl.getUniformLocation(program, 'iResolution');
	const time = gl.getUniformLocation(program, 'iTime');

	// Past 1.5 pixels per CSS pixel or 2.5 million in all, flakes look no better.
	const resize = () => {
		const area = window.innerWidth * window.innerHeight;
		const scale = Math.min(
			window.devicePixelRatio || 1,
			1.5,
			Math.sqrt(2500000 / Math.max(area, 1)),
		);
		canvas.width = Math.round(window.innerWidth * scale);
		canvas.height = Math.round(window.innerHeight * scale);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform3f(resolution, canvas.width, canvas.height, 1);
	};

	let lost = false;
	canvas.addEventListener('webglcontextlost', () => {
		lost = true;
	});
	const started = performance.now();
	const frame = (now) => {
		if (lost) return;
		gl.uniform1f(time, (now - started) / 1000);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		window.requestAnimationFrame(frame);
	};

	const begin = () => {
		document.body.append(canvas);
		resize();
		window.addEventListener('resize', resize);
		window.requestAnimationFrame(frame);
	};
	if (document.body) begin();
	else document.addEventListener('DOMContentLoaded', begin);
})();
