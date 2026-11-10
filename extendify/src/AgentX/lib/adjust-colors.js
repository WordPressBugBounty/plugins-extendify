import { __, sprintf } from '@wordpress/i18n';
import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import labPlugin from 'colord/plugins/lab';

extend([a11yPlugin, labPlugin]);

// WCAG AA for body text.
export const READABLE = 4.5;
const MOST_FILLS = 10;
const MOST_TEXT = 6;
// Fewer readable theme colors than this, and shades of the others fill in.
const FEWEST_TEXT = 4;
// A dark palette's card tints are near copies of one color.
const APART = 0.08;

const hexOf = (value) => {
	const color = colord(value ?? '');
	return color.isValid() && color.alpha() > 0 ? color.toHex() : null;
};

export const paletteOf = (colors = []) =>
	colors.flatMap(({ slug, name, value, computed }) => {
		const hex = hexOf(computed || value);
		return hex ? [{ slug, name: name || slug, value: hex }] : [];
	});

export const reads = (ink, behind) => colord(ink).contrast(behind) >= READABLE;

const apart = (options, gap) =>
	options.filter((option, at) =>
		options
			.slice(0, at)
			.every((kept) => colord(kept.value).delta(option.value) > gap),
	);

export const fillOptions = (palette) =>
	apart(palette, 0.02).slice(0, MOST_FILLS);

const fitted = (hex, behind) => {
	const lighter = colord(behind).isDark();
	let color = colord(hex);
	for (let i = 0; i < 25 && color.contrast(behind) < READABLE; i++) {
		color = lighter ? color.lighten(0.04) : color.darken(0.04);
	}
	return color.contrast(behind) >= READABLE ? color.toHex() : null;
};

// New colors join the theme's palette under these names once picked.
const fillIns = (palette, behind) => {
	const lighter = colord(behind).isDark();
	const shades = palette
		.filter(({ value }) => !reads(value, behind))
		.flatMap(({ name, value }) => {
			const hex = fitted(value, behind);
			return hex
				? [
						{
							slug: hex,
							name: sprintf(
								lighter
									? // translators: %s is the name of one of the site's theme colors, like Primary. Names a lighter shade of it the AI Agent offers as a text color; it joins the site's colors if picked.
										__('Lighter %s', 'extendify-local')
									: // translators: %s is the name of one of the site's theme colors, like Primary. Names a darker shade of it the AI Agent offers as a text color; it joins the site's colors if picked.
										__('Darker %s', 'extendify-local'),
								name,
							),
							value: hex,
							added: true,
						},
					]
				: [];
		});
	const plain = [
		// translators: Name of the color white, offered by the AI Agent as a text color; it joins the site's colors if picked.
		{ slug: '#ffffff', name: __('White', 'extendify-local'), value: '#ffffff' },
		// translators: Name of the color black, offered by the AI Agent as a text color; it joins the site's colors if picked.
		{ slug: '#000000', name: __('Black', 'extendify-local'), value: '#000000' },
	]
		.filter(({ value }) => reads(value, behind))
		.map((option) => ({ ...option, added: true }));
	return [...shades, ...plain];
};

// The theme's colors that read on the fill, best first, with shades of the rest when too few do.
export const textOptions = (palette, behind) => {
	const themed = apart(
		palette
			.filter(({ value }) => reads(value, behind))
			.sort(
				(a, b) =>
					colord(b.value).contrast(behind) - colord(a.value).contrast(behind),
			),
		APART,
	);
	const filled =
		themed.length >= FEWEST_TEXT
			? themed
			: apart([...themed, ...fillIns(palette, behind)], APART);
	return filled.slice(0, MOST_TEXT);
};

// A color of the user's own, named for the theme's colors by its hex.
export const customOption = (value) => {
	const hex = colord(value).toHex();
	return {
		slug: hex,
		name: sprintf(
			// translators: %s is a color as a hex code, like #1E3A8A. Names a color the user picked on the AI Agent's color card, which joins the site's colors.
			__('Custom %s', 'extendify-local'),
			hex.toUpperCase(),
		),
		value: hex,
		added: true,
		custom: true,
	};
};

export const sameColor = (a, b) => Boolean(a && b) && colord(a).delta(b) < 0.01;
