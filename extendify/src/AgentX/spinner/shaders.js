// Put before every spinner, so a partner's shader is only its functions and main().
export const SPINNER_HEAD = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_color;
uniform vec4 u_accent;
`;

const NOISE = `float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
		u.y
	);
}
`;

const HUE = `// Turns a color around the gray axis, so the accent alone gives a gradient.
vec3 hueShift(vec3 color, float angle) {
	vec3 k = vec3(0.57735);
	return color * cos(angle) + cross(k, color) * sin(angle) + k * dot(k, color) * (1.0 - cos(angle));
}
`;

const HASH = `float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

const PIXELS = `vec2 pixelCell(float g) { return floor(gl_FragCoord.xy / u_resolution.y * g); }
`;

const EASE = `// CSS cubic-bezier(x1, y1, x2, y2) at x.
float ease(float x, vec4 c) {
	x = clamp(x, 0.0, 1.0);
	float cx = 3.0 * c.x;
	float bx = 3.0 * (c.z - c.x) - cx;
	float ax = 1.0 - cx - bx;
	float t = x;
	for (int i = 0; i < 8; i++) {
		float dx = (3.0 * ax * t + 2.0 * bx) * t + cx;
		if (abs(dx) < 1e-5) break;
		t = clamp(t - (((ax * t + bx) * t + cx) * t - x) / dx, 0.0, 1.0);
	}
	float cy = 3.0 * c.y;
	float by = 3.0 * (c.w - c.y) - cy;
	float ay = 1.0 - cy - by;
	return ((ay * t + by) * t + cy) * t;
}
`;

const FILL = `float fill(float d) {
	float px = 2.0 / u_resolution.y;
	return 1.0 - smoothstep(-0.5 * px, 0.5 * px, d);
}

float segment(vec2 p, vec2 a, vec2 b) {
	vec2 ap = p - a;
	vec2 ab = b - a;
	return length(ap - ab * clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0));
}
`;

const ARC = `// Clockwise from 12 o'clock.
vec2 clock(float a) { return vec2(sin(a), cos(a)); }

float sdArc(vec2 p, float r, float start, float sweep) {
	float a = mod(atan(p.x, p.y) - start, 6.2831853);
	if (a <= sweep) return abs(length(p) - r);
	return min(length(p - r * clock(start)), length(p - r * clock(start + sweep)));
}
`;

const MATERIAL_ARC = `${EASE}${FILL}${ARC}${HUE}
void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	vec4 curve = vec4(0.4, 0.0, 0.2, 1.0);
	float period = 1332.0;
	float k = floor(u_time * 1000.0 / period);
	float t = mod(u_time * 1000.0, period);
	float head = 290.0 * ease(t / 666.0, curve);
	float tail = 290.0 * ease((t - 666.0) / 666.0, curve);
	float start = radians(k * 216.0 + 286.0 * t / period + tail);
	float arc = fill(sdArc(p, 0.78, start, radians(max(head - tail, 0.0))) - 0.13);
	float track = fill(abs(length(p) - 0.78) - 0.13) * 0.15;
	vec3 color = hueShift(u_accent.rgb, radians(mod(k, 5.0) * 15.0));
	gl_FragColor = arc > 0.0 ? vec4(color, arc * u_accent.a) : vec4(u_color.rgb, track);
}
`;

const ELASTIC = `${EASE}${FILL}${ARC}
void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float alpha = 0.0;
	// Three quarter arcs, a beat apart, read as one arc that stretches and snaps back.
	for (int i = 1; i <= 3; i++) {
		float start = 6.2831853 * ease(fract(u_time / 1.2 + 0.125 * float(i)), vec4(0.5, 0.0, 0.5, 1.0));
		alpha = max(alpha, fill(sdArc(p, 0.78, start, 1.5707963) - 0.13));
	}
	gl_FragColor = vec4(u_accent.rgb, alpha * u_accent.a);
}
`;

const SPOKES = `${FILL}${ARC}
void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	vec4 color = vec4(0.0);
	for (int i = 0; i < 8; i++) {
		float n = float(i);
		vec2 dir = clock(n * 0.7853982);
		float fade = 1.0 - fract(u_time - n / 8.0);
		float alpha = (0.2 + 0.75 * fade * fade) * fill(segment(p, dir * 0.42, dir * 0.84) - 0.14);
		if (alpha > color.a) color = vec4(mix(u_color.rgb, u_accent.rgb, fade * fade), alpha);
	}
	gl_FragColor = vec4(color.rgb, color.a * u_accent.a);
}
`;

const DOTS = `${EASE}${FILL}${HUE}
float pulse(float ph) {
	vec4 curve = vec4(0.455, 0.03, 0.515, 0.955);
	if (ph < 0.4) return mix(0.35, 1.0, ease(ph / 0.4, curve));
	if (ph < 0.8) return mix(1.0, 0.35, ease((ph - 0.4) / 0.4, curve));
	return 0.35;
}

void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	vec4 color = vec4(0.0);
	for (int i = 0; i < 3; i++) {
		float n = float(i);
		float scale = pulse(fract((u_time - n * 0.15) / 1.4));
		float alpha = fill(length(p - vec2((n - 1.0) * 0.62, 0.0)) - 0.26 * scale) * mix(0.45, 1.0, (scale - 0.35) / 0.65);
		if (alpha > color.a) color = vec4(hueShift(u_accent.rgb, (n - 1.0) * 0.17), alpha);
	}
	gl_FragColor = vec4(color.rgb, color.a * u_accent.a);
}
`;

const BARS = `${EASE}${FILL}
float height(float ph) {
	vec4 curve = vec4(0.42, 0.0, 0.58, 1.0);
	if (ph < 0.2) return mix(0.4, 1.0, ease(ph / 0.2, curve));
	if (ph < 0.4) return mix(1.0, 0.4, ease((ph - 0.2) / 0.2, curve));
	return 0.4;
}

void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float alpha = 0.0;
	for (int i = 0; i < 4; i++) {
		float n = float(i);
		float s = height(fract((u_time - n * 0.1) / 1.2));
		float h = max(0.8 * s - 0.14, 0.0);
		float x = (n - 1.5) * 0.48;
		alpha = max(alpha, fill(segment(p, vec2(x, -h), vec2(x, h)) - 0.14) * mix(0.6, 1.0, (s - 0.4) / 0.6));
	}
	gl_FragColor = vec4(u_accent.rgb, alpha * u_accent.a);
}
`;

const KIT = `#define PI 3.14159265
#define TAU 6.2831853
vec2 centered() { return (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y; }
float pixel() { return 2.0 / u_resolution.y; }
vec2 rotate(vec2 p, float a) { return vec2(cos(a) * p.x - sin(a) * p.y, sin(a) * p.x + cos(a) * p.y); }

float smin(float a, float b, float k) {
	float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
	return mix(b, a, h) - k * h * (1.0 - h);
}
`;

// One scene for every roller: ground, bumps, shadow, dust and squash. Only the body differs.
const roller = ({
	radius,
	squish,
	hop,
	bumps,
	body,
	wobble = '26.0',
	damping = '9.0',
}) => `${KIT}${FILL}float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec4 over(vec4 dst, vec4 src) {
	return vec4(src.rgb * src.a + dst.rgb * (1.0 - src.a), src.a + dst.a * (1.0 - src.a));
}

${body}

void main() {
	vec2 p = centered();
	float aspect = u_resolution.x / u_resolution.y;
	float period = 1.5;
	float speed = 2.6;
	float local = fract(u_time / period);
	float bumpy = ${bumps ? 'step(0.35, hash(vec2(floor(u_time / period), 4.0)))' : '1.0'};
	float radius = ${radius};
	float ground = -0.88;
	float air = clamp((local - 0.38) / 0.24, 0.0, 1.0);
	float lift = sin(air * PI) * ${hop} * bumpy;
	float since = (local - 0.62) * period;
	float landing = since > 0.0 ? bumpy * exp(-since * ${damping}) * cos(since * ${wobble}) : 0.0;
	float rising = bumpy * smoothstep(0.0, 0.15, air) * (1.0 - smoothstep(0.25, 0.5, air));
	float sy = 1.0 + ${squish} * (0.12 * rising - 0.22 * landing);
	float sx = 1.0 / sy;
	float cx = -(aspect - 1.0) * 0.5;
	float bumpX = ${bumps ? 'cx + (0.5 - local) * period * speed' : '100.0'};
	float groundY = ground + 0.2 * bumpy * smoothstep(0.4, 0.0, abs(p.x - bumpX));
	float edgeFade = 1.0 - smoothstep(aspect - 0.3, aspect, abs(p.x));
	float dash = step(fract((p.x + u_time * speed) * 1.5), 0.6);
	vec4 acc = vec4(u_color.rgb, fill(abs(p.y - groundY) - 0.035) * mix(0.35, 1.0, dash) * edgeFade * u_color.a);
	// The shadow shrinks and fades as the roller leaves the ground.
	vec2 s = (p - vec2(cx, ground)) / vec2(radius * (1.0 - 0.4 * lift), 0.07);
	acc = over(acc, vec4(u_color.rgb, fill((length(s) - 1.0) * 0.07) * 0.35 * (1.0 - lift) * u_color.a));
	if (bumpy > 0.5 && since > 0.0 && since < 0.5) {
		for (int i = 0; i < 6; i++) {
			float n = float(i);
			vec2 velocity = vec2(-0.6 - 1.4 * hash(vec2(n, 1.0)), 0.7 + 1.1 * hash(vec2(n, 2.0)));
			vec2 puff = vec2(cx, ground) + velocity * since + vec2(-speed * since, -2.4 * since * since);
			float size = 0.05 + 0.16 * since;
			acc = over(acc, vec4(u_color.rgb, fill(length(p - puff) - size) * (1.0 - since / 0.5) * u_color.a));
		}
	}
	vec2 q = (p - vec2(cx, ground + lift)) / vec2(sx, sy) - vec2(0.0, radius);
	vec4 b = body(q, radius, u_time * speed / radius);
	acc = over(acc, vec4(b.rgb, b.a * u_accent.a));
	gl_FragColor = vec4(acc.rgb / max(acc.a, 0.0001), acc.a);
}`;

const WHEEL = roller({
	radius: '0.66',
	squish: '0.3',
	hop: '0.5',
	bumps: true,
	body: `vec4 body(vec2 q, float r, float angle) {
	float d = length(q);
	float a = atan(q.x, q.y) - angle;
	float tire = fill(abs(d - (r - 0.1)) - 0.1);
	float neon = tire * step(fract(a * 6.0 / TAU), 0.4);
	float gap = abs(fract(a * 3.0 / TAU + 0.5) - 0.5) * TAU / 3.0;
	float spoke = fill(d * sin(gap) - 0.065) * step(d, r - 0.2);
	float hub = fill(d - 0.14);
	vec3 c = mix(u_accent.rgb * 0.55, mix(u_accent.rgb, vec3(1.0), 0.55), neon);
	c = mix(c, u_accent.rgb, max(spoke, hub) * (1.0 - tire));
	return vec4(c, max(max(tire, spoke), hub));
}`,
});

const BALL = roller({
	radius: '0.5',
	squish: '0.8',
	hop: '0.6',
	bumps: false,
	wobble: '12.0',
	damping: '14.0',
	body: `vec4 body(vec2 q, float r, float angle) {
	float light = 1.0 - smoothstep(0.0, r * 1.5, length(q - vec2(-0.35, 0.35) * r));
	vec3 c = mix(u_accent.rgb * 0.7, mix(u_accent.rgb, vec3(1.0), 0.3), light);
	c = mix(c, vec3(1.0), 0.85 * fill(length(q - vec2(-0.38, 0.42) * r) - 0.13 * r));
	return vec4(c, fill(length(q) - r));
}`,
});

const WATER = `${KIT}${FILL}float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

vec4 over(vec4 dst, vec4 src) {
	return vec4(src.rgb * src.a + dst.rgb * (1.0 - src.a), src.a + dst.a * (1.0 - src.a));
}

void main() {
	vec2 p = centered();
	float t = u_time * 1.6;
	float glass = 0.86;
	float inside = fill(length(p) - (glass - 0.12));
	float level = -0.08 + 0.12 * sin(t * 1.8);
	// The surface tips side to side as the water sloshes.
	float tilt = 0.28 * sin(t * 1.5) * p.x;
	// Two wave layers moving opposite ways read as sloshing water.
	float front = level + tilt + 0.1 * sin(p.x * 4.0 + t * 4.2) + 0.045 * sin(p.x * 9.0 - t * 5.3);
	float back = level - tilt * 0.6 + 0.09 * sin(p.x * 5.0 - t * 3.6 + 1.3) + 0.04 * sin(p.x * 11.0 + t * 4.7);
	vec3 light = mix(u_accent.rgb, vec3(1.0), 0.45);
	vec4 c = vec4(light, fill(p.y - back) * 0.5);
	c = over(c, vec4(mix(u_accent.rgb, u_accent.rgb * 0.65, smoothstep(level, -glass, p.y)), fill(p.y - front)));
	for (int i = 0; i < 4; i++) {
		float n = float(i);
		float rise = fract(t * (0.8 + 0.4 * hash(n)) + hash(n + 7.0));
		vec2 bubble = vec2((hash(n + 3.0) - 0.5) * 0.9 + 0.06 * sin(t * 7.0 + n), mix(-0.7, level, rise));
		c = over(c, vec4(vec3(1.0), (fill(length(p - bubble) - 0.05) * 0.7) * fill(p.y - front)));
	}
	c = over(c, vec4(vec3(1.0), fill(abs(p.y - front) - 0.018) * 0.6));
	c.a *= inside;
	c = over(c, vec4(u_accent.rgb, fill(abs(length(p) - glass) - 0.05)));
	gl_FragColor = vec4(c.rgb / max(c.a, 0.0001), c.a * u_accent.a);
}
`;

const DRIP = `${KIT}${FILL}vec4 over(vec4 dst, vec4 src) {
	return vec4(src.rgb * src.a + dst.rgb * (1.0 - src.a), src.a + dst.a * (1.0 - src.a));
}

void main() {
	vec2 p = centered();
	float period = 1.2;
	float pool = -0.6;
	vec2 e = (p - vec2(0.0, pool)) * vec2(1.0, 3.2);
	vec4 c = vec4(u_color.rgb, fill(abs(length(e) - 0.95) - 0.05) * 0.25 * u_color.a);
	// Three drops in flight at once: one forming, one falling, one rippling out.
	for (int i = 0; i < 3; i++) {
		float tau = mod(u_time, period) + float(i) * period;
		float form = clamp(tau / 0.4, 0.0, 1.0);
		float fall = clamp((tau - 0.4) / 0.4, 0.0, 1.0);
		if (tau < 0.8) {
			float y = mix(0.78, pool, fall * fall);
			float size = mix(0.04, 0.13, form);
			vec2 q = (p - vec2(0.0, y)) / vec2(1.0, 1.0 + 0.7 * fall * fall + 0.25 * form * (1.0 - fall));
			float drop = smin(length(q) - size, max(abs(q.x) - size * (0.25 - q.y) / 0.25, -q.y), 0.04);
			c = over(c, vec4(u_accent.rgb, fill(drop)));
		}
		float since = tau - 0.8;
		for (int k = 0; k < 2; k++) {
			float spread = (since - 0.3 * float(k)) / 1.6;
			if (spread > 0.0 && spread < 1.0) {
				float ring = fill(abs(length(e) - spread * 0.95) - 0.07) * (1.0 - spread);
				c = over(c, vec4(mix(u_accent.rgb, vec3(1.0), 0.3), ring));
			}
		}
		float u = since / 0.4;
		if (u > 0.0 && u < 1.0) {
			for (int k = 0; k < 3; k++) {
				vec2 splash = vec2((float(k) - 1.0) * 0.35 * u, pool + 0.9 * u - 1.4 * u * u);
				c = over(c, vec4(u_accent.rgb, fill(length(p - splash) - 0.06)));
			}
		}
	}
	gl_FragColor = vec4(c.rgb / max(c.a, 0.0001), c.a * u_accent.a);
}
`;

const FORMATION = `${KIT}${FILL}${EASE}// Resting spots: six points on a ring, never the center, all at full size.
vec2 spotAt(float i) {
	float a = radians(30.0 + 60.0 * i);
	return 0.6 * vec2(cos(a), sin(a));
}

// Where each ball rests at the start of a step: A, B, C. Turns go both ways.
vec3 slots(float k) {
	k = mod(k, 8.0);
	if (k < 0.5) return vec3(2.0, 0.0, 4.0);
	if (k < 1.5) return vec3(0.0, 2.0, 4.0);
	if (k < 2.5) return vec3(5.0, 3.0, 1.0);
	if (k < 3.5) return vec3(1.0, 5.0, 3.0);
	if (k < 4.5) return vec3(0.0, 4.0, 2.0);
	if (k < 5.5) return vec3(4.0, 2.0, 0.0);
	if (k < 6.5) return vec3(5.0, 3.0, 1.0);
	return vec3(3.0, 5.0, 1.0);
}

// How far each ball swings toward you (negative) or away while it moves.
vec3 swings(float k) {
	k = mod(k, 8.0);
	if (k < 0.5) return vec3(-0.8, 0.8, 0.0);
	if (k < 1.5) return vec3(-0.3, 0.3, 0.8);
	if (k < 2.5) return vec3(0.3, -0.5, 0.5);
	if (k < 3.5) return vec3(-0.3, 0.3, 0.0);
	if (k < 4.5) return vec3(0.5, -0.5, 0.3);
	if (k < 5.5) return vec3(0.2, -0.3, 0.3);
	if (k < 6.5) return vec3(0.8, -0.8, 0.0);
	return vec3(-0.3, 0.3, -0.6);
}

float pick(vec3 v, float b) { return b < 0.5 ? v.x : (b < 1.5 ? v.y : v.z); }

// On a turn every ball takes another's spot, so they move together around the ring.
bool rotates(float k) {
	k = mod(k, 8.0);
	return (k > 1.5 && k < 2.5) || (k > 3.5 && k < 4.5);
}

// Two balls trade places while the third stays put.
bool swaps(float k) {
	k = mod(k, 8.0);
	return k < 0.5 || (k > 5.5 && k < 6.5);
}

float chance(float k) { return fract(sin(k * 12.9898 + 4.1414) * 43758.5453); }

float direction(float k) { return mod(k, 8.0) < 2.5 ? 1.0 : -1.0; }

// Between 0.9 and 1.4 times around, so it stops anywhere on the ring.
float turns(float k) { return 0.9 + 0.5 * chance(k); }

// A second flip trades them back, which leaves the same spots filled as one flip.
float flips(float k) { return swaps(k) && chance(k + 0.5) < 0.35 ? 2.0 : 1.0; }

float slowness(float k) { return 1.0 + 0.7 * chance(k + 0.25); }

// The hold between a double flip's two halves.
float between(float k) { return flips(k) > 1.5 ? 0.2 + 0.35 * chance(k + 0.75) : 0.0; }

float hold(float k) {
	if (rotates(k)) return 0.0;
	return chance(k + 0.9) < 0.4 ? 0.15 + 0.4 * chance(k + 0.95) : 0.0;
}

float restAt(float k) {
	k = mod(k, 24.0);
	if (abs(k - 7.0) < 0.5 || abs(k - 15.0) < 0.5 || abs(k - 21.0) < 0.5) return 0.35;
	return 0.0;
}

const float FLIP = 0.9 * 0.91;
const float LAST = 92.0;

// A turn's speed, in turns a second, kept for a run of one to three turns.
float speedFor(float k) { return 0.55 + 0.7 * chance(k + 0.33); }
float runFor(float k) { return 1.0 + floor(chance(k + 0.66) * 3.0); }

float moveTime(float k, float q, float speed) {
	if (rotates(k)) return q / speed;
	return flips(k) * FLIP * slowness(k) + between(k) + hold(k);
}

void main() {
	vec2 p = centered();
	float aspect = u_resolution.x / u_resolution.y;
	float px = pixel();
	// The last turn ends the loop a whole third around, so the ring is where it started.
	float spun = 0.0;
	for (int n = 0; n < 96; n++) {
		float k = float(n);
		if (rotates(k) && k < LAST) spun += direction(k) * turns(k);
	}
	float left = mod(-(spun + direction(LAST) * turns(LAST)) * 3.0, 1.0) / 3.0;
	float last = turns(LAST) + direction(LAST) * left;
	if (last > 1.4) last -= 1.0 / 3.0;
	if (last < 0.9) last += 1.0 / 3.0;
	// 96 moves before it repeats, so the random turns and flips never settle into a beat.
	float loop = 0.0;
	float speed = 1.0;
	float run = 0.0;
	for (int n = 0; n < 96; n++) {
		float k = float(n);
		if (rotates(k) && run < 0.5) {
			speed = speedFor(k);
			run = runFor(k);
		}
		if (rotates(k)) run -= 1.0;
		loop += moveTime(k, k == LAST ? last : turns(k), speed) + restAt(k);
	}
	float t = mod(u_time * 1.3, loop);
	float k = 0.0;
	float start = 0.0;
	// How far the ring has turned before this move.
	float ring = 0.0;
	speed = 1.0;
	run = 0.0;
	for (int n = 0; n < 96; n++) {
		float m = float(n);
		if (rotates(m) && run < 0.5) {
			speed = speedFor(m);
			run = runFor(m);
		}
		if (rotates(m)) run -= 1.0;
		float q = m == LAST ? last : turns(m);
		float span = moveTime(m, q, speed) + restAt(m);
		if (t < start + span) break;
		start += span;
		if (rotates(m)) ring += direction(m) * q;
		k += 1.0;
	}
	float q = k == LAST ? last : turns(k);
	float local = t - start;
	float frame = radians(360.0 * ring);
	float nearest = 10.0;
	float cover = 0.0;
	vec3 balls[3];
	for (int i = 0; i < 3; i++) {
		float b = float(i);
		vec2 xy;
		float e;
		float side = 1.0;
		if (rotates(k)) {
			e = ease(local / (q / speed), vec4(0.45, 0.0, 0.55, 1.0));
			float a = radians(30.0 + 60.0 * pick(slots(k), b)) + frame + e * direction(k) * radians(360.0 * q);
			xy = 0.6 * vec2(cos(a), sin(a));
		} else {
			float slow = slowness(k);
			float flip = 0.0;
			float within = local;
			if (flips(k) > 1.5 && local > FLIP * slow) {
				flip = 1.0;
				within = local - FLIP * slow - between(k);
			}
			e = ease((max(within, 0.0) / slow / 0.9 - 0.08 * b) / 0.75, vec4(0.45, 0.0, 0.55, 1.0));
			vec2 from = rotate(spotAt(pick(slots(k), b)), frame);
			vec2 to = rotate(spotAt(pick(slots(k + 1.0), b)), frame);
			// Coming back, each ball passes on the other side, so the pair keeps circling.
			if (flip > 0.5) {
				vec2 was = from;
				from = to;
				to = was;
				side = -1.0;
			}
			// Paths curve; balls swapping places curve to opposite sides so neither hides the other.
			float swap = swaps(k) ? 0.3 : 0.1;
			vec2 dir = to - from;
			xy = mix(from, to, e) + swap * vec2(-dir.y, dir.x) * sin(3.14159265 * e);
		}
		xy.x *= 1.0 + (aspect - 1.0) * 0.6;
		float z = side * pick(swings(k), b) * sin(3.14159265 * e);
		balls[i] = vec3(xy, z);
		float r = 0.24 * 3.0 / (z + 3.0);
		float d = length(p - xy) - r;
		if (d < px && z < nearest) {
			nearest = z;
			cover = fill(d);
		}
	}
	// A gap around each nearer ball keeps overlapping balls apart.
	float gap = 1.0;
	for (int i = 0; i < 3; i++) {
		float r = 0.24 * 3.0 / (balls[i].z + 3.0);
		if (balls[i].z < nearest - 0.001 && length(p - balls[i].xy) < r + 1.5 * px) gap = 0.0;
	}
	gl_FragColor = vec4(u_accent.rgb, cover * gap * u_accent.a);
}
`;

const ORB = `${HUE}
vec2 blobCenter(float n, float t, float spread) {
	float s = 1.0 + 0.35 * n;
	return vec2(cos(t * s + n * 1.9) * spread, sin(t * s * 1.3 + n * 2.7) * 0.5);
}

float blobRadius(float n) { return 0.36 - 0.03 * n; }

float field(vec2 p, float t, float spread) {
	float f = 0.0;
	for (int i = 0; i < 4; i++) {
		float n = float(i);
		vec2 d = p - blobCenter(n, t, spread);
		f += blobRadius(n) * blobRadius(n) / (dot(d, d) + 0.0001);
	}
	return f;
}

// A lone blob gets a sphere's height; merged ones blend smoothly.
float height(float f) { return sqrt(max(1.0 - 1.0 / max(f, 0.0001), 0.0)); }

void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float aspect = u_resolution.x / u_resolution.y;
	float spread = 0.56 + (aspect - 1.0) * 0.8;
	float t = u_time * 1.6;
	float f = field(p, t, spread);
	float e = 0.02;
	float z = height(f);
	vec3 normal = normalize(vec3(
		z - height(field(p + vec2(e, 0.0), t, spread)),
		z - height(field(p + vec2(0.0, e), t, spread)),
		e
	));
	vec3 color = vec3(0.0);
	float total = 0.0;
	for (int i = 0; i < 4; i++) {
		float n = float(i);
		vec2 d = p - blobCenter(n, t, spread);
		float w = blobRadius(n) * blobRadius(n) / (dot(d, d) + 0.0001);
		color += hueShift(u_accent.rgb, -0.9 + 0.6 * n) * w;
		total += w;
	}
	color /= total;
	vec3 light = normalize(vec3(-0.5, 0.6, 0.8));
	float diffuse = max(dot(normal, light), 0.0);
	float shine = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
	float rim = pow(1.0 - normal.z, 2.0);
	vec3 lit = color * (0.35 + 0.75 * diffuse) + vec3(0.55 * shine) + color * rim * 0.3;
	gl_FragColor = vec4(lit, smoothstep(1.0, 1.0 + 6.0 * px, f) * u_accent.a);
}
`;

const SWIRL = `${NOISE}${HUE}
void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float t = u_time * 2.5;
	float angle = atan(p.y, p.x);
	float edge = 0.74 + 0.12 * sin(angle * 2.0 + t * 1.6) + 0.06 * sin(angle * 3.0 - t * 2.3);
	float inside = 1.0 - smoothstep(edge - px, edge + px, length(p));
	float n = noise(p * 1.4 + vec2(t * 0.9, -t * 0.6));
	vec3 color = mix(hueShift(u_accent.rgb, -1.1), hueShift(u_accent.rgb, 1.2), smoothstep(0.3, 0.7, n));
	gl_FragColor = vec4(color, inside * u_accent.a);
}
`;

const SCREENSAVER = `${HUE}
void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float aspect = u_resolution.x / u_resolution.y;
	vec2 size = vec2(0.42, 0.28);
	vec2 phase = u_time * vec2(0.45, 0.7);
	vec2 center = mix(-vec2(aspect, 1.0) + size, vec2(aspect, 1.0) - size, abs(fract(phase) * 2.0 - 1.0));
	float hits = floor(phase.x * 2.0) + floor(phase.y * 2.0);
	vec2 d = abs(p - center) - size + 0.12;
	float block = 1.0 - smoothstep(-px, px, length(max(d, 0.0)) - 0.12);
	gl_FragColor = vec4(hueShift(u_accent.rgb, hits * 1.3), block * u_accent.a);
}
`;

const STARFIELD = `${HASH}
void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float aspect = u_resolution.x / u_resolution.y;
	float alpha = 0.0;
	for (int i = 0; i < 24; i++) {
		float n = float(i);
		float angle = hash(vec2(n, 1.0)) * 6.2831853;
		float z = fract(hash(vec2(n, 2.0)) - u_time * 0.6);
		vec2 star = vec2(cos(angle) * aspect, sin(angle)) * 0.12 / max(z, 0.02);
		float size = 0.06 + 0.16 * (1.0 - z);
		float lit = 1.0 - smoothstep(size - px, size + px, length(p - star));
		alpha = max(alpha, lit * (0.25 + 0.75 * (1.0 - z)));
	}
	gl_FragColor = vec4(u_accent.rgb, alpha * u_accent.a);
}
`;

const CAROUSEL = `vec3 ballAt(float n, float aspect) {
	float a = u_time * 2.2 + n * 1.0471976;
	float bob = 0.14 * sin(u_time * 2.0 + n * 2.1);
	return vec3(cos(a) * 0.68 * aspect, -sin(a) * 0.25 + bob, sin(a) * 0.62);
}

void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float aspect = u_resolution.x / u_resolution.y;
	float radius = 0.26;
	float nearest = 10.0;
	float cover = 0.0;
	for (int i = 0; i < 6; i++) {
		vec3 ball = ballAt(float(i), aspect);
		float s = 2.0 / (ball.z + 2.6);
		float d = length(p - ball.xy * s);
		if (d < radius * s + px && ball.z < nearest) {
			nearest = ball.z;
			cover = 1.0 - smoothstep(radius * s - px * 0.6, radius * s + px * 0.6, d);
		}
	}
	float gap = 1.0;
	for (int i = 0; i < 6; i++) {
		vec3 ball = ballAt(float(i), aspect);
		float s = 2.0 / (ball.z + 2.6);
		if (ball.z < nearest - 0.001 && length(p - ball.xy * s) < radius * s + 1.5 * px) gap = 0.0;
	}
	gl_FragColor = vec4(u_accent.rgb, cover * gap * u_accent.a);
}
`;

const ORBIT = `void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float radius = 0.72;
	float width = 0.09;
	float angle = atan(p.y, p.x);
	float alpha = 0.0;
	for (int i = 0; i < 3; i++) {
		float n = float(i);
		float center = -u_time * (2.0 + 0.9 * n) - 0.7 * sin(u_time * (1.3 + 0.4 * n) + n * 2.1) + n * 2.0;
		float half_ = 0.45 + 0.2 * sin(u_time * 1.7 + n * 1.3);
		float offset = mod(angle - center + 3.14159265, 6.2831853) - 3.14159265;
		float end = center + sign(offset) * half_;
		float d = abs(offset) < half_ ? abs(length(p) - radius) : length(p - radius * vec2(cos(end), sin(end)));
		alpha = max(alpha, (1.0 - smoothstep(width - px, width + px, d)) * (1.0 - 0.25 * n));
	}
	gl_FragColor = vec4(u_accent.rgb, alpha * u_accent.a);
}
`;

const puzzle = (size, path, slide) => {
	const moves = path.length - 1;
	const steps = path
		.map(([x, y], j) =>
			j < moves
				? `\tif (j < ${j}.5) return vec2(${x}.0, ${y}.0);`
				: `\treturn vec2(${x}.0, ${y}.0);`,
		)
		.join('\n');
	return `${HUE}
vec2 emptyAt(float j) {
${steps}
}

// Out and back, so the picture comes together again.
vec2 pathAt(float j) { return emptyAt(j < ${moves}.5 ? j : ${moves * 2}.0 - j); }

// Walks the moves backward to find which piece of the picture a cell holds.
vec2 homeOf(vec2 cell, float moves) {
	vec2 tracked = cell;
	for (int i = ${moves * 2 - 1}; i >= 0; i--) {
		float j = float(i);
		if (j < moves && all(equal(tracked, pathAt(j)))) tracked = pathAt(j + 1.0);
	}
	return tracked;
}

bool inside(vec2 v) { return all(greaterThanEqual(v, vec2(0.0))) && all(lessThan(v, vec2(1.0))); }

void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float grid = ${size}.0;
	float tile = 1.8 / grid;
	vec2 g = (p + 0.9) / tile;
	vec2 cell = floor(g);
	float slide = ${slide};
	float moves = ${moves * 2}.0;
	float cycle = mod(u_time, moves * slide + 0.8);
	float k = min(floor(cycle / slide), moves);
	float f = smoothstep(0.0, 1.0, fract(cycle / slide));
	vec2 empty = pathAt(k);
	vec2 from = pathAt(k + 1.0);
	bool moving = k < moves;
	vec2 home = vec2(-1.0);
	vec2 local = fract(g);
	float alpha = 1.0;
	if (moving && inside(g - mix(from, empty, f))) {
		home = homeOf(from, k);
		local = g - mix(from, empty, f);
	} else if (inside(g / grid) && !all(equal(cell, empty)) && !(moving && all(equal(cell, from)))) {
		home = homeOf(cell, k);
	} else if (inside(g / grid) && !moving && all(equal(cell, empty))) {
		home = cell;
		alpha = smoothstep(0.0, 0.3, cycle - moves * slide);
	}
	if (home.x < 0.0) {
		gl_FragColor = vec4(0.0);
		return;
	}
	vec2 d = abs(local - 0.5) - vec2(0.3);
	float piece = 1.0 - smoothstep(-px / tile, px / tile, length(max(d, 0.0)) - 0.12);
	vec2 uv = (home + local) / grid;
	gl_FragColor = vec4(hueShift(u_accent.rgb, (uv.x - uv.y) * 1.4), piece * alpha * u_accent.a);
}
`;
};

const PUZZLE = puzzle(
	3,
	[
		[2, 0],
		[2, 1],
		[1, 1],
		[1, 2],
		[0, 2],
		[0, 1],
		[1, 1],
		[1, 0],
		[0, 0],
	],
	'0.22',
);

const PUZZLE_BIG = puzzle(
	4,
	[
		[3, 0],
		[3, 1],
		[2, 1],
		[2, 2],
		[1, 2],
		[1, 3],
		[0, 3],
		[0, 2],
		[0, 1],
		[1, 1],
		[1, 0],
		[2, 0],
		[3, 0],
	],
	'0.16',
);

const CRADLE = `float segment(vec2 p, vec2 a, vec2 b) {
	vec2 ap = p - a;
	vec2 ab = b - a;
	return length(ap - ab * clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0));
}

void main() {
	// Zoomed out so the end balls stay in frame at the top of their swing.
	float zoom = 0.76;
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y / zoom + vec2(0.0, 0.3);
	float px = 2.0 / u_resolution.y / zoom;
	float radius = 0.16;
	float length_ = 0.85;
	float swing = sin(u_time * 5.7);
	float lines = abs(p.y - 0.8) + step(0.9, abs(p.x)) * 10.0;
	float balls = 0.0;
	for (int i = 0; i < 5; i++) {
		float n = float(i);
		vec2 pivot = vec2((n - 2.0) * radius * 2.0, 0.8);
		// Only the end balls swing: the left one out on one beat, the right on the next.
		float angle = n < 0.5 ? -0.6 * max(swing, 0.0) : (n > 3.5 ? 0.6 * max(-swing, 0.0) : 0.0);
		vec2 ball = pivot + length_ * vec2(sin(angle), -cos(angle));
		lines = min(lines, segment(p, pivot, ball));
		balls = max(balls, 1.0 - smoothstep(radius - px, radius + px, length(p - ball)));
	}
	vec4 color = vec4(u_color.rgb, (1.0 - smoothstep(0.015, 0.015 + px, lines)) * u_color.a);
	gl_FragColor = mix(color, u_accent, balls);
}
`;

const FACE = `${PIXELS}
float headAt(vec2 c) {
	if (c.x < 1.0 || c.x > 10.0 || c.y < 1.0 || c.y > 12.0) return 0.0;
	return (c.x < 1.5 || c.x > 9.5) && (c.y < 1.5 || c.y > 11.5) ? 0.0 : 1.0;
}

bool within(float v, float low, float high) { return v > low - 0.5 && v < high + 0.5; }

void main() {
	float g = 16.0;
	vec2 cell = pixelCell(g);
	float cols = floor(g * u_resolution.x / u_resolution.y);
	float t = mod(u_time, 4.0);
	float look = t > 0.9 && t < 1.5 ? -1.0 : (t > 1.9 && t < 2.5 ? 1.0 : 0.0);
	bool blink = t > 2.5 && t < 2.62;
	bool grin = t > 3.3 && t < 3.9;
	// The head turns a pixel toward where the eyes look.
	vec2 c = cell - vec2(floor(cols * 0.5) - 6.0 + look, 1.0);
	vec3 skin = mix(u_accent.rgb, vec3(1.0), 0.8);
	vec3 dark = u_accent.rgb * 0.35;
	if (headAt(c) < 0.5) {
		float edge = max(
			max(headAt(c + vec2(1.0, 0.0)), headAt(c - vec2(1.0, 0.0))),
			max(headAt(c + vec2(0.0, 1.0)), headAt(c - vec2(0.0, 1.0)))
		);
		gl_FragColor = vec4(dark, edge * u_accent.a);
		return;
	}
	vec3 color = skin;
	bool eyeCol = within(c.x, 2.0, 4.0) || within(c.x, 7.0, 9.0);
	if (c.y > 9.5 && !(c.y < 10.5 && mod(c.x, 2.0) < 0.5)) color = u_accent.rgb;
	if (within(c.y, 8.0, 8.0) && eyeCol) color = dark;
	if (within(c.y, 5.0, 6.0) && eyeCol) {
		float middle = c.x < 5.0 ? 3.0 : 8.0;
		color = abs(c.x - middle - look) < 0.5 ? dark : vec3(1.0);
		if (blink) color = c.y < 5.5 ? dark : skin;
	}
	if (within(c.y, 4.0, 4.0) && within(c.x, 5.0, 6.0)) color = mix(skin, dark, 0.4);
	if (grin) {
		if (within(c.y, 2.0, 2.0) && within(c.x, 3.0, 8.0)) color = within(c.x, 4.0, 7.0) ? vec3(1.0) : dark;
		if (within(c.y, 1.0, 1.0) && within(c.x, 4.0, 7.0)) color = dark;
		if (within(c.y, 3.0, 3.0) && (within(c.x, 3.0, 3.0) || within(c.x, 8.0, 8.0))) color = dark;
	} else if (within(c.y, 2.0, 2.0) && within(c.x, 4.0, 7.0)) {
		color = dark;
	}
	gl_FragColor = vec4(color, u_accent.a);
}
`;

const BOUNCE = `void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float aspect = u_resolution.x / u_resolution.y;
	float radius = 0.24;
	float alpha = 0.0;
	for (int i = 0; i < 3; i++) {
		float n = float(i);
		float hop = abs(sin(u_time * 1.8 - n * 0.7));
		vec2 center = vec2((n - 1.0) * 0.62 * aspect, -0.95 + radius + hop * 1.42);
		float squash = smoothstep(0.3, 0.0, hop);
		vec2 q = (p - center) / vec2(1.0 + 0.3 * squash, 1.0 - 0.25 * squash);
		float ball = 1.0 - smoothstep(radius - px, radius + px, length(q));
		alpha = max(alpha, ball);
	}
	gl_FragColor = vec4(u_accent.rgb, alpha * u_accent.a);
}
`;

const METABALLS = `void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float aspect = u_resolution.x / u_resolution.y;
	float t = u_time * 0.8;
	float field = 0.0;
	for (int i = 0; i < 4; i++) {
		float n = float(i);
		vec2 center = vec2(
			sin(t * (1.0 + 0.3 * n) + n * 1.7) * (aspect - 0.45),
			cos(t * (0.8 + 0.25 * n) + n * 2.3) * 0.5
		);
		vec2 d = p - center;
		field += 0.06 / (dot(d, d) + 0.0001);
	}
	float inside = smoothstep(0.75, 1.25, field);
	gl_FragColor = vec4(u_accent.rgb, inside * u_accent.a);
}
`;

const TUNNEL = `void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float r = max(length(p), 0.001);
	// Rings a fixed ratio apart, so moving out reads as flying down a tunnel.
	float k = 1.8;
	float band = abs(fract(log(r) * k - u_time * 0.6) - 0.5);
	float aa = 0.5 * px * k / r;
	float ring = 1.0 - smoothstep(0.1 - aa, 0.1 + aa, band);
	float fade = smoothstep(0.1, 0.35, r) * (1.0 - smoothstep(0.6, 0.85, r));
	vec4 tint = mix(u_accent, u_color, smoothstep(0.3, 0.9, r));
	gl_FragColor = vec4(tint.rgb, ring * fade * tint.a);
}
`;

const RING = `void main() {
	vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
	float px = 2.0 / u_resolution.y;
	float band = 1.0 - smoothstep(0.125 - px * 0.5, 0.125 + px * 0.5, abs(length(p) - 0.875));
	float turn = fract((atan(p.y, p.x) + u_time * 6.2831853) / 6.2831853);
	float arc = step(turn, 0.25);
	gl_FragColor = vec4(u_color.rgb, band * u_color.a * mix(0.3, 1.0, arc));
}
`;

export const SPINNERS = {
	room: { label: '3D balls', fragment: FORMATION },
	orb: { label: 'Orb', fragment: ORB },
	swirl: { label: 'Swirl', fragment: SWIRL },
	screensaver: { label: 'Screensaver', fragment: SCREENSAVER },
	wheel: { label: 'Wheel', fragment: WHEEL },
	ball: { label: 'Bouncy ball', fragment: BALL },
	water: { label: 'Water', fragment: WATER },
	drip: { label: 'Drip', fragment: DRIP },
	starfield: { label: 'Starfield', fragment: STARFIELD },
	bounce: { label: 'Bouncing balls', fragment: BOUNCE },
	carousel: { label: 'Carousel', fragment: CAROUSEL },
	orbit: { label: 'Orbit', fragment: ORBIT },
	puzzle: { label: 'Sliding puzzle', fragment: PUZZLE },
	puzzleBig: { label: 'Sliding puzzle 2', fragment: PUZZLE_BIG },
	cradle: { label: "Newton's cradle", fragment: CRADLE },
	face: { label: 'Face', fragment: FACE },
	metaballs: { label: 'Metaballs', fragment: METABALLS },
	tunnel: { label: 'Tunnel rings', fragment: TUNNEL },
	ring: { label: 'Ring', fragment: RING },
	arc: { label: 'Arc', fragment: MATERIAL_ARC },
	elastic: { label: 'Elastic ring', fragment: ELASTIC },
	spokes: { label: 'Spokes', fragment: SPOKES },
	dots: { label: 'Typing dots', fragment: DOTS },
	bars: { label: 'Bars', fragment: BARS },
};

export const ACTIVE_SPINNER = 'room';

// An unknown name falls back to the shipped spinner, or an old config draws nothing.
export const spinnerFor = (name) => SPINNERS[name] ?? SPINNERS[ACTIVE_SPINNER];
