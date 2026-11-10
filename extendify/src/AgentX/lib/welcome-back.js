import { abilityNamed } from '@agentx/lib/abilities';
import { siteFacts, storeGuideDue } from '@agentx/lib/outstanding';
import { __ } from '@wordpress/i18n';

const MOST = 3;
const MOST_UNDONE = 2;

// A partner's notification shows here when it names a chat slot and its words are a request, not a link.
const PARTNER_SLOTS = ['agent-chat', 'agent-welcome'];
// A partner row whose trigger is one of ours asks for the same thing, so ours shows instead.
const SAME_AS = { unpublished: 'welcome-publish' };

const undone = () => {
	const facts = siteFacts();
	return [
		!facts.logo && {
			id: 'welcome-logo',
			// translators: A request the user can send the AI Agent with one click when it welcomes them back; the website has no logo yet.
			text: __('Add a site logo', 'extendify-local'),
			details: { workflow: 'logo' },
		},
		!facts.live && {
			id: 'welcome-publish',
			// translators: A request the user can send the AI Agent with one click when it welcomes them back; visitors still see a Coming Soon page.
			text: __('Make my site live', 'extendify-local'),
			details: { workflow: 'site-visibility' },
		},
		window.extAgentXData?.samplePhone && {
			id: 'welcome-phone',
			// translators: A request the user can send the AI Agent with one click when it welcomes them back; the website still shows the placeholder phone number it was built with.
			text: __('Update my phone number', 'extendify-local'),
			details: {},
		},
		storeGuideDue() && {
			id: 'welcome-store',
			// translators: Sent for the user in the AI Agent's chat when they press Set up your store on its card; it opens the store setup guide.
			text: __('Set up my store', 'extendify-local'),
			details: { storeGuide: true },
		},
		!facts.icon && {
			id: 'welcome-icon',
			// translators: A request the user can send the AI Agent with one click when it welcomes them back; the website has no site icon, the small image in browser tabs, yet.
			text: __('Add a site icon', 'extendify-local'),
			details: { workflow: 'site-icon' },
		},
		!facts.tagline && {
			id: 'welcome-tagline',
			// translators: A request the user can send the AI Agent with one click when it welcomes them back; the website has no tagline, the short line under its title, yet.
			text: __('Add a tagline', 'extendify-local'),
			details: { workflow: 'tagline' },
		},
	].filter(Boolean);
};

const partnerRows = () => {
	try {
		const rows = JSON.parse(window.extSharedData?.notifications ?? '[]');
		return Array.isArray(rows) ? rows : [];
	} catch {
		return [];
	}
};

const partner = () =>
	partnerRows()
		.filter(
			(row) =>
				(row?.slots ?? []).some((slot) => PARTNER_SLOTS.includes(slot)) &&
				typeof row['content-agent-chat'] === 'string' &&
				row['content-agent-chat'].trim() &&
				!row.link,
		)
		.map((row) => ({
			id: `welcome-partner-${row.slug}`,
			text: row['content-agent-chat'].trim(),
			details: {},
			same: SAME_AS[row.trigger],
		}));

const forPage = (page) => {
	if (page?.kind !== 'shop' && page?.kind !== 'product') return [];
	return [
		abilityNamed('woocommerce/orders-query') && {
			id: 'welcome-orders',
			// translators: A request the user can send the AI Agent with one click when it welcomes them back on their store's page.
			text: __('Check products sold today', 'extendify-local'),
			details: { workflow: 'plugin:woocommerce' },
		},
		abilityNamed('woocommerce/product-create') && {
			id: 'welcome-product',
			// translators: A request written as the user to the AI Agent, to add a product to their store. Shown as the chat box's placeholder for the user to send with Tab; keep it short.
			text: __('Add a product to my store', 'extendify-local'),
			details: { workflow: 'plugin:woocommerce' },
		},
	].filter(Boolean);
};

const explore = () => ({
	id: 'welcome-explore',
	// translators: A request written as the user to the AI Agent, to see the list of things it can do. Shown as the chat box's placeholder when nothing else fits; Tab opens the list. Keep it short.
	text: __('Show me what you can do', 'extendify-local'),
	details: { sheet: 'commands' },
});

// What's undone comes first, then a partner's request, then the page in view; the rest fill up to three.
export const welcomeBackItems = (page) => {
	const own = undone();
	const theirs = partner()
		.filter(({ same }) => !own.some(({ id }) => id === same))
		.map(({ same: _same, ...item }) => item);
	const here = forPage(page);
	const items = [
		...own.slice(0, MOST_UNDONE),
		...theirs.slice(0, 1),
		...here.slice(0, 1),
		...own.slice(MOST_UNDONE),
		...theirs.slice(1),
		...here.slice(1),
	].slice(0, MOST);
	return items.length ? items : [explore()];
};
