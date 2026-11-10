const NS = 'http://www.w3.org/2000/svg';
const DRAWN = 'data-extendify-agentx-duotone';

// A theme filter's slug, '' for none, or 'custom' for colors of the block's own.
export const duotoneOf = (block, presets) => {
	// A classic theme wraps an aligned image's figure in a div, and WordPress moves the filter's class to it.
	const wrapper = block.parentElement?.matches('div.wp-block-image')
		? block.parentElement.classList
		: [];
	const named = [...block.classList, ...wrapper]
		.find((name) => name.startsWith('wp-duotone-'))
		?.slice('wp-duotone-'.length);
	if (!named || named.startsWith('unset-')) return '';
	return presets.some(({ slug }) => slug === named) ? named : 'custom';
};

const channelsOf = (doc, color) => {
	const probe = doc.createElement('span');
	probe.style.color = color;
	doc.body.append(probe);
	const read = doc.defaultView.getComputedStyle(probe).color;
	probe.remove();
	const [r = 0, g = 0, b = 0, a = 1] = (read.match(/[\d.]+/g) ?? []).map(
		Number,
	);
	return [r / 255, g / 255, b / 255, a];
};

const colorsOf = (value) => {
	try {
		const colors = JSON.parse(value);
		return Array.isArray(colors) && colors.length >= 2 ? colors : null;
	} catch {
		return null;
	}
};

// WordPress prints a theme filter's SVG only on a page that uses it, so a preview of another draws its own.
export const duotoneFilter = (doc, { slug, value }) => {
	if (doc.getElementById(`wp-duotone-${slug}`)) return `wp-duotone-${slug}`;
	const id = `extendify-agentx-duotone-${slug.replace(/[^\w-]/g, '')}`;
	if (doc.getElementById(id)) return id;
	const colors = colorsOf(value)?.map((color) => channelsOf(doc, color));
	if (!colors) return null;
	const tables = ['R', 'G', 'B', 'A']
		.map(
			(channel, at) =>
				`<feFunc${channel} type="table" tableValues="${colors.map((rgba) => rgba[at]).join(' ')}"/>`,
		)
		.join('');
	const svg = doc.createElementNS(NS, 'svg');
	svg.setAttribute(DRAWN, '');
	svg.setAttribute('aria-hidden', 'true');
	svg.style.cssText =
		'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
	svg.innerHTML = `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".299 .587 .114 0 0 .299 .587 .114 0 0 .299 .587 .114 0 0 .299 .587 .114 0 0"/><feComponentTransfer>${tables}</feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/></filter>`;
	doc.body.append(svg);
	return id;
};

export const dropDuotoneFilters = (doc) => {
	for (const svg of doc.querySelectorAll(`[${DRAWN}]`)) svg.remove();
};
