import { showSaved } from '@agentx/lib/settings';
import { usePluginsStore } from '@agentx/state/plugins';
import { useScreensStore } from '@agentx/state/screens';
import { useStoreGuideStore } from '@agentx/state/store-guide';
import { recordPluginActivity } from '@shared/api/DataApi';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { __, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

const SEARCH_URL = 'https://api.wordpress.org/plugins/info/1.2/';

// The directory sends these by default, and they're large and unused.
const UNUSED = [
	'description',
	'sections',
	'icons',
	'banners',
	'tags',
	'versions',
	'ratings',
	'contributors',
	'screenshots',
	'compatibility',
	'donate_link',
];

// Line-breaking tags keep words apart; inline ones sit inside a sentence.
export const plainText = (html = '') =>
	decodeEntities(
		html.replace(/<\/?(p|br|li|div)\b[^>]*>/gi, ' ').replace(/<[^>]*>/g, ''),
	)
		.replace(/\s+/g, ' ')
		.trim();

// The directory's names carry a tagline after a dash or colon, too long for the card.
export const shortName = (name) =>
	name.split(/\s+[–—|-]\s+|:\s+/)[0].trim() || name;

export const canInstall = () =>
	Boolean(usePluginsStore.getState().plugins.canInstall);

// Imagify optimizes nothing without an account key, so it's only offered once one is set.
export const imagifyKey = () =>
	Boolean(window.extAgentXData?.facts?.['imagify-key']);

export const activePlugin = (slug) =>
	usePluginsStore
		.getState()
		.plugins.installed.find((plugin) => plugin.slug === slug && plugin.active);

export const searchPlugins = async ({ query }) => {
	const response = await fetch(
		addQueryArgs(SEARCH_URL, {
			action: 'query_plugins',
			request: {
				search: query,
				per_page: 6,
				// The directory reads the text "false" as true.
				fields: Object.fromEntries(UNUSED.map((field) => [field, 0])),
			},
		}),
	);
	if (!response.ok) {
		throw new Error(
			`wordpress.org answered the search with ${response.status}.`,
		);
	}
	const { plugins = [] } = await response.json();
	const { installed } = usePluginsStore.getState().plugins;
	const here = (slug) => installed.find((plugin) => plugin.slug === slug);
	return {
		// One already active is nothing to install, so the agent never offers it.
		plugins: plugins
			.filter(({ slug }) => !here(slug)?.active)
			.map((plugin) => ({
				slug: plugin.slug,
				name: shortName(plainText(plugin.name)),
				description: plainText(plugin.short_description),
				installs: Number(plugin.active_installs) || 0,
				rating: Number(plugin.rating) || 0,
				installed: Boolean(here(plugin.slug)),
			})),
	};
};

// WordPress builds the dashboard menu only on a dashboard page, which is where the plugin keeps its screens.
const loadDashboardPage = () =>
	apiFetch({
		url: `${window.extSharedData?.adminUrl ?? '/wp-admin/'}options-general.php`,
		parse: false,
	}).catch(() => {});

const refreshPlugins = async () => {
	await loadDashboardPage();
	const { storeGuide, screens, ...plugins } = await apiFetch({
		path: '/extendify/v1/agentx/plugins',
	});
	usePluginsStore.setState(plugins);
	useStoreGuideStore.setState({
		...storeGuide,
		available: Boolean(storeGuide),
	});
	if (screens) useScreensStore.setState({ screens });
};

// A plugin that changes nothing on the page passes refresh false: the reload reads as a fault.
export const installPlugin = async ({ slug, name, refresh = true }) => {
	const active = activePlugin(slug);
	if (active) {
		return {
			slug,
			name: active.name || name,
			alreadyActive: true,
			done: sprintf(
				// translators: %s is the name of a WordPress plugin. A finished step in the AI Agent's chat, when the plugin the user asked for was already installed and turned on.
				__('%s is already active', 'extendify-local'),
				active.name || name,
			),
		};
	}
	const plugin = await apiFetch({
		path: '/extendify/v1/agentx/install-plugin',
		method: 'POST',
		data: { slug },
	});
	// Unawaited: insights has no timeout, and the install already worked.
	recordPluginActivity({ slug: plugin.slug, source: 'ai-agent-v2' });
	if (refresh) await showSaved();
	// The install worked; a failed refresh only keeps its abilities, store guide and screens out until a reload.
	await refreshPlugins().catch(() => {});
	return {
		slug: plugin.slug,
		name: plugin.name,
		version: plugin.version,
		done: sprintf(
			// translators: %s is the name of a WordPress plugin. A finished step in the AI Agent's chat, after it installed the plugin and turned it on.
			__('Installed and activated %s', 'extendify-local'),
			plugin.name,
		),
	};
};

export const installCall = (name) => ({
	title: sprintf(
		// translators: %s is the name of a WordPress plugin. Shown in the AI Agent's chat while it installs the plugin the user picked.
		__('Installing %s', 'extendify-local'),
		name,
	),
	labels: {
		failed: sprintf(
			// translators: %s is the name of a WordPress plugin. A failed step in the AI Agent's chat, when installing the plugin the user picked didn't work.
			__("Couldn't install %s", 'extendify-local'),
			name,
		),
	},
});
