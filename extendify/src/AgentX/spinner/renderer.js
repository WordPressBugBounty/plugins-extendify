import {
	ACTIVE_SPINNER,
	SPINNER_HEAD,
	SPINNERS,
} from '@agentx/spinner/shaders';

const VERTEX =
	'attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }';
const HEAD_LINES = SPINNER_HEAD.split('\n').length - 1;

// One context draws every spinner: a page gets about 16 before the browser drops the oldest.
let gl;
let vertex;
let current;
let requested;
let error = null;
let frame = null;
let still = false;
const targets = new Map();
const colors = new Map();

// A canvas turns any CSS color, like rgb(0 0 0 / 0.6), into #rrggbb or rgba().
const rgba = (value) => {
	if (colors.has(value)) return colors.get(value);
	const context = document.createElement('canvas').getContext('2d');
	context.fillStyle = value || 'transparent';
	const normalized = context.fillStyle;
	const parts = normalized.startsWith('#')
		? [1, 3, 5].map((at) => Number.parseInt(normalized.slice(at, at + 2), 16))
		: normalized.match(/[\d.]+/g).map(Number);
	// color(srgb …), which a color-mix() token gives, has channels from 0 to 1.
	const scale = normalized.startsWith('color(') ? 1 : 255;
	const [red, green, blue, alpha = 1] = parts;
	colors.set(value, [red / scale, green / scale, blue / scale, alpha]);
	return colors.get(value);
};

const build = (fragment) => {
	const shader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(shader, SPINNER_HEAD + fragment);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader).trim();
		gl.deleteShader(shader);
		return {
			error: log.replace(
				/\b0:(\d+):/g,
				(_, line) => `line ${line - HEAD_LINES}:`,
			),
		};
	}
	const program = gl.createProgram();
	gl.attachShader(program, vertex);
	gl.attachShader(program, shader);
	gl.bindAttribLocation(program, 0, 'position');
	gl.linkProgram(program);
	gl.deleteShader(shader);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		return { error: gl.getProgramInfoLog(program).trim() };
	}
	const uniform = (name) => gl.getUniformLocation(program, name);
	return {
		program,
		time: uniform('u_time'),
		resolution: uniform('u_resolution'),
		color: uniform('u_color'),
		accent: uniform('u_accent'),
	};
};

const draw = (now) => {
	frame = null;
	if (!gl || !targets.size) return;
	const ratio = window.devicePixelRatio || 1;
	for (const canvas of targets.keys()) {
		const width = Math.round(canvas.clientWidth * ratio) || 32;
		const height = Math.round(canvas.clientHeight * ratio) || 32;
		if (canvas.width !== width) canvas.width = width;
		if (canvas.height !== height) canvas.height = height;
	}
	// Drawn at the largest size and scaled down, so the design tool's big preview stays sharp.
	const largest = [...targets.keys()].reduce((a, b) =>
		b.width > a.width ? b : a,
	);
	const { width, height } = largest;
	if (gl.canvas.width !== width || gl.canvas.height !== height) {
		gl.canvas.width = width;
		gl.canvas.height = height;
		gl.viewport(0, 0, width, height);
	}
	const style = getComputedStyle(largest);
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
	gl.useProgram(current.program);
	gl.uniform1f(current.time, still ? 1.5 : now / 1000);
	gl.uniform2f(current.resolution, width, height);
	gl.uniform4fv(
		current.color,
		rgba(style.getPropertyValue('--color-agentx-spinner').trim()),
	);
	gl.uniform4fv(
		current.accent,
		rgba(style.getPropertyValue('--color-agentx-spinner-accent').trim()),
	);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, 3);
	for (const [canvas, { context }] of targets) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(gl.canvas, 0, 0, canvas.width, canvas.height);
	}
	if (!still) schedule();
};

const schedule = () => {
	if (frame === null) frame = window.requestAnimationFrame(draw);
};

const setup = () => {
	if (gl !== undefined) return gl;
	const canvas = document.createElement('canvas');
	gl =
		canvas.getContext('webgl', {
			premultipliedAlpha: false,
			antialias: false,
		}) ?? false;
	if (!gl) return gl;
	vertex = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertex, VERTEX);
	gl.compileShader(vertex);
	current = build(SPINNERS[ACTIVE_SPINNER].fragment);
	if (current.error) {
		gl = false;
		return gl;
	}
	requested = SPINNERS[ACTIVE_SPINNER].fragment;
	// One triangle past the corners covers the whole canvas.
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		gl.STATIC_DRAW,
	);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);
	still = Boolean(
		window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
	);
	canvas.addEventListener('webglcontextlost', () => {
		gl = false;
		for (const { onLost } of targets.values()) onLost();
		targets.clear();
	});
	return gl;
};

// A shader that won't compile keeps the last one that did, and returns its error.
export const setSpinnerShader = (fragment) => {
	if (!setup()) return null;
	if (fragment === requested) return error;
	requested = fragment;
	const built = build(fragment);
	error = built.error ?? null;
	if (error) return error;
	gl.deleteProgram(current.program);
	current = built;
	schedule();
	return null;
};

// Returns nothing without WebGL, so the caller draws the CSS ring instead.
export const drawSpinner = (canvas, onLost) => {
	if (!setup()) return;
	targets.set(canvas, { context: canvas.getContext('2d'), onLost });
	schedule();
	return () => targets.delete(canvas);
};
