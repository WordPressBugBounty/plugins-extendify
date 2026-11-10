let presets = window.extAgentXData?.presets ?? {};

// A Save that adds a new color to the palette answers with the presets as they now are.
export const setPresets = (next) => {
	presets = next;
};

const KINDS = { colors: 'color', gradients: 'gradient' };

// Each preset as the frame computes it, so the backend can tell which one a block's computed style is.
const PROBES = {
	colors: ['color', 'color'],
	fontSizes: ['font-size', 'font-size'],
	spacing: ['padding-top', 'spacing'],
};

// A palette's card tints are custom colors, so their variables sit under custom, not preset.
const variable = (name, { slug, custom }) =>
	`--wp--${custom ? 'custom' : 'preset'}--${name}--${slug}`;

const probed = (doc, kind, preset) => {
	if (!PROBES[kind] || !doc.body) return '';
	const [property, name] = PROBES[kind];
	const probe = doc.createElement('div');
	probe.style.setProperty('position', 'absolute');
	probe.style.setProperty('visibility', 'hidden');
	probe.style.setProperty(property, `var(${variable(name, preset)})`);
	doc.body.append(probe);
	const style = doc.defaultView?.getComputedStyle(probe);
	// Without its variable the probe inherits the text color, as a color saved since the page loaded does.
	const defined = style?.getPropertyValue(variable(name, preset)).trim();
	const value = defined ? (style?.getPropertyValue(property) ?? '') : '';
	probe.remove();
	// An unresolved variable says nothing about what shows.
	return value.includes('var(') ? '' : value.trim();
};

// The frame shows the draft's colors, which a color scheme being tried has changed from the saved ones.
const live = (kind, list) => {
	const doc = document.getElementById('extendify-agentx-site')?.contentDocument;
	const root = doc?.documentElement;
	if (!root || !Array.isArray(list)) return list;
	const style = root.ownerDocument.defaultView?.getComputedStyle(root);
	return list.map((preset) => {
		const value = KINDS[kind]
			? style?.getPropertyValue(variable(KINDS[kind], preset)).trim()
			: '';
		const computed = probed(doc, kind, preset);
		return {
			...preset,
			...(value && { value }),
			...(computed && { computed }),
		};
	});
};

export const presetsOf = () =>
	Object.fromEntries(
		Object.entries(presets).map(([kind, list]) => [kind, live(kind, list)]),
	);
