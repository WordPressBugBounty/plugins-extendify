import { BLOCK, BLOCK_TYPE } from '@agentx/lib/block-box';
import { __, sprintf } from '@wordpress/i18n';

const LINKS = [
	'core/navigation-link',
	'core/navigation-submenu',
	'core/page-list-item',
]
	.map((type) => `[${BLOCK_TYPE}="${type}"]`)
	.join(', ');

const pathOf = (url, base) => {
	try {
		return new URL(url, base).pathname.replace(/\/?$/, '/');
	} catch {
		return null;
	}
};

// A menu link keeps the words it was made with, so a renamed page's link still shows its old title.
export const menuLinkTask = (renames, doc) => {
	if (!doc) return null;
	for (const { url, name } of [...renames].reverse()) {
		const page = pathOf(url, doc.baseURI);
		const link = [...doc.querySelectorAll(LINKS)].find(
			(item) =>
				pathOf(
					item.querySelector('a[href]')?.getAttribute('href'),
					doc.baseURI,
				) === page,
		);
		const label = link
			?.querySelector('a')
			?.textContent.replace(/\s+/g, ' ')
			.trim();
		if (!label || label === name) continue;
		return {
			// translators: A task the AI Agent offers after renaming a page whose menu link still shows the page's old title, sent as the user's message.
			text: __('Update the menu link', 'extendify-local'),
			// translators: Button on the AI Agent's card that changes a menu link to a renamed page's new title.
			action: __('Update menu link', 'extendify-local'),
			note: sprintf(
				// translators: %s is a menu link's words, the old title of a page the AI Agent just renamed. Asked on the card that offers to change the link to the new title.
				__('Do you want to update the “%s” menu link next?', 'extendify-local'),
				label,
			),
			icon: 'browser',
			// The agent reads this in English; the user sees only the task's words.
			context: `Change the “${label}” menu link to “${name}”, the page's new title.`,
			block: link.getAttribute(BLOCK),
		};
	}
	return null;
};
