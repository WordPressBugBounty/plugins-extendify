import {
	createShaderCanvas,
	DEFAULT_SHADER,
} from '@auto-launch/functions/shader-canvas';
import { derivedShaderColors } from '@auto-launch/functions/shader-colors';
import { useEffect, useRef } from '@wordpress/element';
import { colord } from 'colord';
import { useReducedMotion } from 'motion/react';

// A token may be color-mix() or oklch(), so each color is read back as painted.
const paintedRgb = (node, color) => {
	const probe = node.ownerDocument.createElement('span');
	probe.style.color = color;
	node.parentNode.append(probe);
	const css = node.ownerDocument.defaultView.getComputedStyle(probe).color;
	probe.remove();
	const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(css);
	if (srgb) return srgb.slice(1, 4).map(Number);
	const { r, g, b } = colord(css).toRgb();
	return [r / 255, g / 255, b / 255];
};

const hexOf = ([r, g, b]) =>
	colord({ r: r * 255, g: g * 255, b: b * 255 }).toHex();

const numberOf = (style, name, fallback) => {
	const value = Number.parseFloat(style.getPropertyValue(name));
	return Number.isNaN(value) ? fallback : value;
};

// Read once, as Launch's background does; the Designer remounts it when the design changes.
const valuesOf = (node) => {
	const style = node.ownerDocument.defaultView.getComputedStyle(node);
	const derived = derivedShaderColors(
		hexOf(paintedRgb(node, 'var(--color-agentx-surface)')),
		hexOf(paintedRgb(node, 'var(--color-agentx-accent)')),
	);
	return {
		speed: numberOf(style, '--agentx-bg-speed', 1),
		scale: numberOf(style, '--agentx-bg-scale', 1),
		intensity: numberOf(style, '--agentx-bg-intensity', 1),
		offset: [
			numberOf(style, '--agentx-bg-offset-x', 0),
			numberOf(style, '--agentx-bg-offset-y', 0),
		],
		colors: [1, 2, 3].map((slot) => {
			const set = style.getPropertyValue(`--agentx-bg-color-${slot}`).trim();
			return paintedRgb(node, set && set !== 'auto' ? set : derived[slot - 1]);
		}),
	};
};

export const Backdrop = ({ source }) => {
	const ref = useRef(null);
	const reduceMotion = useReducedMotion();

	useEffect(() => {
		const node = ref.current;
		const engine = node && createShaderCanvas(node);
		if (!engine) return;
		if (!engine.setSource(source)) engine.setSource(DEFAULT_SHADER);
		engine.setValues(valuesOf(node));
		engine.setStill(Boolean(reduceMotion));
		return () => engine.destroy();
	}, [source, reduceMotion]);

	return (
		<canvas
			ref={ref}
			data-agentx-backdrop=""
			className="pointer-events-none absolute inset-0 -z-10 size-full"
		/>
	);
};
