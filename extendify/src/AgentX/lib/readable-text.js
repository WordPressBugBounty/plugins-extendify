import { textOptions } from '@agentx/lib/adjust-colors';

// WCAG's floors: body text needs 4.5:1 against its background, large text like a heading 3:1.
const TEXT = 4.5;
const LARGE = 3;
const HEADING = 'h1, h2, h3, h4, h5, h6';
// A button draws its own background; an FAQ question's toggle is a button that doesn't.
const BUTTON = '.wp-element-button, .wp-block-button';
// Below this a button's fill reads as the section's own color, so only its words show.
const SHAPE = 1.5;
const WHITE = [255, 255, 255];

const computed = (el) => el.ownerDocument.defaultView.getComputedStyle(el);

const hex = (css) => {
	const digits = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css.trim())?.[1];
	if (!digits) return null;
	const full =
		digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits;
	return [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16));
};

// Computed colors come as rgb(), except ones like color-mix() that a canvas turns into rgb.
export const rgbOf = (css, doc = document) => {
	if (!css) return null;
	const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(css);
	if (rgb) return rgb.slice(1, 4).map(Number);
	const fromHex = hex(css);
	if (fromHex) return fromHex;
	const canvas = doc.createElement('canvas');
	const paint = canvas.getContext?.('2d');
	if (!paint) return null;
	canvas.width = 1;
	canvas.height = 1;
	paint.fillStyle = css;
	paint.fillRect(0, 0, 1, 1);
	return [...paint.getImageData(0, 0, 1, 1).data.slice(0, 3)];
};

const hexOf = (rgb) =>
	`#${rgb.map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`;

const transparent = (css) =>
	!css || css === 'transparent' || /^rgba\(.*,\s*0\)$/.test(css);

const luminance = ([r, g, b]) => {
	const [lr, lg, lb] = [r, g, b].map((value) => {
		const c = value / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

export const contrast = (a, b) => {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
};

// A section with no color of its own shows what's around it; words over a picture can't be judged.
const behindOf = (section, styleOf) => {
	const own = styleOf(section);
	if (own.backgroundImage && own.backgroundImage !== 'none') return null;
	for (let up = section; up?.nodeType === 1; up = up.parentElement) {
		const color = styleOf(up).backgroundColor;
		if (!transparent(color)) return rgbOf(color, section.ownerDocument);
	}
	return WHITE;
};

const onSection = (el, section, styleOf) => {
	for (let up = el; up && up !== section; up = up.parentElement) {
		const style = styleOf(up);
		if (!transparent(style.backgroundColor) || style.backgroundImage !== 'none')
			return false;
	}
	return true;
};

// The elements holding words that sit on the section's own background, not a card or button inside it.
const wordsOn = (section, styleOf) => {
	const doc = section.ownerDocument;
	const walker = doc.createTreeWalker(section, 4);
	const found = new Set();
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const el = node.parentElement;
		if (!node.textContent.trim() || !el || found.has(el)) continue;
		if (el.closest(BUTTON)) continue;
		if (onSection(el, section, styleOf)) found.add(el);
	}
	return [...found];
};

// A block from another source, like a synced pattern, can't be changed through the section.
const pathIn = (section, block) => {
	if (block === section) return '';
	const id = block.dataset.extendifyBlock ?? '';
	const prefix = `${section.dataset.extendifyBlock}.`;
	return id.startsWith(prefix) ? id.slice(prefix.length) : null;
};

export const targetsOf = (section, at, setting) => {
	const block =
		at === ''
			? section
			: section.querySelector(
					`[data-extendify-block="${section.dataset.extendifyBlock}.${at}"]`,
				);
	if (!block) return [];
	if (setting === 'heading_color') {
		return [...block.querySelectorAll(HEADING)].filter(
			(el) => !el.classList.contains('has-text-color'),
		);
	}
	if (setting === 'link_color') {
		return [...block.querySelectorAll('a')].filter(
			(el) => !el.closest(BUTTON) && !el.classList.contains('has-text-color'),
		);
	}
	return block.dataset.extendifyBlockType === 'core/button'
		? [block.querySelector(BUTTON) ?? block]
		: [block];
};

const ranked = (colors, behind) =>
	[...colors].sort((a, b) => contrast(b.rgb, behind) - contrast(a.rgb, behind));

// A button filled with the section's color gets the best-reading fill, and an outline one, its words.
const buttonFixes = (section, colors, behind, styleOf) => {
	const doc = section.ownerDocument;
	const [best] = ranked(colors, behind);
	return [
		...section.querySelectorAll('[data-extendify-block-type="core/button"]'),
	].flatMap((block) => {
		const link = block.querySelector(BUTTON);
		const at = pathIn(section, block);
		if (
			!link ||
			at === null ||
			!onSection(link.parentElement, section, styleOf)
		)
			return [];
		const style = styleOf(link);
		const ink = rgbOf(style.color, doc);
		if (style.backgroundImage !== 'none' || !ink) return [];
		if (transparent(style.backgroundColor)) {
			const hard =
				contrast(ink, behind) < TEXT &&
				contrast(best.rgb, behind) > contrast(ink, behind);
			return hard
				? [
						{
							at,
							styles: { text_color: best.slug },
							shown: { text_color: hexOf(ink) },
						},
					]
				: [];
		}
		const fill = rgbOf(style.backgroundColor, doc);
		const edge = rgbOf(style.borderTopColor, doc);
		const outlined =
			Number.parseFloat(style.borderTopWidth) > 0 &&
			edge &&
			contrast(edge, behind) >= SHAPE;
		if (!fill || outlined || contrast(fill, behind) >= SHAPE) return [];
		const words =
			contrast(ink, best.rgb) < TEXT ? ranked(colors, best.rgb)[0].slug : null;
		return [
			{
				at,
				styles: {
					background_color: best.slug,
					...(words && { text_color: words }),
				},
				shown: {
					background_color: hexOf(fill),
					...(words && { text_color: hexOf(ink) }),
				},
			},
		];
	});
};

const propertyOf = (setting) =>
	setting === 'background_color' ? 'background-color' : 'color';

// Null when the words already read; each change keeps the color shown before it, for putting back.
export const readableFix = (section, palette, styleOf = computed) => {
	const doc = section.ownerDocument;
	const behind = behindOf(section, styleOf);
	if (!behind) return null;
	const [ink] = textOptions(palette, hexOf(behind));
	const colors = palette
		.map((color) => ({ ...color, rgb: rgbOf(color.value, doc) }))
		.filter(({ rgb }) => rgb);
	if (!ink || !colors.length) return null;
	const shownOf = (el) => hexOf(rgbOf(styleOf(el).color, doc));
	const hard = wordsOn(section, styleOf).filter((el) => {
		const words = rgbOf(styleOf(el).color, doc);
		const floor = el.closest(HEADING) ? LARGE : TEXT;
		return words && contrast(words, behind) < floor;
	});
	// A color set on the section reaches the headings and words in its cards too.
	const fixes = new Map();
	for (const el of hard) {
		const link = el.closest('a');
		const at = pathIn(section, (link ?? el).closest('[data-extendify-block]'));
		if (!at) continue;
		const setting = link ? 'link_color' : 'text_color';
		const fix = fixes.get(at) ?? { at, styles: {}, shown: {} };
		if (setting in fix.styles) continue;
		fix.styles[setting] = ink.slug;
		fix.shown[setting] = shownOf(el);
		fixes.set(at, fix);
	}
	const changes = [
		...fixes.values(),
		...buttonFixes(section, colors, behind, styleOf),
	];
	if (!changes.length) return null;
	const hexFor = (slug) =>
		[ink, ...palette].find((color) => color.slug === slug)?.value ?? slug;
	return {
		ink,
		changes,
		paints: changes.flatMap(({ at, styles }) =>
			Object.entries(styles).flatMap(([setting, slug]) =>
				targetsOf(section, at, setting).map((el) => ({
					el,
					property: propertyOf(setting),
					value: hexFor(slug),
				})),
			),
		),
	};
};

export const beforePaints = (section, entries) =>
	entries.flatMap(({ at, setting, shown }) =>
		shown
			? targetsOf(section, at, setting).map((el) => ({
					el,
					property: propertyOf(setting),
					value: shown,
				}))
			: [],
	);

// The returned function puts the page's own colors back.
export const paint = (paints) => {
	const was = paints.map(({ el, property }) => [
		el,
		property,
		el.style.getPropertyValue(property),
		el.style.getPropertyPriority(property),
	]);
	for (const { el, property, value } of paints) {
		el.style.setProperty(property, value, 'important');
	}
	return () => {
		for (const [el, property, value, priority] of was.reverse()) {
			if (value) el.style.setProperty(property, value, priority);
			else el.style.removeProperty(property);
		}
	};
};

// Set by the page on a section a Quick Edit fix changed: each color it replaced, for putting back.
export const keptColorsOf = (section) => {
	try {
		const kept = JSON.parse(section.dataset.extendifyReadable ?? 'null');
		return Array.isArray(kept?.entries) ? kept.entries : [];
	} catch {
		return [];
	}
};
