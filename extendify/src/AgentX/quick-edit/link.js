import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { addQueryArgs } from '@wordpress/url';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const linkHolding = (words, node) => {
	const element =
		node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
	const link = element?.closest('a');
	return link && words.contains(link) ? link : null;
};

export const linkAt = (selection, words) =>
	linkHolding(
		words,
		selection?.rangeCount
			? selection.getRangeAt(0).commonAncestorContainer
			: null,
	);

const MOVES = [
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'ArrowDown',
	'Home',
	'End',
];

// Chrome types past a link's end once its last letters are replaced.
export const keepTypingInLinks = (words) => {
	const doc = words.ownerDocument;
	let typingIn = null;
	const onBeforeInput = (event) => {
		const selection = doc.getSelection();
		if (!selection?.rangeCount) return;
		const range = selection.getRangeAt(0);
		const link = linkHolding(words, range.startContainer);
		if (event.inputType.startsWith('delete')) {
			typingIn = link;
			return;
		}
		if (event.inputType !== 'insertText' || !event.data) return;
		// A caret just after a link, not reached by typing in it, starts new words outside it.
		if (!link || (range.collapsed && link !== typingIn)) {
			typingIn = null;
			return;
		}
		event.preventDefault();
		let node = range.startContainer;
		let offset = range.startOffset;
		// A selection running past the link's end leaves the caret after the link once deleted.
		range.deleteContents();
		if (node.nodeType !== Node.TEXT_NODE || !link.contains(node)) {
			node = doc.createTextNode('');
			link.append(node);
			offset = 0;
		}
		node.insertData(offset, event.data);
		range.setStart(node, offset + event.data.length);
		range.collapse(true);
		selection.removeAllRanges();
		selection.addRange(range);
		typingIn = link;
	};
	const forget = () => {
		typingIn = null;
	};
	const listening = new AbortController();
	const { signal } = listening;
	words.addEventListener('beforeinput', onBeforeInput, { signal });
	words.addEventListener('mousedown', forget, { signal });
	words.addEventListener(
		'keydown',
		(event) => {
			if (MOVES.includes(event.key)) forget();
		},
		{ signal },
	);
	return () => listening.abort();
};

// Anything else typed is words to search the site's pages for.
export const isAddress = (text) =>
	/^(https?:\/\/|mailto:|tel:|sms:|\/|#|\?)/i.test(text) ||
	EMAIL.test(text) ||
	/^(www\.)?[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?$/i.test(text);

export const hrefOf = (text) => {
	const typed = text.trim();
	if (/^([a-z][a-z\d+.-]*:|\/|#|\?)/i.test(typed)) return typed;
	if (EMAIL.test(typed)) return `mailto:${typed}`;
	return `https://${typed}`;
};

export const searchPages = (search, { signal } = {}) =>
	apiFetch({
		path: addQueryArgs('/wp/v2/search', { search, per_page: 6, type: 'post' }),
		signal,
	}).then((found) =>
		(Array.isArray(found) ? found : []).map(({ id, url, title, subtype }) => ({
			id,
			url,
			title: decodeEntities(title || url),
			type: subtype,
		})),
	);

export const setLink = (words, { range, link }, { href, newTab, page }) => {
	const doc = words.ownerDocument;
	let anchor = link;
	if (!anchor) {
		anchor = doc.createElement('a');
		const inWords = range && words.contains(range.commonAncestorContainer);
		if (inWords && !range.collapsed) {
			const picked = range.extractContents();
			// A link inside a link is dropped by the browser, and its words with it.
			for (const inner of [...picked.querySelectorAll('a')]) {
				inner.replaceWith(...inner.childNodes);
			}
			anchor.append(picked);
			range.insertNode(anchor);
		} else {
			anchor.textContent = page?.title || href;
			if (inWords) range.insertNode(anchor);
			else words.append(anchor);
		}
	}
	anchor.setAttribute('href', href);
	if (page) {
		anchor.dataset.type = page.type;
		anchor.dataset.id = String(page.id);
	} else {
		delete anchor.dataset.type;
		delete anchor.dataset.id;
	}
	const rel = (anchor.getAttribute('rel') ?? '')
		.split(/\s+/)
		.filter((token) => token && !['noreferrer', 'noopener'].includes(token));
	if (newTab) {
		anchor.setAttribute('target', '_blank');
		rel.push('noreferrer', 'noopener');
	} else anchor.removeAttribute('target');
	if (rel.length) anchor.setAttribute('rel', rel.join(' '));
	else anchor.removeAttribute('rel');
	return anchor;
};

export const unlink = (link) => link.replaceWith(...link.childNodes);
