import { pageStepsOf, startPageStep } from '@agentx/chat/page-steps';
import { check, editBlock, save } from '@agentx/lib/draft';
import { expectAgentMove } from '@agentx/lib/page-in-view';
import { showSaved } from '@agentx/lib/settings';
import { showDraft } from '@agentx/lib/show-draft';
import { useDraftStore } from '@agentx/state/draft';
import { closeGutter, useGutterStore } from '@agentx/state/gutter';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import { addQueryArgs, hasQueryArg } from '@wordpress/url';
import { create } from 'zustand';

const siteFrame = () => document.getElementById('extendify-agentx-site');

// The server keeps a draft with this in the agent's own view, so loading it again stays in the agent.
export const agentPage = (url) =>
	hasQueryArg(url, 'preview')
		? addQueryArgs(url, { 'extendify-page-preview': 1 })
		: url;

// wp-admin has no site frame, so a page opens in the agent on the site.
export const agentAt = (url) =>
	addQueryArgs(agentPage(url), {
		'extendify-agent': 'open',
		'extendify-agent-chat': 'open',
	});

export const showInFrame = (url) => {
	const frame = siteFrame();
	expectAgentMove();
	if (frame) return frame.contentWindow.location.assign(agentPage(url));
	window.location.assign(agentAt(url));
};

// WordPress shows a page that isn't out yet only as a preview.
export const previewable = (link, status) =>
	['draft', 'pending', 'future'].includes(status)
		? addQueryArgs(link, { preview: 'true' })
		: link;

// The new page opens in the site at once, so the user sees what was made.
// Page Creator reads the site's globals as it loads, so it loads only when a page is made.
// A new page opens over this one, so its unsaved changes are saved first or no page is made.
const savedFirst = () =>
	new Promise((resolve) => {
		const answer = (saved) => {
			closeGutter();
			resolve(saved);
		};
		useGutterStore.setState({
			card: {
				text:
					// translators: Asked in the AI Agent's chat before it makes a new page while the page in view has changes not saved yet. Answered with Save and continue, or Cancel.
					__(
						'Save the changes on this page before I make the new one?',
						'extendify-local',
					),
				// translators: Button that saves the changes on the page in view, then lets the AI Agent make the new page.
				button: __('Save and continue', 'extendify-local'),
				onPress: async () => {
					closeGutter();
					await showDraft(save, { saving: true }).catch(() => null);
					resolve(!useDraftStore.getState().unsaved);
				},
				// translators: Button that keeps the changes on the page in view unsaved, and makes no new page.
				dismiss: __('Cancel', 'extendify-local'),
				onDismiss: () => answer(false),
				onClose: () => answer(false),
			},
		});
	});

export const createPage = async (
	{ title, description },
	{ toolCallId } = {},
) => {
	if (useDraftStore.getState().unsaved && !(await savedFirst())) {
		return {
			refused:
				'The user kept the changes on the page in view unsaved, so no page was made.',
		};
	}
	const step = (name) => startPageStep(toolCallId, name);
	const { makePage } = await import('@agentx/lib/make-page');
	const page = await makePage({ title, description }, step);
	const url = previewable(page.link, page.status);
	step('open');
	showInFrame(url);
	return {
		title: decodeEntities(page.title.rendered),
		url,
		status: page.status,
		steps: pageStepsOf(toolCallId),
	};
};

// The body class names the post a page shows, whatever its address.
const showsPost = (id) => {
	try {
		const { classList } = siteFrame().contentDocument.body;
		return (
			classList.contains(`page-id-${id}`) || classList.contains(`postid-${id}`)
		);
	} catch {
		return false;
	}
};

export const createPost = async (
	{ title, content, photo },
	{ toolCallId } = {},
) => {
	if (useDraftStore.getState().unsaved && !(await savedFirst())) {
		return {
			refused:
				'The user kept the changes on the page in view unsaved, so no post was made.',
		};
	}
	const step = (name) => startPageStep(toolCallId, name);
	const { makePost } = await import('@agentx/lib/make-post');
	const post = await makePost({ title, content, photo }, step);
	const url = previewable(post.link, post.status);
	step('open');
	showInFrame(url);
	const saved = decodeEntities(post.title.rendered);
	return {
		title: saved,
		url,
		status: post.status,
		steps: pageStepsOf(toolCallId),
		// Without it the closing line calls a draft published.
		done: `Saved the blog post “${saved}” as a draft, the way every new post is made`,
	};
};

// Unpublished or trashed, the page would show as a bare preview or a 404.
const showChanged = ({ id, after, url }) => {
	const frame = siteFrame();
	if (!frame) return;
	if (!showsPost(id)) return showSaved();
	const next = after === 'publish' ? url : window.extSharedData?.homeUrl;
	expectAgentMove();
	frame.contentWindow.location.assign(next || window.location.origin);
};

const refusal = (error) =>
	error?.data?.status >= 400 && error.data.status < 500
		? { refused: error.message }
		: null;

export const pageTarget = async (url) => {
	try {
		return await apiFetch({
			path: addQueryArgs('/extendify/v1/agentx/page-status', { url }),
		});
	} catch (error) {
		const refused = refusal(error);
		if (refused) return refused;
		throw error;
	}
};

// By id, so a card keeps up with a change made elsewhere in the chat.
export const usePagesStore = create(() => ({}));

export const setPageStatus = async (url, status) => {
	const changed = await apiFetch({
		path: '/extendify/v1/agentx/page-status',
		method: 'POST',
		data: { url, status },
	});
	usePagesStore.setState({
		[changed.id]: {
			status: changed.after,
			label: changed.labels.after,
			url: changed.url,
		},
	});
	await showChanged(changed);
	// A publish or unpublish is a row in the history, which this brings with its Undo.
	if ([changed.before, changed.after].includes('publish')) {
		await check().catch(() => {});
	}
	const { id, ...result } = changed;
	return result;
};

export const checkPages = ({ ids = [], urls = [] }) =>
	apiFetch({
		path: '/extendify/v1/agentx/pages/check',
		method: 'POST',
		data: { ids, urls },
	});

export const deletePage = async ({ id, menus }) => {
	const deleted = await apiFetch({
		path: '/extendify/v1/agentx/pages/delete',
		method: 'POST',
		data: { id, menus },
	});
	usePagesStore.setState({
		[deleted.id]: {
			status: deleted.after,
			label: deleted.labels.after,
			url: deleted.url,
		},
	});
	await showChanged(deleted);
	return deleted;
};

export const readTrash = () => apiFetch({ path: '/extendify/v1/agentx/trash' });

export const restorePage = async ({ id }) => {
	try {
		const restored = await apiFetch({
			path: '/extendify/v1/agentx/trash/restore',
			method: 'POST',
			data: { id },
		});
		usePagesStore.setState({
			[restored.id]: {
				status: restored.after,
				label: restored.labels.after,
				url: restored.url,
			},
		});
		await showChanged(restored);
		const { id: _id, ...result } = restored;
		return result;
	} catch (error) {
		const refused = refusal(error);
		if (refused) return refused;
		throw error;
	}
};

// A refusal is for the agent to explain; a failed request is tried again from the gutter.
export const changePageStatus = ({ url, status }) =>
	setPageStatus(url, status).catch((error) => {
		const refused = refusal(error);
		if (refused) return refused;
		throw error;
	});

// A page's name lives on the post, not in a block on the page, so the rename goes in by its link.
// The user named the page and what to call it, which is the change the draft asks to confirm,
// so it goes in confirmed; the draft is still theirs to take back like any other.
export const renamePage = async ({ url, title }) => {
	let refused = null;
	let renamed = false;
	await showDraft(async () => {
		const result = await editBlock(
			'rename',
			'',
			{ url, title, type: 'core/post-title' },
			{ confirmed: true },
		).catch((error) => {
			refused = refusal(error);
			if (!refused) throw error;
			return null;
		});
		renamed = Boolean(result?.changed?.length);
		return useDraftStore.getState();
	});
	return refused ?? { title: renamed ? title : '' };
};

// A refused page, like one held back for unsaved changes, made nothing to publish.
export const createdIn = (message) =>
	message?.parts.findLast(
		({ type, state, output }) =>
			type === 'tool-create-page' &&
			state === 'output-available' &&
			!output?.refused,
	)?.output;

const madePostIn = (message) =>
	message?.parts.findLast(
		({ type, state, output }) =>
			type === 'tool-create-post' &&
			state === 'output-available' &&
			!output?.refused,
	)?.output;

export const lastMadePost = (messages) =>
	messages.map(madePostIn).findLast(Boolean);

// Publishing the page runs in a reply of its own, which the menu offer after it still names.
export const lastMadePage = (messages) =>
	messages.map(createdIn).findLast(Boolean);

const STATUS_TOOLS = ['tool-set-page-status', 'tool-confirm-page-status'];

// Only a page publish carries inMenu, so an unpublish or a post never offers the menu.
export const pageForMenu = (messages) => {
	const change = messages
		.at(-1)
		?.parts.findLast(({ type }) => STATUS_TOOLS.includes(type));
	if (!change) return lastMadePage(messages);
	const { title, url, inMenu } = change.output ?? {};
	return inMenu === false ? { title, url } : undefined;
};
