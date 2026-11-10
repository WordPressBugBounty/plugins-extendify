import { editBlocks } from '@agentx/lib/edit-blocks';
import { tidy } from '@agentx/lib/quick-edit';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Retyped words would leave a call or email link on the old number or address.
export const contactHref = (href, words) => {
	if (/^tel:/i.test(href)) {
		const digits = words.replace(/\D+/g, '');
		// Shorter or longer than any dialable number, so the words aren't one.
		if (digits.length < 7 || digits.length > 15) return null;
		return `tel:${words.startsWith('+') ? '+' : ''}${digits}`;
	}
	if (/^mailto:/i.test(href) && EMAIL.test(words)) {
		return `mailto:${words}${/\?.*$/.exec(href)?.[0] ?? ''}`;
	}
	return null;
};

export const syncContactLinks = (html) => {
	const template = document.createElement('template');
	template.innerHTML = html;
	let changed = false;
	for (const link of template.content.querySelectorAll('a[href]')) {
		const href = link.getAttribute('href');
		const next = contactHref(href, link.textContent.trim());
		if (!next || next === href) continue;
		link.setAttribute('href', next);
		// The editor names a call or email link by its address too.
		if (/^(tel|mailto):/i.test(link.dataset.id ?? '')) link.dataset.id = next;
		changed = true;
	}
	return changed ? template.innerHTML : html;
};

// One call, so one Undo takes back the words, look and link together.
export const saveEdit = (
	{ id, type },
	{ html, before, styles = {}, link = null },
) => {
	const ops = [];
	if (html !== before) {
		ops.push({
			op: 'format-text',
			block: id,
			type,
			text: tidy(syncContactLinks(html)),
			direct: true,
		});
	}
	if (Object.keys(styles).length) {
		ops.push({ op: 'set-style', block: id, type, styles, direct: true });
	}
	if (link) {
		ops.push({ op: 'set-link', block: id, type, ...link, direct: true });
	}
	return ops.length ? editBlocks({ ops }) : Promise.resolve({ done: [] });
};

// Read off the block's tag and classes, so the bar can mark its current look.
export const lookOf = (element) => {
	const look = {};
	const level = /^H([1-6])$/.exec(element.tagName)?.[1];
	if (level) look.heading_level = Number(level);
	for (const name of element.classList) {
		const align = /^has-text-align-(left|center|right)$/.exec(name)?.[1];
		if (align) look.text_align = align;
	}
	return look;
};
