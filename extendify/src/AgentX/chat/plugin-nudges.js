import { addPluginMessage, conversation } from '@agentx/chat/conversation';
import { PLANS } from '@agentx/chat/proactive';
import { allSuggestions } from '@agentx/chat/suggestions';
import { abilityNamed, runAbility } from '@agentx/lib/abilities';
import { watchImagifyKey } from '@agentx/lib/imagify-key';
import {
	markNudgeShown,
	rankNudges,
	readHistory,
	WEIGHT,
	weighed,
} from '@agentx/lib/nudges';
import { onShop, STORE_NUDGE, siteFacts } from '@agentx/lib/outstanding';
import { pageInView } from '@agentx/lib/page-in-view';
import { activePlugin } from '@agentx/lib/plugins';
import { track } from '@agentx/lib/track';
import { holdNudges, showNudge, useNudgeStore } from '@agentx/state/nudges';
import { __ } from '@wordpress/i18n';
import { generateId } from 'ai';

const PACED = ['backoff:30-30', 'spaced:plugin,14'];

const LARGE_IMAGE_BYTES = 1_000_000;

const STATUS = 'imagify/get-media-status';
const ACCOUNT = 'imagify/get-account';
const IMAGIFY_SETTINGS = `${window.extSharedData?.adminUrl ?? '/wp-admin/'}options-general.php?page=imagify`;
// Imagify optimizes an upload on its own a few seconds after it lands.
const OPTIMIZE_POLL_MS = 3000;
const OPTIMIZE_WAIT_MS = 60000;

const LARGE_IMAGE = {
	id: 'large-image',
	introduced: true,
	placeholder: 'install-imagify',
	inline: 'image-size',
	gutter: null,
	when: PACED,
};

const proactive = (data) => ({
	id: generateId(),
	role: 'assistant',
	parts: [{ type: 'data-proactive', data }],
});

const PHONE = 'guide-phone';
const EXPLORE = 'guide-explore';

const ATTENTION = () =>
	// translators: Said by the AI Agent right after the user finishes setting up the website or its store, leading into a card that asks about the next thing to do.
	__('By the way, I think this needs your attention.', 'extendify-local');

// A card the plugin brings up itself; its rules keep it out of the list, and none goes under a guide still open.
// The gutter part has no line above it, so its own sentence says why and asks.
const nudgeOf = (
	{ id, lead, note, ask, icon, text, button, details },
	when,
) => ({
	id,
	introduced: true,
	lead,
	placeholder: { id, text, type: 'placeholder', slot: 'placeholder', details },
	inline: {
		id,
		text,
		type: 'action',
		slot: 'inline',
		card: { text: note, icon, button },
		details,
	},
	gutter: ask
		? {
				id,
				text,
				type: 'action',
				slot: 'gutter',
				card: { text: ask, icon, button },
				details,
			}
		: null,
	when: ['missing:guide-open', ...when],
});

const STORE_NEXT = () =>
	// translators: Said by the AI Agent right after the user finishes setting up their website, leading into a card that offers to set up their WooCommerce store.
	__('Next we should focus on setting up WooCommerce.', 'extendify-local');

const storeNudge = (lead) =>
	nudgeOf(
		{
			id: STORE_NUDGE,
			lead,
			// translators: Asked on the AI Agent's card on a website that sells with WooCommerce and whose store isn't set up yet, over a button that opens the store setup.
			note: __('Do you want to set up your store?', 'extendify-local'),
			// translators: On the AI Agent's card above its chat box, brought up on its own on a website whose WooCommerce store isn't set up yet, over Not now and a button that opens the store setup.
			ask: __(
				'Your store isn’t set up yet. Want to set it up now?',
				'extendify-local',
			),
			icon: 'store',
			// translators: Sent for the user in the AI Agent's chat when they press Set up your store on its card; it opens the store setup guide.
			text: __('Set up my store', 'extendify-local'),
			// translators: Button on the AI Agent's card on a website whose store isn't set up yet, that opens the store setup guide.
			button: __('Set up store', 'extendify-local'),
			details: { storeGuide: true },
		},
		['missing:store', 'previously-interacted:7'],
	);

const phoneNudge = (lead) =>
	nudgeOf(
		{
			id: PHONE,
			lead,
			// translators: Asked on the AI Agent's card after the user finishes setting up the website or its store, when the website still shows the placeholder phone number it was built with, over a button to change it.
			note: __(
				'Do you want to update your phone number next?',
				'extendify-local',
			),
			icon: 'phone',
			// translators: A request the user can send the AI Agent with one click when it welcomes them back; the website still shows the placeholder phone number it was built with.
			text: __('Update my phone number', 'extendify-local'),
			// translators: Button on the AI Agent's card, after the user finishes setting up the website or its store, that asks the agent to change the placeholder phone number.
			button: __('Update phone number', 'extendify-local'),
			details: {},
		},
		['has:sample-phone', 'previously-interacted:7'],
	);

const exploreNudge = () =>
	nudgeOf(
		{
			id: EXPLORE,
			// translators: Said by the AI Agent right after the user finishes setting up a new website, leading into a card that offers the list of what it can do.
			lead: __('There’s more I can help you with.', 'extendify-local'),
			// translators: Asked on the AI Agent's card right after the user finishes setting up a new website, over a button that shows the list of things it can do.
			note: __('Do you want to see what I can do next?', 'extendify-local'),
			icon: 'rocket',
			// translators: A request written as the user to the AI Agent, to see the list of things it can do. Shown as the chat box's placeholder when nothing else fits; Tab opens the list. Keep it short.
			text: __('Show me what you can do', 'extendify-local'),
			// translators: Button on the AI Agent's card, after the user finishes setting up the website, that shows the list of things it can do.
			button: __('Show me what you can do', 'extendify-local'),
			details: { sheet: 'commands' },
		},
		['never-shown', 'previously-called-days:0'],
	);

// The sources that fill the list besides a reply, each with the weight it gives.
const afterGuide = () =>
	weighed(
		[storeNudge(STORE_NEXT()), phoneNudge(ATTENTION()), exploreNudge()],
		WEIGHT.after,
	);

const afterStore = () =>
	weighed([phoneNudge(ATTENTION()), exploreNudge()], WEIGHT.after);

export const afterPhone = () =>
	readHistory()[PHONE]?.calledAt ? weighed([exploreNudge()], WEIGHT.after) : [];

export const onPage = (page) =>
	onShop(page) ? weighed([storeNudge()], WEIGHT.page) : [];

const topOf = (entries, { now = Date.now(), facts = {} } = {}) =>
	rankNudges(entries, {
		context: {
			history: readHistory(),
			facts: { ...siteFacts(), ...facts },
			now,
		},
	})[0] ?? null;

const sayFinished = async (line, alone, next) => {
	const message = {
		id: generateId(),
		role: 'assistant',
		parts: [
			{ type: 'text', text: next ? line : alone },
			...(next
				? [{ type: 'data-nudge', data: { id: next.id, lead: next.lead } }]
				: []),
		],
	};
	if (next) showNudge(message.id, next, { at: 'end' });
	if (!(await addPluginMessage(message)) || !next) return;
	markNudgeShown(next);
};

export const guideFinished = () =>
	sayFinished(
		// translators: Said by the AI Agent right after the user finishes the setup steps it shows on a new website, before a card that asks about the next thing to do.
		__('You’ve finished setting up your website.', 'extendify-local'),
		// translators: Said by the AI Agent right after the user finishes the setup steps it shows on a new website, when nothing else is due.
		__(
			'You’ve finished setting up your website. If you need anything, just let me know.',
			'extendify-local',
		),
		topOf([...afterGuide(), ...onPage(pageInView())]),
	);

export const storeFinished = () =>
	sayFinished(
		// translators: Said by the AI Agent right after the user finishes its WooCommerce store setup steps, before a card that asks about the next thing to do.
		__('You’ve finished setting up your store.', 'extendify-local'),
		// translators: Said by the AI Agent right after the user finishes its WooCommerce store setup steps, when nothing else is due.
		__(
			'You’ve finished setting up your store. If you need anything, just let me know.',
			'extendify-local',
		),
		topOf(afterStore()),
	);

// Opening the agent on a page, or moving to one, brings up only that page's nudge.
export const pageNudge = (page, { now, guideOpen = false } = {}) =>
	topOf(onPage(page), { now, facts: { 'guide-open': guideOpen } });

export const bringUp = (nudge, messageId, { now = Date.now() } = {}) => {
	if (!nudge?.gutter || !messageId) return;
	showNudge(messageId, nudge, { at: 'up' });
	markNudgeShown(nudge, { now });
};

export const proactiveInstall = ({ id }) =>
	id === 'slow-site'
		? (allSuggestions({ largeImage: true }).find(
				(suggestion) => suggestion.id === 'install-imagify',
			) ?? null)
		: null;

const usedUp = (quota) => Boolean(quota?.free) && quota.percent >= 100;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const optimizedOf = async (id, { wait }) => {
	for (let waited = 0; waited <= OPTIMIZE_WAIT_MS; waited += OPTIMIZE_POLL_MS) {
		const status = await runAbility(STATUS, { media_id: id }).catch(() => null);
		if (status?.status === 'success' && status.optimized_size) return status;
		if (status?.status === 'error') return null;
		await wait(OPTIMIZE_POLL_MS);
	}
	return null;
};

// Once a day at most, though every image added meanwhile goes unoptimized.
const imagifyOut = () => ({
	id: 'imagify-out',
	introduced: true,
	placeholder: null,
	inline: {
		id: 'imagify-out',
		// translators: Button on the AI Agent's card, after a new image went unoptimized because the Imagify plugin's free monthly allowance is used up: opens Imagify's prices.
		text: __('See plans', 'extendify-local'),
		type: 'action',
		slot: 'inline',
		card: {
			// translators: Asked on the AI Agent's card under its reply, after a new image went unoptimized because the Imagify plugin's free monthly allowance is used up, over a button that opens Imagify's prices.
			text: __('Do you want to see Imagify’s plans?', 'extendify-local'),
			icon: 'image',
			// translators: Button on the AI Agent's card, after a new image went unoptimized because the Imagify plugin's free monthly allowance is used up: opens Imagify's prices.
			button: __('See plans', 'extendify-local'),
		},
		details: { url: PLANS },
	},
	gutter: null,
	when: ['spaced:imagify-out,1'],
});

// Imagify optimizes nothing until it has an API key; its settings page gets a free one.
const imagifyKey = () => ({
	id: 'imagify-key',
	introduced: true,
	placeholder: null,
	inline: {
		id: 'imagify-key',
		// translators: Button on the AI Agent's card, right after it installed the Imagify plugin, which can't optimize images until it has an API key: opens Imagify's settings to add one.
		text: __('Add API key', 'extendify-local'),
		type: 'action',
		slot: 'inline',
		card: {
			// translators: Asked on the AI Agent's card under its reply, right after it installed the Imagify plugin, which can't optimize images until it has an API key, over a button that opens Imagify's settings.
			text: __(
				'Do you want to add your Imagify API key next?',
				'extendify-local',
			),
			icon: 'image',
			// translators: Button on the AI Agent's card, right after it installed the Imagify plugin, which can't optimize images until it has an API key: opens Imagify's settings to add one.
			button: __('Add API key', 'extendify-local'),
		},
		details: { url: IMAGIFY_SETTINGS },
	},
	gutter: null,
	when: [],
});

const optimizeImages = () =>
	nudgeOf(
		{
			id: 'imagify-optimize',
			// translators: Asked on the AI Agent's card under its reply, right after it installed the Imagify plugin, over a button that asks the agent to optimize the images already on the website.
			note: __('Do you want to optimize your images next?', 'extendify-local'),
			// translators: Asked on the AI Agent's card above the chat box, when the user comes back with an Imagify API key in place, over a button that asks the agent to optimize the images already on the website.
			ask: __(
				'Imagify is ready now. Want me to optimize the images already on your site?',
				'extendify-local',
			),
			icon: 'image',
			// translators: Sent for the user in the AI Agent's chat when they press Optimize images on its card, right after it installed the Imagify plugin.
			text: __('Optimize my images', 'extendify-local'),
			// translators: Button on the AI Agent's card, right after it installed the Imagify plugin, that asks the agent to optimize the images already on the website.
			button: __('Optimize images', 'extendify-local'),
			details: {},
		},
		[],
	);

// Installing Imagify is a source: its API key first, else the images already on the site.
export const afterInstall = async ({ slug, alreadyActive } = {}) => {
	if (slug !== 'imagify' || alreadyActive) return;
	const keyed = abilityNamed(ACCOUNT)
		? (await runAbility(ACCOUNT, {}).catch(() => null))?.is_api_key_valid ===
			true
		: Boolean(window.extAgentXData?.facts?.['imagify-key']);
	if (!keyed) {
		// Held, the offer would wait for a reply the user has no reason to send.
		watchImagifyKey(() => {
			const last = conversation.messages.at(-1);
			if (last) bringUp(optimizeImages(), last.id);
			else holdNudges([{ nudge: optimizeImages(), weight: WEIGHT.after }]);
		});
	}
	holdNudges([
		{ nudge: keyed ? optimizeImages() : imagifyKey(), weight: WEIGHT.after },
	]);
};

// What Imagify did with the image is its result, not a suggestion, so it shows in the chat.
const showOptimized = async (optimized) => {
	track('nudge-shown', { nudge: 'imagify-optimized', slot: 'proactive' });
	await addPluginMessage(
		proactive({
			id: 'imagify-optimized',
			before: optimized.original_size,
			after: optimized.optimized_size,
		}),
	);
};

// Adding an image is a source: a large one with no Imagify, or Imagify's monthly allowance used up.
const imageEntries = async (image, { wait }) => {
	const large =
		image?.size > LARGE_IMAGE_BYTES
			? [{ nudge: LARGE_IMAGE, weight: WEIGHT.after }]
			: [];
	const facts = window.extAgentXData?.facts ?? {};
	if (!image?.id || !facts['imagify-key'] || !activePlugin('imagify')) {
		return large;
	}
	if (!abilityNamed(STATUS)) return large;
	const quota = facts['imagify-quota'];
	if (usedUp(quota)) {
		return [...large, { nudge: imagifyOut(), weight: WEIGHT.after }];
	}
	const optimized = await optimizedOf(image.id, { wait });
	if (optimized) await showOptimized(optimized);
	return large;
};

export const afterImage = async (image, { wait = pause } = {}) => {
	const entries = await imageEntries(image, { wait });
	if (!entries.length) return;
	const held = useNudgeStore.getState().held;
	holdNudges(
		entries.filter(
			({ nudge }) => !held.some((had) => had.nudge.id === nudge.id),
		),
	);
};
