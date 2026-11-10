import { __ } from '@wordpress/i18n';

// PhoneNumbers::SHAPE and NOT_PHONES, so the bubble and the agent call the same words a phone number.
const PHONE = /\+?\(?\d[\d\s().-]{5,}\d/g;
const NOT_PHONES = [
	/^\d{4}\s*[-–]\s*\d{4}$/,
	/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/,
	/(^|\D)\d{1,2}[.:]\d{2}(\D|$)/,
];
const EMAIL = /[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/gi;

const TEXT_NODE = 3;

export const contactsIn = (text) => [
	...[...text.matchAll(PHONE)]
		.filter(([value]) => !NOT_PHONES.some((shape) => shape.test(value)))
		.map((match) => ({
			kind: 'phone',
			value: match[0],
			start: match.index,
			end: match.index + match[0].length,
		})),
	...[...text.matchAll(EMAIL)].map((match) => ({
		kind: 'email',
		value: match[0],
		start: match.index,
		end: match.index + match[0].length,
	})),
];

const contactOf = (match) =>
	match ? { kind: match.kind, value: match.value } : null;

// A tel or mailto link names its number or address even where its words say Call us.
export const linkContact = (anchor) => {
	const href = anchor?.getAttribute?.('href') ?? '';
	const scheme = href.slice(0, href.indexOf(':')).toLowerCase();
	const target = decodeURIComponent(href.slice(href.indexOf(':') + 1));
	if (scheme === 'tel') {
		const shown = contactsIn(anchor.textContent).find(
			({ kind }) => kind === 'phone',
		);
		return { kind: 'phone', value: shown?.value ?? target };
	}
	if (scheme === 'mailto') {
		return { kind: 'email', value: target.split('?')[0] };
	}
	return null;
};

// Chrome before 128 and Safari only have caretRangeFromPoint.
const caretAt = (doc, x, y) => {
	const position = doc.caretPositionFromPoint?.(x, y);
	if (position) return { node: position.offsetNode, offset: position.offset };
	const range = doc.caretRangeFromPoint?.(x, y);
	return range
		? { node: range.startContainer, offset: range.startOffset }
		: null;
};

export const contactAt = (doc, x, y) => {
	const caret = caretAt(doc, x, y);
	if (caret?.node?.nodeType !== TEXT_NODE) return null;
	return contactOf(
		contactsIn(caret.node.textContent).find(
			({ start, end }) => caret.offset >= start && caret.offset <= end,
		),
	);
};

export const contactLabel = ({ kind }) =>
	kind === 'phone'
		? // translators: Name of a phone number the user picked on their website, shown on the chip in the AI Agent's chat box.
			__('Phone number', 'extendify-local')
		: // translators: Name of an email address the user picked on their website, shown on the chip in the AI Agent's chat box.
			__('Email address', 'extendify-local');
