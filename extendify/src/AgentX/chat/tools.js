import { CARDS } from '@agentx/chat/cards';
import { GUTTER } from '@agentx/chat/gutter';
import { INLINE } from '@agentx/chat/inline';
import { afterInstall } from '@agentx/chat/plugin-nudges';
import { abilityOf, asks, readOnly, runAbility } from '@agentx/lib/abilities';
import { BLOCK, centerBlock } from '@agentx/lib/block-box';
import { readChanges } from '@agentx/lib/draft';
import { editBlocks } from '@agentx/lib/edit-blocks';
import { leavesShell, pageUrl } from '@agentx/lib/follow-site';
import { lookUp } from '@agentx/lib/lookups';
import {
	outline,
	pageParts,
	pageSections,
	pageWords,
	readBlock,
	readBlocks,
} from '@agentx/lib/outline';
import { expectAgentMove } from '@agentx/lib/page-in-view';
import {
	agentPage,
	changePageStatus,
	checkPages,
	createPage,
	createPost,
	previewable,
	readTrash,
	renamePage,
	restorePage,
} from '@agentx/lib/pages';
import { blockById, containerOf, focusBlock } from '@agentx/lib/pick-block';
import { canInstall, installPlugin, searchPlugins } from '@agentx/lib/plugins';
import { replaceText } from '@agentx/lib/replace-text';
import { readDesign, readStyle, restyleSite } from '@agentx/lib/restyle';
import { revertChange } from '@agentx/lib/revert-change';
import { saveSetting } from '@agentx/lib/settings';
import { siteColors } from '@agentx/lib/site-colors';
import { currentImage } from '@agentx/lib/site-images';
import { useDraftStore } from '@agentx/state/draft';
import { revisePlan, showPlan, usePlanStore } from '@agentx/state/plan';
import { useSelectionStore } from '@agentx/state/selection';
import { useSettingsStore } from '@agentx/state/settings';
import { useStoreGuideStore } from '@agentx/state/store-guide';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { addQueryArgs } from '@wordpress/url';

const { leaveUrls = [] } = window.extAgentXData ?? {};
// A page that hasn't loaded by then still counts as shown.
const SHOW_MS = 15000;

const siteFrame = () => document.getElementById('extendify-agentx-site');

const loaded = (frame) =>
	new Promise((resolve) => {
		const done = () => {
			clearTimeout(timer);
			frame.removeEventListener('load', done);
			resolve();
		};
		const timer = setTimeout(done, SHOW_MS);
		frame.addEventListener('load', done);
	});

const currentPage = () => {
	const frame = siteFrame();
	try {
		return {
			title: frame.contentDocument.title,
			url: pageUrl(frame.contentWindow.location.href),
		};
	} catch {
		return { title: document.title, url: pageUrl(window.location.href) };
	}
};

const listOf = (type) =>
	addQueryArgs(`/wp/v2/${type}`, {
		per_page: 100,
		status: 'publish,draft,pending,private,future',
		_fields: 'title,link,status',
	});

const listed = ({ title, link, status }) => ({
	title: decodeEntities(title.rendered),
	url: previewable(link, status),
	status,
});

// A frame that left the site has no page of its own to list.
const pageBlocks = ({ kind } = {}) => {
	const doc = siteFrame()?.contentDocument;
	if (kind === 'words') return { words: doc ? pageWords(doc) : [] };
	if (kind === 'several') return { sections: doc ? pageSections(doc) : [] };
	if (kind === 'block' || kind === 'picture') {
		return { parts: doc ? pageParts(doc, kind) : [] };
	}
	return { blocks: doc ? outline(doc) : [] };
};

// Centered, not picked: a chip for the agent's own find would steer every later message.
// The page outline cuts blocks short, so the agent edits from this copy.
const selectFound = ({ id }) => {
	const doc = siteFrame()?.contentDocument;
	const element = doc ? blockById(doc, id) : null;
	if (!element) return { refused: true, code: 'not_found' };
	focusBlock(containerOf(element).getAttribute(BLOCK));
	centerBlock(element);
	const { focus } = useSelectionStore.getState();
	return { selected: focus.id, selection: { id: focus.id, html: focus.html } };
};

const drawPlan = (input, { toolCallId }) => {
	const running = usePlanStore.getState().plan?.toolCallId;
	// A rewrite that lands after its plan ended belongs to nothing that runs.
	if (input.revises) {
		if (input.revises === running) revisePlan(input);
	} else showPlan(toolCallId, input);
	return { shown: true };
};

// One user message is one History change, through every plan and retry it takes.
const requestTurn = () =>
	useDraftStore.getState().request?.id ??
	usePlanStore.getState().plan?.toolCallId;

// The tools the plugin runs; the backend has their descriptions and schemas.
const pluginTools = {
	// Its card waits on nothing, so the call ends at once.
	'adjust-colors': () => Promise.resolve({ shown: true }),
	'read-site': async () => {
		const [site, pages, posts, logo, icon] = await Promise.all([
			apiFetch({ path: '/?_fields=name,description' }),
			apiFetch({ path: listOf('pages') }),
			// A site can take posts out of the REST API, and pages still matter.
			apiFetch({ path: listOf('posts') }).catch(() => []),
			currentImage('logo').catch(() => null),
			currentImage('icon').catch(() => null),
		]);
		const short = (image) => image && { id: image.id, url: image.url };
		return {
			title: decodeEntities(site.name),
			tagline: decodeEntities(site.description),
			logo: short(logo),
			icon: short(icon),
			pages: pages.map(listed),
			posts: posts.map(listed),
			currentPage: currentPage(),
		};
	},
	'read-colors': async (input) =>
		siteColors(siteFrame()?.contentDocument, input),
	'read-design': readDesign,
	'read-style': readStyle,
	'restyle-site': restyleSite,
	'show-page': async ({ url }) => {
		const frame = siteFrame();
		if (!frame) return { shown: false, reason: 'The site is not on screen.' };
		let page;
		try {
			page = new URL(url, window.location.origin);
		} catch {
			return { shown: false, reason: 'That is not a page address.' };
		}
		if (
			page.origin !== window.location.origin ||
			leavesShell(page, leaveUrls)
		) {
			return { shown: false, reason: "Only the site's own pages show here." };
		}
		const arrived = loaded(frame);
		expectAgentMove();
		frame.contentWindow.location.assign(agentPage(page.href));
		await arrived;
		return { shown: true };
	},
	'update-setting': ({ setting, value }) => saveSetting(setting, value),
	'update-site-visibility': ({ visibility }) =>
		saveSetting('visibility', visibility),
	'update-search-indexing': ({ indexing }) => saveSetting('indexing', indexing),
	'update-canvas': ({ canvas }) => saveSetting('canvas', canvas ?? null),
	'create-page': createPage,
	'create-post': createPost,
	'set-page-status': changePageStatus,
	'rename-page': renamePage,
	'read-trash': readTrash,
	'check-pages': checkPages,
	'restore-page': restorePage,
	'search-plugins': searchPlugins,
	'install-plugin': async (input) => {
		const installed = await installPlugin(input);
		await afterInstall(installed).catch(() => {});
		return installed;
	},
	'look-up': lookUp,
	'find-text': ({ text, phones }) =>
		apiFetch({
			path: addQueryArgs(
				'/extendify/v1/agentx/find-text',
				phones ? { phones: 1 } : { text },
			),
		}),
	'edit-blocks': (input) => editBlocks({ ...input, turn: requestTurn() }),
	'read-changes': ({ ids = [] }) => readChanges(ids),
	'revert-change': revertChange,
	'replace-text': (input) => replaceText({ ...input, turn: requestTurn() }),
	'find-block': async (input) => pageBlocks(input),
	'read-blocks': (input) => {
		const doc = siteFrame()?.contentDocument;
		return Promise.resolve({ blocks: doc ? readBlocks(doc, input) : [] });
	},
	'read-block': ({ id }) => {
		const doc = siteFrame()?.contentDocument;
		return Promise.resolve(
			(doc && readBlock(doc, id)) ?? { refused: true, code: 'not_found' },
		);
	},
	'select-block': async (input) => selectFound(input),
	'show-plan': async (input, call) => drawPlan(input, call),
	'store-guide': () => {
		useStoreGuideStore.setState({ opening: true });
		return Promise.resolve({ opened: true });
	},
};

// A partner who turned a feature off gets no tool for it.
const offered = (setting) => setting in useSettingsStore.getState();

// The plugin draws these from the backend's call, so it lists them too.
const DRAWN = [
	...Object.keys(CARDS),
	...Object.keys(GUTTER),
	...Object.keys(INLINE),
];

const INSTALLS = ['install-plugin', 'choose-plugin'];

// Without the rights or a direct filesystem, the agent recommends a plugin in words only.
const listing = (name) =>
	INSTALLS.includes(name) && !canInstall()
		? { name, unavailable: { code: 'no-install', kind: 'cant' } }
		: { name };

const inSiteFrame = (name) =>
	siteFrame()
		? { name }
		: { name, unavailable: { code: 'no-site-frame', kind: 'not-here' } };

export const listedTools = () => [
	{ name: 'read-site' },
	{ name: 'read-colors' },
	inSiteFrame('read-design'),
	inSiteFrame('read-style'),
	inSiteFrame('show-page'),
	inSiteFrame('edit-blocks'),
	{ name: 'read-changes' },
	{ name: 'read-history' },
	{ name: 'find-text' },
	inSiteFrame('revert-change'),
	inSiteFrame('replace-text'),
	inSiteFrame('find-block'),
	inSiteFrame('read-blocks'),
	inSiteFrame('read-block'),
	inSiteFrame('select-block'),
	inSiteFrame('confirm-block'),
	{ name: 'update-setting' },
	{ name: 'set-page-status' },
	{ name: 'rename-page' },
	{ name: 'read-trash' },
	{ name: 'check-pages' },
	{ name: 'restore-page' },
	...(offered('visibility') ? [{ name: 'update-site-visibility' }] : []),
	...(offered('indexing') ? [{ name: 'update-search-indexing' }] : []),
	// Only while an effect shows, so nothing routes to one the site doesn't have.
	...(useSettingsStore.getState().canvas ? [{ name: 'update-canvas' }] : []),
	{ name: 'search-plugins' },
	listing('install-plugin'),
	{ name: 'look-up' },
	{ name: 'create-page' },
	{ name: 'create-post' },
	// No tool: it tells the backend a map can come from a link or an address, not only embed code.
	{ name: 'build-map' },
	// No tool: it tells the backend edit-blocks can hide or show the site title beside the logo.
	{ name: 'logo-title' },
	...(useStoreGuideStore.getState().available ? [{ name: 'store-guide' }] : []),
	// Parked for the Site Guide, so no workflow can open it.
	...DRAWN.filter((name) => name !== 'choose-layout')
		// It needs the site frame, so inSiteFrame lists it.
		.filter((name) => name !== 'confirm-block')
		.map(listing),
];

// An ability that asks waits in the gutter; a lost one still runs, to report it's gone.
export const runsHere = (name) =>
	name in pluginTools || (abilityOf(name) !== null && !asks(abilityOf(name)));

// Its answer comes from the user, in the gutter.
export const isCard = (name) =>
	name in CARDS ||
	name in GUTTER ||
	(abilityOf(name) !== null && asks(abilityOf(name)));

export const runTool = (name, input, call) =>
	name in pluginTools
		? pluginTools[name](input, call)
		: runAbility(abilityOf(name), input);

// The agent reads these results to go on: what it looked up, or the user's own words.
export const readsBack = (name, output) =>
	[
		'read-site',
		'read-colors',
		'read-design',
		'read-style',
		'restyle-site',
		'read-trash',
		'check-pages',
		'choose-page',
		'choose-many',
		'find-block',
		'read-blocks',
		'read-block',
		'read-changes',
		'select-block',
		'ask-question',
		'confirm-block',
		'ask-detailed-question',
		'ask-form',
		'search-plugins',
		'look-up',
		'find-text',
	].includes(name) ||
	(name === 'choose-plugin' && output?.answer !== undefined) ||
	// Other numbers a phone change left on the site go back to be checked and offered.
	(name === 'replace-text' && output?.others?.length > 0) ||
	(name === 'edit-blocks' && output?.confirm !== undefined) ||
	(abilityOf(name) !== null && readOnly(abilityOf(name)));
