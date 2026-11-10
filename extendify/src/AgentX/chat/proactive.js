import { PLUGIN_LOGOS } from '@agentx/chat/CardBadge';
import { NewTabLink } from '@agentx/chat/NewTabLink';
import { createInterpolateElement } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const IMAGIFY = {
	slug: 'imagify',
	name: 'Imagify',
	url: 'https://wordpress.org/plugins/imagify/',
	image: PLUGIN_LOGOS.imagify,
};

const WP_ROCKET = {
	name: 'WP Rocket',
	url: 'https://wp-rocket.me/',
	image: PLUGIN_LOGOS['wp-rocket'],
};

const linked = (text, url) =>
	createInterpolateElement(text, {
		a: <NewTabLink href={url} className="underline" />,
	});

// A paid plugin is only linked: install-plugin takes wordpress.org plugins alone.
const FIXES = {
	'large-images': () => ({
		key: 'imagify',
		image: IMAGIFY.image,
		installs: IMAGIFY,
		text: linked(
			// translators: One of the actions the AI Agent suggests for a slow website. Keep <a> and </a> around the plugin name, which links to the plugin.
			__('Optimize images using <a>Imagify</a>', 'extendify-local'),
			IMAGIFY.url,
		),
	}),
	'page-caching': () => ({
		key: 'wp-rocket',
		image: WP_ROCKET.image,
		text: linked(
			// translators: One of the actions the AI Agent suggests for a slow website. Keep <a> and </a> around the plugin name, which links to the plugin's site.
			__('Improve load speeds with <a>WP Rocket</a>', 'extendify-local'),
			WP_ROCKET.url,
		),
	}),
	'plugin-count': () => ({
		key: 'plugin-count',
		// translators: One of the actions the AI Agent suggests for a slow website that has many plugins turned on.
		text: __("Turn off plugins you don't use", 'extendify-local'),
	}),
	'server-response': () => ({
		key: 'server-response',
		// translators: One of the actions the AI Agent suggests for a slow website whose server takes long to answer.
		text: __('Ask your host about slow server responses', 'extendify-local'),
	}),
};
FIXES['render-blocking'] = FIXES['page-caching'];

const slowSite = ({ checks = [] }) => {
	const items = [
		...new Map(
			checks
				.filter((check) => FIXES[check])
				.map((check) => FIXES[check]())
				.map((item) => [item.key, item]),
		).values(),
	];
	if (!items.length) return null;
	const installs = items.map((item) => item.installs).filter(Boolean);
	return {
		icon: 'rocket',
		// translators: Heading of the card the AI Agent shows on its own when the website loads slowly.
		label: __('Site speed', 'extendify-local'),
		// translators: Shown on the card the AI Agent shows on its own when the website loads slowly, above a numbered list of actions.
		text: __(
			'Your site is running slowly. Here are actions to take:',
			'extendify-local',
		),
		items,
		action: installs.length
			? {
					installs,
					// translators: Button on the AI Agent's slow-website card that installs the plugins it lists.
					label: __('Install', 'extendify-local'),
				}
			: null,
	};
};

const imagifyQuota = ({ used }) => ({
	icon: 'image',
	image: IMAGIFY.image,
	label: IMAGIFY.name,
	text: linked(
		sprintf(
			// translators: %s is an amount of data, like 20MB. Shown on the card the AI Agent shows on its own when the Imagify plugin used up its monthly allowance. Keep <a> and </a> around the plan name, which links to Imagify's prices.
			__(
				'Imagify has optimized %s worth of images this month. Upgrade to the <a>Growth</a> plan to continue optimizing and keep your site running fast.',
				'extendify-local',
			),
			used,
		),
		'https://imagify.io/pricing/',
	),
	action: {
		url: 'https://imagify.io/pricing/',
		// translators: Button on the AI Agent's card about the Imagify plugin's monthly allowance: opens Imagify's prices in a new tab.
		label: __('See plans', 'extendify-local'),
	},
});

export const PLANS = 'https://imagify.io/pricing/';

export const imagifyUpgrade = () =>
	linked(
		// translators: On a card in the AI Agent's chat about the Imagify plugin's monthly allowance. Keep <a> and </a> around the plan name, which links to Imagify's prices.
		__(
			'Upgrade to the <a>Growth</a> plan to continue optimizing and keep your site running fast.',
			'extendify-local',
		),
		PLANS,
	);

const sizeOf = (bytes) =>
	bytes >= 1_000_000
		? `${(bytes / 1_000_000).toFixed(1)} MB`
		: `${Math.max(1, Math.round(bytes / 1000))} KB`;

// Says what Imagify did, so it wants nothing from the user.
const imagifyOptimized = ({ before, after }) => ({
	icon: 'image',
	image: IMAGIFY.image,
	label: IMAGIFY.name,
	info: true,
	text: sprintf(
		// translators: %1$s is an image's file size before Imagify made it smaller, like 1.2 MB; %2$s is its size after, like 318 KB; %3$s is how much smaller it got, like 74%. Shown on a card in the AI Agent's chat right after the user added an image to their website.
		__(
			'Imagify optimized your new image: %1$s → %2$s, %3$s smaller.',
			'extendify-local',
		),
		sizeOf(before),
		sizeOf(after),
		`${Math.max(0, Math.round((1 - after / before) * 100))}%`,
	),
});

const imagifyOut = ({ used }) => ({
	icon: 'image',
	image: IMAGIFY.image,
	label: IMAGIFY.name,
	text: sprintf(
		// translators: %s is an amount of data, like 20MB. Shown on a card in the AI Agent's chat right after the user added an image to their website, when the Imagify plugin couldn't make it smaller because its free monthly allowance is used up.
		__(
			"Heads up: your new image wasn't optimized, since you've used all %s of this month's free Imagify optimization. Upgrade to keep your images optimized.",
			'extendify-local',
		),
		used,
	),
	action: {
		url: PLANS,
		// translators: Button on the AI Agent's card about the Imagify plugin's monthly allowance: opens Imagify's prices in a new tab.
		label: __('See plans', 'extendify-local'),
	},
});

const PROACTIVE = {
	'slow-site': slowSite,
	'imagify-quota': imagifyQuota,
	'imagify-optimized': imagifyOptimized,
	'imagify-out': imagifyOut,
};

// Built at render, so a saved message keeps only data and follows the site's language.
export const proactiveCopy = (data) => PROACTIVE[data?.id]?.(data) ?? null;
