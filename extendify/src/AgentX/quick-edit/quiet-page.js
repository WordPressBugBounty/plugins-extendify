const OPEN = 'data-extendify-agentx-editing';

// While a part is open, a click elsewhere must not follow a link or press a button.
export const quietPage = (part, { typed = true } = {}) => {
	const doc = part.ownerDocument;
	const style = doc.createElement('style');
	style.textContent = [
		'html, body { cursor: default !important; }',
		'body * { pointer-events: none !important; }',
		// A picture takes no clicks either, or its link would open.
		typed &&
			`[${OPEN}], [${OPEN}] * { pointer-events: auto !important; cursor: text !important; }`,
	]
		.filter(Boolean)
		.join('\n');
	part.setAttribute(OPEN, '');
	doc.head.append(style);
	return () => {
		style.remove();
		part.removeAttribute(OPEN);
	};
};
