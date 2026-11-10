import { BLOCK, BLOCK_TYPE } from '@agentx/lib/block-box';
import { pageOrder } from '@agentx/lib/outline';
import { presetsOf } from '@agentx/lib/presets';

const hexOf = (css = '') => {
	const value = css.trim();
	if (/^#[0-9a-f]{6}$/i.test(value)) return value.toUpperCase();
	const [r, g, b, alpha = 1] = (value.match(/[\d.]+/g) ?? []).map(Number);
	if (!value.startsWith('rgb') || [r, g, b].some(Number.isNaN) || alpha === 0) {
		return null;
	}
	return `#${[r, g, b]
		.map((n) => Math.round(n).toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase()}`;
};

const MOST_PARTS = 250;
const PART_TEXT = 40;

// A class names the theme color it was set to, which a hex two colors share can't.
const slugOf = (element, kind, palette, hex) => {
	const suffix = kind === 'fill' ? '-background-color' : '-color';
	const named = palette.find(({ slug }) =>
		element.classList.contains(`has-${slug}${suffix}`),
	);
	return (named ?? palette.find((color) => color.hex === hex))?.slug;
};

// Each block drawn in a theme color, with the one it fills with and the one it writes in, so a
// change can follow what the parts the user named actually use.
const partsOf = (doc, palette) => {
	const view = doc.defaultView;
	const slug = (element, kind, property) => {
		const hex = hexOf(view.getComputedStyle(element)[property]);
		return hex ? slugOf(element, kind, palette, hex) : undefined;
	};
	return [...doc.querySelectorAll(`[${BLOCK}]`)]
		.flatMap((element) => {
			const type = element.getAttribute(BLOCK_TYPE);
			const drawn =
				type === 'core/button'
					? (element.querySelector('a, button') ?? element)
					: element;
			const fill = slug(drawn, 'fill', 'backgroundColor');
			const ink = slug(drawn, 'ink', 'color');
			// A link of its own, like a phone number in a line of text, not one in an inner block.
			const anchor = [...drawn.querySelectorAll('a')].find(
				(each) => each.closest(`[${BLOCK}]`) === element,
			);
			const link = anchor ? slug(anchor, 'ink', 'color') : undefined;
			if (!fill && !ink && !link) return [];
			return [
				{
					id: element.getAttribute(BLOCK),
					type,
					text: (drawn.textContent ?? '')
						.replace(/\s+/g, ' ')
						.trim()
						.slice(0, PART_TEXT),
					where: element.closest('header')
						? 'header'
						: element.closest('footer')
							? 'footer'
							: 'page',
					...(fill && { fill }),
					...(ink && { ink }),
					...(link && link !== ink && { link }),
				},
			];
		})
		.slice(0, MOST_PARTS);
};

// The theme's colors by name and what each section shows, so the agent names only colors the site has.
export const siteColors = (doc, { parts } = {}) => {
	const presets = presetsOf().colors ?? [];
	const colors = presets.flatMap(({ name, value, computed, custom }) => {
		const hex = hexOf(computed) ?? hexOf(value);
		return hex ? [{ name, value: hex, ...(custom && { tint: true }) }] : [];
	});
	const nameOf = (hex) => colors.find(({ value }) => value === hex)?.name;
	const shown = (element, property) => {
		const hex = hexOf(doc.defaultView.getComputedStyle(element)[property]);
		if (!hex) return {};
		const name = nameOf(hex);
		return { [property]: name ? `${name} ${hex}` : hex };
	};
	const sections = doc
		? pageOrder(doc).flatMap(({ id, text }) => {
				const element = doc.querySelector(`[${BLOCK}="${id}"]`);
				return element
					? [
							{
								section: text,
								...shown(element, 'backgroundColor'),
								...shown(element, 'color'),
							},
						]
					: [];
			})
		: [];
	if (!parts || !doc) return { colors, sections };
	const palette = presets.flatMap(({ slug, value, computed }) => {
		const hex = hexOf(computed) ?? hexOf(value);
		return hex ? [{ slug, hex }] : [];
	});
	return { colors, sections, parts: partsOf(doc, palette) };
};
