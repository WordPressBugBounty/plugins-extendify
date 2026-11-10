import { __, sprintf } from '@wordpress/i18n';

// Left where the card was, so the chat still says what the agent offered.
const ASKED = {
	'setup-logo': () =>
		// translators: A short line in the AI Agent's chat where its card offering to add a logo was turned down or passed by.
		__('Asked to add a logo', 'extendify-local'),
	'setup-icon': () =>
		// translators: A short line in the AI Agent's chat where its card offering to add a site icon (the small image in browser tabs) was turned down or passed by.
		__('Asked to add a site icon', 'extendify-local'),
	'setup-tagline': () =>
		// translators: A short line in the AI Agent's chat where its card offering to add a tagline was turned down or passed by.
		__('Asked to add a tagline', 'extendify-local'),
	'setup-publish': () =>
		// translators: A short line in the AI Agent's chat where its card offering to publish the website was turned down or passed by.
		__('Asked to publish the site', 'extendify-local'),
	'setup-colors': () =>
		// translators: A short line in the AI Agent's chat where its card offering new website colors was turned down or passed by.
		__('Asked to try new colors', 'extendify-local'),
	'setup-fonts': () =>
		// translators: A short line in the AI Agent's chat where its card offering new website fonts was turned down or passed by.
		__('Asked to try new fonts', 'extendify-local'),
	'setup-style': () =>
		// translators: A short line in the AI Agent's chat where its card offering a new website style was turned down or passed by.
		__('Asked to try a new style', 'extendify-local'),
	'setup-animation': () =>
		// translators: A short line in the AI Agent's chat where its card offering a new website animation was turned down or passed by.
		__('Asked to try a new animation', 'extendify-local'),
	'refresh-title': () =>
		// translators: A short line in the AI Agent's chat where its card asking whether the site title is still accurate was turned down or passed by.
		__('Asked to check the site title', 'extendify-local'),
	'refresh-tagline': () =>
		// translators: A short line in the AI Agent's chat where its card asking whether the tagline is still accurate was turned down or passed by.
		__('Asked to check the tagline', 'extendify-local'),
	'refresh-description': () =>
		// translators: A short line in the AI Agent's chat where its card asking whether the site description is still accurate was turned down or passed by.
		__('Asked to check the site description', 'extendify-local'),
	'refresh-logo': () =>
		// translators: A short line in the AI Agent's chat where its card asking whether the logo is still accurate was turned down or passed by.
		__('Asked to check the logo', 'extendify-local'),
	'refresh-icon': () =>
		// translators: A short line in the AI Agent's chat where its card asking whether the site icon is still accurate was turned down or passed by.
		__('Asked to check the site icon', 'extendify-local'),
	'imagify-coverage': () =>
		// translators: A short line in the AI Agent's chat where its card about images waiting for the Imagify plugin was turned down or passed by.
		__('Asked to look at Imagify’s plans', 'extendify-local'),
	'imagify-out': () =>
		// translators: A short line in the AI Agent's chat where its card offering the Imagify plugin's plans, after a new image went unoptimized, was turned down or passed by.
		__('Asked to look at Imagify’s plans', 'extendify-local'),
	'image-size': () =>
		// translators: A short line in the AI Agent's chat where its card offering to install the Imagify plugin for a large image was turned down or passed by.
		__('Asked to install Imagify', 'extendify-local'),
	'publish-page': () =>
		// translators: A short line in the AI Agent's chat where its card offering to publish a page it made was turned down or passed by.
		__('Asked to publish the page', 'extendify-local'),
	'publish-post': () =>
		// translators: A short line in the AI Agent's chat where its card offering to publish a blog post it saved as a draft was turned down or passed by.
		__('Asked to publish the post', 'extendify-local'),
	'add-to-menu': () =>
		// translators: A short line in the AI Agent's chat where its card offering to add a page to the menu was turned down or passed by.
		__('Asked to add the page to the menu', 'extendify-local'),
	'adjust-colors': () =>
		// translators: A short line in the AI Agent's chat where its card offering to adjust colors it chose was turned down or passed by.
		__('Asked to adjust the colors', 'extendify-local'),
	'setup-store': () =>
		// translators: A short line in the AI Agent's chat where its card offering the WooCommerce store setup was turned down or passed by.
		__('Asked to set up the store', 'extendify-local'),
	'store-nudge': () =>
		// translators: A short line in the AI Agent's chat where its card offering the WooCommerce store setup was turned down or passed by.
		__('Asked to set up the store', 'extendify-local'),
	'guide-phone': () =>
		// translators: A short line in the AI Agent's chat where its card offering to change the placeholder phone number was turned down or passed by.
		__('Asked to update the phone number', 'extendify-local'),
	'guide-explore': () =>
		// translators: A short line in the AI Agent's chat where its card offering the list of things it can do was turned down or passed by.
		__('Asked to show what I can do', 'extendify-local'),
};

export const askedLine = (suggestion) =>
	ASKED[suggestion.id]?.() ??
	sprintf(
		// translators: %s is a request the AI Agent offered on a card, like "Make the “Hours” heading red". A short line left in its chat once the card was turned down or passed by.
		__('Asked: %s', 'extendify-local'),
		suggestion.text,
	);
