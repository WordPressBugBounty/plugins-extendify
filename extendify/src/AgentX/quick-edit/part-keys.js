import { __, sprintf } from '@wordpress/i18n';

const KEY = 'data-agentx-key';
const KEYED = `[${KEY}]`;
// What a part may be besides a block: a product page's own parts, a calendar's event, a form's field.
const PARTS = [
	'[data-extendify-block]',
	'[data-extendify-product-part]',
	'[data-extendify-block-type="sugar-calendar/block"] [data-eventid]',
	'.wpforms-field[data-field-id]',
].join(', ');
// Already a tab stop of the page's own, with a role and name of its own.
const OWN =
	'a[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable], [role], [aria-label]';
// A role that can't carry a name, as on a paragraph or a plain box.
const UNNAMED = ['DIV', 'P', 'SPAN'];
const LONGEST = 60;

const snippetOf = (element) => {
	const words = (
		element.textContent.trim() ||
		element.querySelector('img[alt]')?.alt ||
		''
	)
		.replace(/\s+/g, ' ')
		.trim();
	if (words.length <= LONGEST) return words;
	return `${words.slice(0, LONGEST).replace(/\s+\S*$/, '')}…`;
};

const labelOf = (element) => {
	const snippet = snippetOf(element);
	return snippet
		? sprintf(
				// translators: %s is the start of the words of a part of the user's website, like a heading. Read by screen readers on that part, where Enter opens a small menu of changes for it.
				__('Editing options for "%s"', 'extendify-local'),
				snippet,
			)
		: // translators: Read by screen readers on a part of the user's website without words, like a picture, where Enter opens a small menu of changes for it.
			__('Editing options', 'extendify-local');
};

export const keyedPart = (element) =>
	element?.nodeType === 1 && element.hasAttribute(KEY) ? element : null;

// Each part with something to offer becomes a tab stop, so the keyboard reaches it as the pointer does.
export const keyParts = (doc, offers) => {
	for (const element of doc.querySelectorAll(PARTS)) {
		if (element.hasAttribute(KEY) || element.matches(OWN) || !offers(element)) {
			continue;
		}
		const unnamed = UNNAMED.includes(element.tagName);
		element.setAttribute(KEY, unnamed ? 'group' : '');
		element.setAttribute('tabindex', '0');
		if (unnamed) element.setAttribute('role', 'group');
		element.setAttribute('aria-label', labelOf(element));
	}
};

const forget = (element) => {
	if (element.getAttribute(KEY) === 'group') element.removeAttribute('role');
	element.removeAttribute('tabindex');
	element.removeAttribute('aria-label');
	element.removeAttribute(KEY);
};

export const unkeyParts = (doc) => {
	for (const element of doc.querySelectorAll(KEYED)) forget(element);
};

// A copy of the page for the agent, which reads the part as the site renders it.
export const withoutKeys = (copy) => {
	for (const element of [copy, ...copy.querySelectorAll(KEYED)]) {
		if (element.hasAttribute(KEY)) forget(element);
	}
	return copy;
};
