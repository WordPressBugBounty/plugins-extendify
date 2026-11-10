import { CARDS } from '@agentx/chat/cards';
import { ADJUST_COLORS } from '@agentx/chat/color-turn';
import { shownValues } from '@agentx/chat/FormCard';
import { formAnswer, formInput, formOf, formText } from '@agentx/chat/forms';
import { FOLDING, INLINE, UNSEEN } from '@agentx/chat/inline';
import {
	isCard,
	listedTools,
	readsBack,
	runsHere,
	runTool,
} from '@agentx/chat/tools';
import { abilityNamed, abilityOf, readOnly } from '@agentx/lib/abilities';
import { abilityContext } from '@agentx/lib/ability-context';
import { siteFrame } from '@agentx/lib/block-box';
import { movedId } from '@agentx/lib/block-ids';
import { onCardChange, onCardFold } from '@agentx/lib/card-changes';
import { undoTo } from '@agentx/lib/draft-actions';
import { photosOnPage } from '@agentx/lib/library-photo';
import { lookups } from '@agentx/lib/lookups';
import { markActed } from '@agentx/lib/nudges';
import { blocksOnScreen, sectionsInOrder } from '@agentx/lib/outline';
import { pageInView } from '@agentx/lib/page-in-view';
import {
	blockById,
	focusBlock,
	outlineNow,
	partNow,
} from '@agentx/lib/pick-block';
import { installCall } from '@agentx/lib/plugins';
import { presetsOf } from '@agentx/lib/presets';
import { profileOf } from '@agentx/lib/profile';
import { isRow, ownSentence } from '@agentx/lib/row-cards';
import { coverWhile } from '@agentx/lib/switch-site';
import { followChat } from '@agentx/lib/track';
import { changesOf, lastChange, unsavedChanges } from '@agentx/lib/versions';
import { useBusinessStore } from '@agentx/state/business';
import { useDraftStore } from '@agentx/state/draft';
import {
	dropForm,
	formFor,
	minimizeForms,
	openForm,
	refillForms,
	restoreForm,
	useFormsStore,
} from '@agentx/state/forms';
import { useGuideStore } from '@agentx/state/guide';
import { closeGutter, takeHeld, useGutterStore } from '@agentx/state/gutter';
import { landAll } from '@agentx/state/landings';
import {
	idOf,
	madeIn,
	orderOf,
	planningWith,
	usePlanStore,
	wrapOf,
} from '@agentx/state/plan';
import { usePluginsStore } from '@agentx/state/plugins';
import { useQueueStore } from '@agentx/state/queue';
import { flagRun } from '@agentx/state/report';
import { useRunStore } from '@agentx/state/run';
import { useScreensStore } from '@agentx/state/screens';
import { useSelectionStore } from '@agentx/state/selection';
import { useSettingsStore } from '@agentx/state/settings';
import { useShellStore } from '@agentx/state/shell';
import { useStatusStore } from '@agentx/state/status';
import { clearTasks, takeTask } from '@agentx/state/tasks';
import { Chat } from '@ai-sdk/react';
import { AI_HOST } from '@constants';
import { digest } from '@shared/api/digest';
import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';
import {
	DefaultChatTransport,
	generateId,
	getToolName,
	isToolUIPart,
	lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';

const { siteId, partnerId, version, wpLanguage } = window.extSharedData ?? {};
const {
	variations = [],
	updateWordPress,
	updatePlugin,
	conversation: saved,
} = window.extAgentXData ?? {};
// The backend picks what the model sees from these.
const RECENT_MESSAGES = 50;

export const locked = Boolean(updateWordPress || updatePlugin);

// Kept for a retry, so a chosen workflow is sent again with the message.
let lastBody;
// A card's answer resumes the run with no body, so its request keeps what the run's message went with.
let sentWith = {};
// The draft version, pick and workflow the last request started on, for Try again.
let started = {};
// A retry's edits join its request's version, so only those past this count are new.
let startedHeld = 0;
// Set by Stop, so a plugin tool that finishes afterwards doesn't start the next request.
let stopped = false;
// A card's save while it runs, so a message sent meanwhile waits for it instead of skipping the card.
let answering = null;
// A typed message waiting on a card's save carries the answer, so it doesn't go alone.
let typing = false;
// A queued message follows a finished reply; only a skipped card leaves that turn unfinished.
let skipping = false;
// A message sent mid-run waits for these, since a result only lands on the last message.
const runningTools = new Set();
// Each tool running here, with what answers it at once, so Stop doesn't wait out its cap.
const giveUps = new Map();

const FINISHED = ['output-available', 'output-error'];

const OPEN = { open: true };

const wordsIn = (message) =>
	message.parts
		.filter(({ type }) => type === 'text')
		.map(({ text }) => text)
		.join(' ');

const lastStepOf = (message) =>
	message.parts.slice(
		message.parts.findLastIndex(({ type }) => type === 'step-start') + 1,
	);

// What didn't happen goes back, so the agent can say why.
const unmade = (part) =>
	part.state === 'output-error' ||
	Boolean(part.output?.refused) ||
	part.output?.shown === false;

// Only these change the site; the rest show, open, read or ask, like the store guide opening.
const CHANGES = [
	'edit-blocks',
	'replace-text',
	'revert-change',
	'update-setting',
	'update-site-visibility',
	'update-search-indexing',
	'update-canvas',
	'create-page',
	'create-post',
	'set-page-status',
	'rename-page',
	'restore-page',
	'install-plugin',
	'choose-setting',
	'edit-site-profile',
	'media-upload',
];

// A page card answers its own call, and only its button changes the page.
const ASKS_IN_GUTTER = ['confirm-page-status', 'confirm-delete'];

const changed = (part) => {
	const name = getToolName(part);
	const { skipped, open, canceled, typed, unchanged } = part.output ?? {};
	if (name === ADJUST_COLORS) return Boolean(part.output?.picked);
	if (ASKS_IN_GUTTER.includes(name)) return Boolean(part.output?.done);
	const ability = abilityOf(name);
	return (
		(CHANGES.includes(name) || (ability !== null && !readOnly(ability))) &&
		part.state === 'output-available' &&
		!readsBack(name, part.output) &&
		!unmade(part) &&
		!skipped &&
		!open &&
		!canceled &&
		!typed &&
		!unchanged
	);
};

// A plan's step counts as done only for a change it made: a step's picture, or any edit.
export const changedIn = (message) =>
	message.parts
		.filter(isToolUIPart)
		.some(
			(part) =>
				changed(part) ||
				(getToolName(part) === 'media-upload' &&
					part.state === 'output-available' &&
					Boolean(part.output?.image)),
		);

const editsIn = (message) =>
	message.parts.filter(
		(part) =>
			isToolUIPart(part) &&
			['edit-blocks', 'media-upload'].includes(getToolName(part)) &&
			part.state === 'output-available',
	);

// What each edit in a reply moved, in order, for the plan steps after it.
export const movesIn = (message) =>
	editsIn(message).flatMap((part) => part.output?.moved ?? []);

// Read through the moves of the reply's edits after it, so they match the ids movesIn left.
const settledIn = (message, key) => {
	const outputs = editsIn(message).map(({ output }) => output ?? {});
	return outputs.flatMap((output, at) => {
		const later = outputs.slice(at + 1).flatMap(({ moved = [] }) => moved);
		const settle = (id) =>
			later.reduce((now, ids) => now && movedId(now, ids), id);
		return (output[key] ?? []).map((made) =>
			typeof made === 'string'
				? settle(made)
				: { from: settle(made.from), to: settle(made.to) },
		);
	});
};

export const copiesIn = (message) =>
	settledIn(message, 'copies').filter(({ from, to }) => from && to);

export const addsIn = (message) => settledIn(message, 'added').filter(Boolean);

export const blockName = (id) => {
	const words = wordsOf(partNow(id)?.html);
	return words.length > 32 ? `${words.slice(0, 31).trimEnd()}…` : words;
};

// The line after a change starts by saying what was done.
export const endedOnChange = (message) =>
	lastStepOf(message).filter(isToolUIPart).some(changed);

// The plan a reply belongs to: its own, or the one its step, rewrite or typed message ran in.
const planOf = (message) =>
	message.metadata?.planStep?.plan ??
	message.metadata?.planEdit?.plan ??
	message.metadata?.duringPlan?.plan ??
	message.parts.find(({ type }) => type === 'tool-show-plan')?.toolCallId;

// These answer in words alone; every other workflow reaches for the page in some way.
const ANSWERS_ONLY = ['answer-questions', 'host-question', 'what-can-i-do'];

// Whether the run is working on the page, which the site's own toast says while it is.
// Before the pick lands there is no workflow, so a question never raises it.
export const touchesSite = (messages) => {
	const workflow = messages.findLast(({ role }) => role === 'assistant')
		?.metadata?.workflow;
	return Boolean(workflow) && !ANSWERS_ONLY.includes(workflow);
};

// A plan's closing line says what the whole plan did, as its steps ended.
const endedPlan = (message) => {
	const plan = planOf(message);
	const part = plan
		? conversation.messages
				.flatMap(({ parts }) => parts)
				.find(({ toolCallId }) => toolCallId === plan)
		: null;
	if (!part?.output?.ended) return null;
	const steps = part.output.steps ?? part.input?.steps ?? [];
	return {
		title: part.output.title ?? part.input?.title ?? '',
		steps: steps.map(({ title, state, why }) => ({
			title,
			state: state ?? 'pending',
			...(why && { why }),
		})),
	};
};

// A plan's closing line follows its last reply, but any of its steps may have made the change.
const planChanged = (message) => {
	const plan = planOf(message);
	return (
		Boolean(plan) &&
		conversation.messages.some(
			(each) =>
				each.role === 'assistant' &&
				each.metadata?.planStep?.plan === plan &&
				endedOnChange(each),
		)
	);
};

// Only results the agent reads go back; another model call would only repeat the rest.
// A skipped card's typed message goes instead, as does a Send now waiting on a tool.
export const goesOn = ({ messages }) => {
	const last = messages.at(-1);
	if (
		last?.role !== 'assistant' ||
		stopped ||
		typing ||
		useQueueStore.getState().afterTool
	) {
		return false;
	}
	const tools = lastStepOf(last)
		.filter(isToolUIPart)
		.filter((part) => runsHere(getToolName(part)) || isCard(getToolName(part)))
		// Going on from a form left open would loop, calling its tool again.
		.filter((part) => !part.output?.open)
		// The wrap-up's own color fix has no reply to go on to.
		.filter((part) => !part.input?.correction);
	if (tools.some((part) => part.output?.skipped)) return false;
	return (
		tools.some(
			(part) => readsBack(getToolName(part), part.output) || unmade(part),
		) && lastAssistantMessageIsCompleteWithToolCalls({ messages })
	);
};

const metadataOf = (call, messages) =>
	messages.find(({ parts }) =>
		parts.some(({ toolCallId }) => toolCallId === call),
	)?.metadata ?? {};

// A sent form leaves the store only after the request its answer starts.
const stillOpen = (call, messages) => {
	const output = messages
		.flatMap(({ parts }) => parts)
		.find(({ toolCallId }) => toolCallId === call)?.output;
	return !output || Boolean(output.open);
};

// An answered form stays in the store until its answer is saved.
export const formsStillOpen = (messages) =>
	useFormsStore
		.getState()
		.forms.filter(({ call }) => stillOpen(call, messages));

// The backend sends each message to the workflow whose form is still open.
const openForms = (messages) =>
	formsStillOpen(messages).map(({ tool, call, title, fields, edits }) => ({
		tool,
		workflow: metadataOf(call, messages).workflow,
		title,
		values: shownValues(fields, edits),
		edited: Object.keys(edits),
	}));

// A reply nothing would ever finish once the page reloads.
const unfinished = (messages) => {
	const last = messages.at(-1);
	if (last?.role !== 'assistant') return false;
	return (
		goesOn({ messages }) ||
		last.parts.some(
			(part) =>
				isToolUIPart(part) &&
				!FINISHED.includes(part.state) &&
				!(isCard(getToolName(part)) && part.state === 'input-available'),
		)
	);
};

// The request has ended while the plugin runs a tool, but the run hasn't.
export const runningIn = (last) =>
	last?.role === 'assistant' &&
	last.parts.some(
		(part) =>
			isToolUIPart(part) &&
			part.state === 'input-available' &&
			runsHere(getToolName(part)),
	);

// What the run is doing, the one answer the chat, the site lock and the reload mark read.
export const runOf = ({ messages, status }) => {
	const last = messages.at(-1);
	const requesting = status === 'submitted' || status === 'streaming';
	// The closing line comes after the work, so a reload during it loses nothing.
	const closing =
		requesting && last?.role === 'assistant' && wrappedUp.has(last.id);
	return {
		// A plugin tool's result about to go back is between requests, not the run's end.
		working:
			requesting ||
			runningIn(last) ||
			(status === 'ready' && goesOn({ messages })),
		closing,
		cut:
			Boolean(usePlanStore.getState().plan) ||
			status === 'error' ||
			(requesting && !closing) ||
			unfinished(messages),
	};
};

// Drawn by the plugin alone, so the model never sees it.
const isGuide = ({ parts }) => parts.some(({ type }) => type === 'data-guide');

const isProactive = ({ parts }) =>
	parts.some(({ type }) => type === 'data-proactive');

// The server's note where a reload cut a run off, drawn by the plugin alone.
const isInterrupted = ({ parts }) =>
	parts.some(({ type }) => type === 'data-interrupted');

// Most of a chat's size, and only the reply that ran the lookup reads it back.
const LOOKUPS = [
	'find-block',
	'select-block',
	'read-part',
	'read-blocks',
	'read-block',
	'read-colors',
	'read-design',
	'read-style',
];

const withoutLookups = (part) =>
	isToolUIPart(part) &&
	part.state === 'output-available' &&
	LOOKUPS.includes(getToolName(part))
		? { ...part, output: { omitted: true } }
		: part;

// A nudge reaches the agent only on the message a click sends, in its metadata.
const withoutNudges = (messages) =>
	messages.map((message) => ({
		...message,
		parts: message.parts.filter(({ type }) => type !== 'data-nudge'),
	}));

const lookupsOnlyIn = (messages, kept) =>
	messages.map((message) =>
		message === kept || message.role !== 'assistant'
			? message
			: { ...message, parts: message.parts.map(withoutLookups) },
	);

// The backend keeps the abilities under this hash, so they go in full only once.
export const keyOf = (value) => {
	const text = JSON.stringify(value ?? []);
	let first = 0xdeadbeef;
	let second = 0x41c6ce57;
	for (let at = 0; at < text.length; at++) {
		const code = text.charCodeAt(at);
		first = Math.imul(first ^ code, 2654435761);
		second = Math.imul(second ^ code, 1597334677);
	}
	first =
		Math.imul(first ^ (first >>> 16), 2246822507) ^
		Math.imul(second ^ (second >>> 13), 3266489909);
	second =
		Math.imul(second ^ (second >>> 16), 2246822507) ^
		Math.imul(first ^ (first >>> 13), 3266489909);
	return (4294967296 * (2097151 & second) + (first >>> 0)).toString(36);
};

let heldKey = null;

// The backend's copy of the abilities ran out, so this request goes again in full.
export const sendWithAbilities = async (url, init, send = fetch) => {
	const response = await send(url, init);
	if (response.status !== 409) return response;
	const answer = await response
		.clone()
		.json()
		.catch(() => null);
	if (answer?.status !== 'abilities-missing') return response;
	const { abilities } = usePluginsStore.getState();
	const body = { ...JSON.parse(init.body), abilities };
	heldKey = body.abilitiesKey;
	return send(url, { ...init, body: JSON.stringify(body) });
};

// One per page load, since switching layouts remounts the panel.
// The server cuts a run a reload left unfinished, so the saved chat opens as it is.
export const conversation = new Chat({
	id: saved?.id ?? undefined,
	messages: saved?.messages ?? [],
	transport: new DefaultChatTransport({
		api: `${AI_HOST}/api/agentx`,
		// The AI SDK's own error keeps the body but drops the status.
		fetch: async (url, init) => {
			const response = await sendWithAbilities(url, init);
			if (response.ok) return response;
			throw Object.assign(new Error(await response.text()), {
				status: response.status,
			});
		},
		prepareSendMessagesRequest: ({ id, messages, body }) => {
			// Every sender's request is built here, so none can skip the lock.
			if (locked) throw new Error('The chat is locked until an update.');
			// A tool's result goes back mid-run, so only a new message starts the line over.
			const asked = messages.findLast(({ role }) => role === 'user')?.id;
			if (messages.at(-1)?.role === 'user') {
				useStatusStore.getState().clear();
				stopped = false;
				typing = false;
				skipping = false;
				// A close call's choice resends the same message, which would otherwise lose its part.
				const again = sentWith.id === asked ? sentWith : {};
				sentWith = {
					id: asked,
					selection: body?.selection ?? again.selection ?? null,
					focus: body?.focus ?? again.focus ?? null,
					task: body?.task ?? false,
					around: body?.around ?? null,
				};
				// A plan's steps belong to the run its request started.
				if (!usePlanStore.getState().plan) {
					const { current, versions } = useDraftStore.getState();
					startedHeld =
						versions.find(({ id }) => id === current)?.changed?.length ?? 0;
					started = {
						version: current,
						selection: body?.selection?.id ?? null,
						workflow: body?.workflow ?? null,
					};
				}
				// What a wrap-up sent back is the same request, so an undo of it reaches both runs.
				if (
					!usePlanStore.getState().plan &&
					!messages.at(-1).metadata?.replan
				) {
					useDraftStore.setState({
						request: { id: asked, asked: wordsIn(messages.at(-1)) },
					});
				}
			}
			const run = sentWith.id === asked ? sentWith : {};
			const selection = body?.selection ?? run.selection ?? null;
			const focus = body?.focus ?? run.focus ?? null;
			lastBody = body;
			const { abilities, plugins, summary } = usePluginsStore.getState();
			const { screens } = useScreensStore.getState();
			const abilitiesKey = keyOf(abilities);
			const held = abilitiesKey === heldKey;
			heldKey = abilitiesKey;
			const draft = useDraftStore.getState();
			const recent = messages
				.filter(
					(message) =>
						!isGuide(message) &&
						!isInterrupted(message) &&
						!isProactive(message),
				)
				.slice(-RECENT_MESSAGES);
			// The backend reads lookups only from the reply still running, and a closing line reads none.
			const running =
				recent.at(-1)?.role === 'assistant' && !body?.wrapUp
					? recent.at(-1)
					: null;
			return {
				body: {
					id,
					messages: withoutNudges(lookupsOnlyIn(recent, running)),
					siteId,
					partnerId,
					tools: listedTools(),
					metadata: { version },
					unsaved: unsavedChanges(draft, variations),
					lastChange: lastChange(draft, variations),
					changes: changesOf(draft, variations),
					settings: useSettingsStore.getState(),
					profile: profileOf(),
					business: useBusinessStore.getState(),
					page: pageInView() ?? null,
					summary,
					lookups: lookups(),
					presets: presetsOf(),
					workflow: body?.workflow,
					locale: wpLanguage,
					...(!held && { abilities }),
					abilitiesKey,
					abilityContext: abilityContext(selection),
					openForms: openForms(messages),
					sentForm: body?.sentForm,
					selection,
					focus,
					around: body?.around ?? run.around ?? null,
					// What the user sees is where a block edit looks first, and "the text on screen" names it.
					onScreen: blocksOnScreen(),
					sections: sectionsInOrder(),
					photos: photosOnPage(),
					task: body?.task ?? run.task ?? false,
					wrapUp: body?.wrapUp,
					...(useShellStore.getState().phone && { phone: true }),
					...(window.extSharedData?.adminUrl && {
						adminUrl: window.extSharedData.adminUrl,
					}),
					...(screens.length && { screens }),
					plugins: {
						installed: plugins.installed,
						recommended: plugins.recommended,
					},
				},
			};
		},
	}),
	onData: ({ type, data }) => {
		if (type === 'data-status') useStatusStore.getState().show(data);
		if (type === 'data-planning') planningWith(data);
	},
	// Not awaited: the request that made the call is still open, so it would wait on itself.
	onToolCall: ({ toolCall }) => {
		if (runsHere(toolCall.toolName)) runHere(toolCall);
		else drawForm(toolCall);
	},
	sendAutomaticallyWhen: goesOn,
	// Otherwise a reply that failed or was stopped before any text stays as an empty answer.
	onFinish: ({ message, isError, isAbort }) => {
		if (message.metadata?.flagged) flagRun(message.id);
		if (!isError && !isAbort) return;
		// The step stands as the reply, and the user never sees the wrap-up fail.
		if (isError && wrappedUp.has(message.id)) {
			conversation.clearError();
			return;
		}
		// A finished step records a saved change, and a running one's result lands here.
		const kept = message.parts.some(
			(part) =>
				part.type === 'text' ||
				(isToolUIPart(part) &&
					(FINISHED.includes(part.state) ||
						(part.state === 'input-available' && runsHere(getToolName(part))))),
		);
		if (kept) return;
		dropFormsOf(message.parts);
		conversation.messages = conversation.messages.filter(
			({ id }) => id !== message.id,
		);
	},
});

followChat(() => conversation.id);

// Only the ids, the rating and the comment leave the site, and a failure never reaches the user.
export const sendFeedback = (feedback) =>
	fetch(`${AI_HOST}/api/agentx/feedback`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			siteId,
			partnerId,
			chatId: conversation.id,
			...feedback,
		}),
	})
		.then((response) => {
			if (!response.ok) throw response;
		})
		.catch((error) =>
			digest({ error, details: { source: 'agentx', caller: 'feedback' } }),
		);

// The whole chat goes, so the team sees what the user saw; a failure never reaches the user.
export const sendReport = () => {
	const traceId = conversation.messages.findLast(
		({ metadata }) => metadata?.traceId,
	)?.metadata.traceId;
	return fetch(`${AI_HOST}/api/agentx/report`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			siteId,
			partnerId,
			sessionId: conversation.id,
			version,
			...(traceId && { traceId }),
			messages: conversation.messages,
		}),
	})
		.then(async (response) => {
			if (!response.ok) throw response;
			return (await response.json()).id ?? null;
		})
		.catch((error) => {
			digest({ error, details: { source: 'agentx', caller: 'report' } });
			return null;
		});
};

// Written after the chat went, so it waits for that report's id.
export const sendReportComment = (report, comment) =>
	report
		.then(
			(id) =>
				id &&
				fetch(`${AI_HOST}/api/agentx/report`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id, siteId, comment }),
				}).then((response) => {
					if (!response.ok) throw response;
				}),
		)
		.catch((error) =>
			digest({ error, details: { source: 'agentx', caller: 'report' } }),
		);

// A form outliving its call can't be answered, and a retried call would open a second one.
const dropFormsOf = (parts) => {
	for (const { toolCallId } of parts) {
		const form = toolCallId && formFor(toolCallId);
		if (form) dropForm(form.id);
	}
};

const finishedTool = (part) =>
	isToolUIPart(part) && FINISHED.includes(part.state);

// A reply cut off after a finished step resumes from it, so the step and its result stay.
const resumable = (message) => {
	const done = message.parts.findLastIndex(finishedTool);
	if (done < 0) return null;
	const at = message.parts.findIndex(
		(part, index) => index > done && part.type === 'step-start',
	);
	return at < 0 ? null : { ...message, parts: message.parts.slice(0, at) };
};

export const retry = () => {
	// A click and the browser coming back online can both ask at once.
	if (conversation.status !== 'error') return;
	stopped = false;
	const last = conversation.messages.at(-1);
	const trimmed = last?.role === 'assistant' && resumable(last);
	if (trimmed) {
		dropFormsOf(last.parts.slice(trimmed.parts.length));
		conversation.messages = [...conversation.messages.slice(0, -1), trimmed];
	}
	// Regenerating would run its tools again, and a save would then record itself as its own before.
	if (
		lastAssistantMessageIsCompleteWithToolCalls({
			messages: conversation.messages,
		})
	) {
		return conversation.sendMessage(undefined, { body: lastBody });
	}
	const redone = conversation.messages.at(-1);
	if (redone?.role === 'assistant') dropFormsOf(redone.parts);
	return conversation.regenerate({ body: lastBody });
};

export const stopRun = () => {
	stopped = true;
	// Stop keeps the queued message for the user, even one Send now was holding.
	useQueueStore.setState({ afterTool: false });
	for (const giveUp of giveUps.values()) giveUp();
	return conversation.stop();
};

// Unlike the chat box's Stop, the plan still gets its closing line.
// A step stopped before its reply began leaves only its hidden message, which no wrap-up can answer.
export const stopStep = () => {
	const stopping = conversation.stop();
	const last = conversation.messages.at(-1);
	if (last?.role === 'user' && last.metadata?.planStep) {
		conversation.messages = conversation.messages.slice(0, -1);
	}
	return stopping;
};

// A page that never fires its load event left show-page unsettled, which held the
// turn open with no way out and blocked every message sent after it.
const CAP_MS = 90 * 1000;

const runHere = ({ toolName, toolCallId, input }) => {
	const tool = { tool: toolName, toolCallId };
	const failed = (errorText) => ({ ...tool, state: 'output-error', errorText });
	let timer = null;
	let answer = null;
	const given = new Promise((resolve) => {
		answer = resolve;
		timer = setTimeout(
			() =>
				resolve(failed(`${toolName} took too long, so it was given up on.`)),
			CAP_MS,
		);
	});
	const running = Promise.race([
		runTool(toolName, input, { toolCallId }).then(
			(output) => ({ ...tool, output }),
			// The model reads the error and tells the user, so the turn never ends silently.
			(error) => failed(error?.message || String(error)),
		),
		given,
	])
		.then((result) => conversation.addToolOutput(result))
		.finally(() => {
			clearTimeout(timer);
			giveUps.delete(running);
			runningTools.delete(running);
		});
	giveUps.set(running, () => answer(failed(`${toolName} was stopped.`)));
	runningTools.add(running);
	return running;
};

export const endedWell = () => !stopped && conversation.status !== 'error';

// The agent's pick names one of the nudges sent, so they stay with the reply.
const wrappedUp = new Map();

// A no to the agent's guess at a block leaves the user picking it, not reading a wrap-up.
const pickingInstead = (part) =>
	isToolUIPart(part) &&
	getToolName(part) === 'confirm-block' &&
	part.output?.answer === 'no';

const colorsCard = (message) =>
	lastStepOf(message).find(
		(part) => isToolUIPart(part) && getToolName(part) === ADJUST_COLORS,
	);

// The closing line waits for the colors card's Continue; a typed message moves past it.
export const colorsOpen = (message) =>
	Boolean(colorsCard(message)) && !colorsCard(message).output?.continued;

// A card the user hasn't answered holds the line; a plan's Stop asks for it.
const waitsOnCard = (part) =>
	isToolUIPart(part) &&
	getToolName(part) in INLINE &&
	getToolName(part) !== 'show-plan' &&
	part.state !== 'output-available';

// A failed or refused run already said why; a restored reply ended long ago.
// A card closed by a button still gets its line; typing over one sends a message instead (sendWrapUp).
export const wrapsUp = (message) =>
	Boolean(message.metadata?.wrapUp) &&
	!wrappedUp.has(message.id) &&
	!colorsOpen(message) &&
	(Boolean(colorsCard(message)?.output?.continued) ||
		(message.id !== loadedLast?.id &&
			!lastStepOf(message).some(
				(part) => waitsOnCard(part) || pickingInstead(part),
			) &&
			// A plan step ended not done carries its reason, which only the closing line says.
			(Boolean(message.metadata?.planStep?.notDone) ||
				!message.parts.some((part) => isToolUIPart(part) && unmade(part)))));

export const nudgesSent = (message) => wrappedUp.get(message.id);

const changedSinceStart = () => {
	const { versions } = useDraftStore.getState();
	const from = versions.findIndex(({ id }) => id === started.version);
	const joined = versions[from];
	return [
		...(joined && !joined.undone && !joined.dropped
			? (joined.changed ?? []).slice(startedHeld)
			: []),
		...versions
			.slice(from + 1)
			.filter(({ undone, dropped }) => !undone && !dropped)
			.flatMap(({ changed = [] }) => changed),
	];
};

// A restored reply's run predates the page load, so its renames are long done.
export const renamedBy = (message) => {
	if (message.id === loadedLast?.id || !('version' in started)) return [];
	return changedSinceStart().filter(({ op, url }) => op === 'title' && url);
};

// A restored reply lined its tasks up before the page loaded.
export const linesUpTasks = (message) =>
	Boolean(message.metadata?.tasks?.length) && message.id !== loadedLast?.id;

// Steps and cards draw as no words of the agent's, so a card after them has no line above it.
export const endsInWords = (message) => {
	const step = lastStepOf(message);
	const tool = step.findLastIndex(
		(part) => isToolUIPart(part) && !UNSEEN.includes(getToolName(part)),
	);
	return step
		.slice(tool + 1)
		.some(
			(part) =>
				(part.type === 'text' && part.text.trim()) ||
				(part.type === 'data-nudge' && Boolean(part.data?.lead)),
		);
};

// A run that ended on a step or a card never wrote the line a queued task's row sits under.
export const owesLine = (message) =>
	message.id !== loadedLast?.id &&
	!wrappedUp.has(message.id) &&
	!endsInWords(message);

// A page card puts its question in the gutter a moment after its run ends.
export const asksFirst = (message) =>
	Boolean(useGutterStore.getState().card) ||
	lastStepOf(message).some(
		(part) =>
			isToolUIPart(part) &&
			ASKS_IN_GUTTER.includes(getToolName(part)) &&
			!part.output?.asked &&
			!part.output?.done &&
			!part.output?.canceled,
	);

export const offersFollowUps = (message) =>
	Boolean(message.metadata?.followUps?.length) && message.id !== loadedLast?.id;

// A restored reply asked before the page loaded, so it doesn't start picking.
export const asksToPick = (message) =>
	message.metadata?.edit?.asks === 'select' && message.id !== loadedLast?.id;

const sent = (suggestion) =>
	suggestion && {
		id: suggestion.id,
		text: suggestion.text,
		...(suggestion.context && { context: suggestion.context }),
		...(suggestion.asked && { asked: true }),
		...(isRow(suggestion) && {
			row: true,
			...(ownSentence(suggestion) && { says: ownSentence(suggestion) }),
		}),
	};

const endedIn = (message, how) => {
	const named = usePlanStore.getState()[how];
	return Boolean(named) && planOf(message) === named;
};

// What a reply's first wrap-up said of its run, which a later wrap-up of it keeps.
const wrapping = new Map();
const replans = new Set();

const MOST_ENDED_PARTS = 12;
const MOST_ENDED_SECTIONS = 4;
// A whole-page wrapper would crowd the request; its parts still go.
const MOST_SECTION_HTML = 30000;

const changedBlocks = () => {
	const blocks = changedSinceStart().map(({ block }) => block);
	return [...new Set(blocks)].filter(Boolean);
};

// The blocks the run changed, as the site shows them once it ended, for the wrap-up's checks.
const endedParts = (blocks) =>
	blocks.map(partNow).filter(Boolean).slice(0, MOST_ENDED_PARTS);

const sectionOf = (id) => {
	const split = id.lastIndexOf(':');
	return `${id.slice(0, split)}:${id.slice(split + 1).split('.')[0]}`;
};

// The changed parts alone hid an FAQ's old questions and the new ones shown twice.
const endedSections = (blocks) =>
	[...new Set(blocks.map(sectionOf))]
		.map(outlineNow)
		.filter((section) => section && section.html.length <= MOST_SECTION_HTML)
		.slice(0, MOST_ENDED_SECTIONS);

// The run's own request, not a step's hidden message, says whether a wrap-up sent it back already.
const requestOf = () =>
	conversation.messages.findLast(
		({ role, metadata }) =>
			role === 'user' &&
			!metadata?.planStep &&
			!metadata?.planEdit &&
			!metadata?.duringPlan,
	);

// A message the user already sent takes the turn instead.
export const sendWrapUp = (message, { offered, named }) => {
	if (typing || waiting !== null || requesting()) return false;
	const { text, closingFirst } = useQueueStore.getState();
	if (text && !closingFirst) return false;
	const ran = wrapping.get(message.id) ?? {
		changed: endedOnChange(message) || planChanged(message),
		...(endedIn(message, 'stopped') && { stopped: true }),
		...(endedPlan(message) && { plan: endedPlan(message) }),
	};
	wrappedUp.set(message.id, offered);
	wrapping.set(message.id, ran);
	const changed = changedBlocks();
	const parts = endedParts(changed);
	const sections = endedSections(changed);
	// Set at once, or Autosave saves before the check's edits can join the request's change.
	useRunStore.setState({ working: true });
	conversation.sendMessage(undefined, {
		body: {
			wrapUp: {
				...ran,
				nudges: named.map(({ id, placeholder, inline, gutter }) => ({
					id,
					placeholder: sent(placeholder),
					inline: sent(inline),
					gutter: sent(gutter),
				})),
				...(parts.length && { parts }),
				...(sections.length && { sections }),
				...(requestOf()?.metadata?.replan && { replanned: true }),
			},
		},
	});
	return true;
};

// What the wrap-up found the run left undone, which goes to plan mode once.
export const replanIn = (message) =>
	replans.has(message.id)
		? null
		: (lastStepOf(message).find(({ type }) => type === 'data-replan')?.data
				?.ask ?? null);

// A re-plan sees only its selection: on the part first picked, a missing form went inside the hero, not under the new heading.
const addedLast = () => {
	const asked = conversation.messages.indexOf(requestOf());
	return conversation.messages
		.slice(asked + 1)
		.filter(({ role }) => role === 'assistant')
		.flatMap(addsIn)
		.at(-1);
};

export const sendReplan = (message, ask) => {
	if (typing || waiting !== null || requesting()) return false;
	replans.add(message.id);
	const added = addedLast();
	const part =
		(added && partNow(sectionOf(added))) ??
		partNow(started.selection ?? useSelectionStore.getState().focus?.id);
	// Plan mode reads why; final means say it can't.
	const { why, final } =
		lastStepOf(message).find(({ type }) => type === 'data-replan')?.data ?? {};
	useRunStore.setState({ working: true });
	conversation.sendMessage(
		{
			text: ask,
			metadata: {
				replan:
					why || final
						? { ...(why && { why }), ...(final && { final }) }
						: true,
			},
		},
		{
			// Page editing can't do what another workflow left, like a post's body.
			body: {
				workflow: message.metadata?.workflow,
				...(part && { selection: part }),
			},
		},
	);
	return true;
};

export const skippingCard = () => skipping;

const pendingCards = (messages) => {
	const last = messages.at(-1);
	if (last?.role !== 'assistant') return [];
	return last.parts.filter(
		(part) =>
			isToolUIPart(part) &&
			isCard(getToolName(part)) &&
			part.state === 'input-available',
	);
};

export const pendingCard = (messages) => pendingCards(messages)[0];

// They ask nothing the typed words could answer, so each closes as turned down instead.
const TYPED_PAST = {
	'open-page': { dismissed: true },
	'confirm-delete': { canceled: true },
	'confirm-page-status': { canceled: true },
};

// A page question under the reply was answered when it showed, so typing past turns it down in its output.
const pageAsksTypedPast = (messages) => {
	const last = messages.at(-1);
	if (last?.role !== 'assistant') return [];
	return last.parts.filter(
		(part) =>
			part.type === 'tool-confirm-page-status' &&
			part.state === 'output-available' &&
			part.input?.status !== 'trash' &&
			!part.output?.done &&
			!part.output?.canceled,
	);
};

const cardsTypedPast = (messages) => {
	const last = messages.at(-1);
	if (last?.role !== 'assistant') return [];
	return last.parts.filter(
		(part) =>
			isToolUIPart(part) &&
			Object.hasOwn(TYPED_PAST, getToolName(part)) &&
			part.state === 'input-available',
	);
};

// An unanswered card holds the turn; hidden tools and cards left open for picks never answer once.
export const holdingCard = (messages) => {
	const last = messages.at(-1);
	if (last?.role !== 'assistant') return undefined;
	return lastStepOf(last).find(
		(part) =>
			waitsOnCard(part) &&
			!UNSEEN.includes(getToolName(part)) &&
			!FOLDING.includes(getToolName(part)),
	);
};

// Two forms from one step wait at once, and either can be sent first.
const pendingCall = (call) =>
	pendingCards(conversation.messages).find(
		({ toolCallId }) => toolCallId === call,
	);

const answerWith = (card, output) =>
	conversation.addToolOutput({
		tool: getToolName(card),
		toolCallId: card.toolCallId,
		output,
	});

const callParts = (tool, toolCallId, { input, title, labels }) => [
	{ type: `tool-${tool}`, toolCallId, state: 'input-available', input, title },
	{ type: 'data-step', id: toolCallId, data: labels },
];

// The pick installs as a step of the same reply, and only a failure goes back.
const install = ({ slug, name }) => {
	const last = conversation.messages.at(-1);
	const call = generateId();
	const input = { slug, name };
	conversation.messages = [
		...conversation.messages.slice(0, -1),
		{
			...last,
			parts: [
				...last.parts,
				...callParts('install-plugin', call, { input, ...installCall(name) }),
			],
		},
	];
	runHere({ toolName: 'install-plugin', toolCallId: call, input });
};

// Calls in one step each get a form, or one would wait with nothing on screen.
const answeredOpen = (call) => {
	const ofCall = ({ toolCallId }) => toolCallId === call;
	if (lastStepOf(conversation.messages.at(-1)).some(ofCall)) return false;
	return conversation.messages.some(({ parts }) =>
		parts.some((part) => ofCall(part) && part.output?.open),
	);
};

// A second call for an open form fills it in, and hears that it's still open.
const drawForm = ({ toolName, toolCallId, input }) => {
	const form = formOf({ type: `tool-${toolName}`, toolCallId, input });
	if (form && openForm(form, answeredOpen)) {
		conversation.addToolOutput({ tool: toolName, toolCallId, output: OPEN });
	}
};

// A step added while a reply streams would be lost to the stream's next write.
const whenIdle = (then) => {
	if (!useRunStore.getState().working) {
		then();
		return;
	}
	const stop = useRunStore.subscribe(({ working }) => {
		if (working) return;
		stop();
		then();
	});
};

export const idle = () => new Promise((resolve) => whenIdle(resolve));

// Saved with the conversation, so an inline card that ended stays ended after a reload.
// markOutput leaves the call waiting; this ends it, so a held turn reaches its closing line.
export const finishCall = (toolCallId, output) =>
	whenIdle(() => {
		const part = conversation.messages
			.at(-1)
			?.parts.find((each) => each.toolCallId === toolCallId);
		if (!part || part.state === 'output-available') return;
		answerWith(part, output);
	});

export const markOutput = (toolCallId, fields) =>
	whenIdle(() => {
		const ofCall = (part) => part.toolCallId === toolCallId;
		conversation.messages = conversation.messages.map((message) =>
			message.parts.some(ofCall)
				? {
						...message,
						parts: message.parts.map((part) =>
							ofCall(part)
								? { ...part, output: { ...part.output, ...fields } }
								: part,
						),
					}
				: message,
		);
	});

// Written as the run ends, so the wrap-up a stop asks for carries it.
// The steps go with it, since plan edit may have rewritten the ones the call shows.
export const markPlanEnded = (toolCallId, ended, steps, titles = {}) =>
	markOutput(toolCallId, {
		ended,
		...(titles.title && { title: titles.title }),
		...(titles.titleDone && { titleDone: titles.titleDone }),
		...(steps && {
			steps: steps.map((step) => {
				const { id, title, state, why, already } = step;
				// The closing line says what the part already had, never that the step made it.
				if (state === 'done' && !madeIn(step)) {
					return { id, title, state: 'canceled', why: already };
				}
				return {
					id,
					title,
					state:
						state === 'running'
							? ended === 'completed'
								? 'done'
								: 'canceled'
							: state,
					...(why && { why }),
				};
			}),
		}),
	});

const callLabels = (call) => {
	const parts = conversation.messages.flatMap(({ parts }) => parts);
	return {
		title: parts.find((part) => part.toolCallId === call)?.title,
		labels: parts.find(({ type, id }) => type === 'data-step' && id === call)
			?.data,
	};
};

// Without the form's workflow, the backend reads the step as a new request.
const stepOf = (form, call, input, answer) => {
	const { workflow, since } = metadataOf(form.call, conversation.messages);
	const called = callLabels(form.call);
	const [part, labels] = callParts(form.tool, call, {
		input,
		title: called.title,
		// A form opened outside a reply has no call to take its labels from.
		labels: called.labels ?? form.labels,
	});
	return {
		id: generateId(),
		role: 'assistant',
		metadata: { workflow, since },
		parts: [{ type: 'step-start' }, { ...part, ...answer }, labels],
	};
};

// The agent reads history from the user's last message on, so a failed step waits to go last.
const unread = [];

// Appended after a pending reply, the step would hide its card or be dropped by a regenerate.
const addStep = async (form, input, output) => {
	const call = generateId();
	const { messages } = conversation;
	if (answering || requesting() || pendingCard(messages)) {
		if (unmade({ output })) {
			unread.push([form, input, output]);
			return;
		}
		const at = messages.findLastIndex(({ role }) => role === 'user');
		const done = { state: 'output-available', output };
		conversation.messages = [
			...messages.slice(0, at),
			stepOf(form, call, input, done),
			...messages.slice(at),
		];
		return;
	}
	conversation.messages = [...messages, stepOf(form, call, input)];
	await conversation.addToolOutput({
		tool: form.tool,
		toolCallId: call,
		output,
	});
};

// A change made on a card shows as a finished step the agent reads next time, and sends nothing itself.
const CARD_CHANGE = 'card-change';

const isCardStep = ({ parts }) =>
	parts.some(({ type }) => type === `tool-${CARD_CHANGE}`) &&
	parts.every(({ type }) =>
		['step-start', `tool-${CARD_CHANGE}`].includes(type),
	);

// Only typing past or closing a nudge ends it; a pick on a card doesn't.
export const nudgedOf = (messages) =>
	messages.findLast((message) => !isCardStep(message));

const stepOfChange = async ({ kind, done, image }) => {
	await idle();
	const { messages } = conversation;
	const part = {
		type: `tool-${CARD_CHANGE}`,
		toolCallId: generateId(),
		state: 'output-available',
		input: { kind },
		output: { done, ...(image && { image }) },
	};
	const step = {
		id: generateId(),
		role: 'assistant',
		metadata: {},
		parts: [{ type: 'step-start' }, part],
	};
	// A new message would end the card's wait: pendingCards reads only the last.
	const waiting = pendingCard(messages);
	if (waiting) {
		const holder = messages.at(-1);
		const at = holder.parts.indexOf(waiting);
		conversation.messages = [
			...messages.slice(0, -1),
			{
				...holder,
				parts: [
					...holder.parts.slice(0, at + 1),
					part,
					...holder.parts.slice(at + 1),
				],
			},
		];
		return;
	}
	if (answering) {
		const at = messages.findLastIndex(({ role }) => role === 'user');
		conversation.messages = [
			...messages.slice(0, at),
			step,
			...messages.slice(at),
		];
		return;
	}
	const last = messages.at(-1);
	const again = last?.parts.find(
		(each) => each.type === part.type && each.input?.kind === kind,
	);
	// Trying one color after another keeps one step, showing the newest.
	conversation.messages = again
		? [
				...messages.slice(0, -1),
				{
					...last,
					parts: last.parts.map((each) => (each === again ? part : each)),
				},
			]
		: [...messages, step];
};

onCardChange(stepOfChange);

const foldCard = (toolCallId, folded) =>
	whenIdle(() => {
		conversation.messages = conversation.messages.map((message) =>
			message.parts.some((part) => part.toolCallId === toolCallId)
				? {
						...message,
						parts: message.parts.map((part) =>
							part.toolCallId === toolCallId ? { ...part, folded } : part,
						),
					}
				: message,
		);
		saveConversation();
	});

onCardFold(foldCard);

// The change runs at once, and only its step waits for the reply on screen to end.
const runDetached = (form, values) => {
	const ran = formAnswer(form, values);
	const recorded = ran
		.then(async (output) => {
			await idle();
			await addStep(form, formInput(form, values), output);
		})
		.finally(() => runningTools.delete(recorded));
	runningTools.add(recorded);
	return ran;
};

const formsOfWorkflow = (workflow) =>
	useFormsStore
		.getState()
		.forms.filter(
			({ call }) =>
				metadataOf(call, conversation.messages).workflow === workflow,
		);

export const formsOfCard = (toolCallId) =>
	formsOfWorkflow(metadataOf(toolCallId, conversation.messages).workflow);

// Leaving closes the workflow's forms, and the message typed past them goes again, routed as if none were open.
const leaveOrStay = (card, { left }) => {
	const forms = formsOfCard(card.toolCallId);
	if (!left) {
		if (forms.length) restoreForm(forms.at(-1).id);
		return;
	}
	// X only takes away a form answered open, and the regenerate drops any call still waiting.
	for (const { id } of forms) dropForm(id);
	conversation.regenerate({ body: lastBody });
};

const requesting = () =>
	['submitted', 'streaming'].includes(conversation.status);

// A failed save leaves the card open for another try.
// Closed as a message goes out, a card about one part was typed over, so it carries the words.
const typedOver = (card, output) =>
	typing && waiting && output?.skipped && !output.typed && card.input?.block?.id
		? { ...output, typed: waiting }
		: output;

export const answerCard = (card, save) => {
	// Already skipped by a typed message, so a late answer must not save.
	if (!pendingCall(card.toolCallId)) return Promise.resolve();
	useRunStore.setState({ answering: true });
	answering = save()
		.then(async (output) => {
			const leaving = getToolName(card) === 'leave-form' && output.left;
			// Installing first leaves no moment where the reply looks finished before its install.
			if (getToolName(card) === 'choose-plugin' && output.picked) {
				install(output.picked);
			}
			// Leaving regenerates this reply, and answering first would let it count as a finished turn.
			if (!leaving) await answerWith(card, typedOver(card, output));
			if (getToolName(card) === 'leave-form') leaveOrStay(card, output);
		})
		.finally(() => {
			answering = null;
			useRunStore.setState({ answering: false });
		});
	// An answer that ends the run sends no reply, so the queue goes now.
	// Leaving a form sends its message again, and the queue waits for that reply.
	answering
		.then(() => {
			if (goesOn({ messages: conversation.messages }) || requesting()) return;
			useQueueStore.setState({ held: false });
			sendQueued();
		})
		.catch(() => {});
	return answering;
};

const joined = (...texts) => texts.filter(Boolean).join('\n\n');

// A send with any of these is a request with its own route, never words to join to others.
const ROUTES = [
	'workflow',
	'sentForm',
	'task',
	'again',
	'hidden',
	'context',
	'answers',
	'nudge',
];
const routed = (send) => ROUTES.some((key) => Boolean(send?.[key]));
const routeOf = (send) =>
	Object.fromEntries(ROUTES.map((key) => [key, send?.[key]]));

// Only typed words join; a routed send joined to them would lose its route.
const queueSend = (text, options) =>
	useQueueStore.setState((state) => {
		const send = { text, ...routeOf(options) };
		if (!state.text) return send;
		const last = state.after.at(-1) ?? state;
		if (routed(last) || routed(send)) return { after: [...state.after, send] };
		const words = joined(last.text, text);
		return state.after.length
			? { after: [...state.after.slice(0, -1), { ...last, text: words }] }
			: { text: words };
	});

// Text sent while an earlier send waits on a save joins it, so one request goes.
let waiting = null;
let waitingRouted = false;
// The block picked and any Undo, for the text waiting; a later pick wins.
let attached = null;

const sendable = (part) => part && { id: part.id, html: part.html };

// The start of a part's words, so the chat's history says which part each message was sent with.
const wordsOf = (html) =>
	new DOMParser()
		.parseFromString(html ?? '', 'text/html')
		.body.textContent.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 60);

// A pick kept from an earlier message predates its edits, so it's read again.
const shownNow = (part) => part && { ...part, ...partNow(part.id) };

// Taken as the text is sent, so a pick after it waits for the next message.
// A pick leaves the chat box with its message and stays the focus until another.
const takeAttached = () => {
	const state = useSelectionStore.getState();
	const block = shownNow(state.block);
	const focus = block ? null : shownNow(state.focus);
	useSelectionStore.setState({
		block: null,
		focus: block ?? focus,
		asked: false,
	});
	return {
		selection: sendable(block),
		focus: sendable(focus),
		picked: block && {
			type: block.type,
			text: wordsOf(block.html),
			...(block.label && { label: block.label }),
		},
	};
};

// The request carries its tool's input, so no model guesses which page.
// A nudge the plugin runs itself brings the wrap-up and nudges of the workflow it runs.
export const showCard = (
	text,
	{ workflow, tool, input, title, labels, runs, nudge },
) => {
	markActed();
	closeGutter();
	minimizeForms();
	const asked = {
		id: generateId(),
		role: 'user',
		parts: [{ type: 'text', text }],
		...(nudge && { metadata: { nudge } }),
	};
	const call = generateId();
	conversation.messages = [
		...conversation.messages,
		asked,
		{
			id: generateId(),
			role: 'assistant',
			metadata: {
				workflow,
				since: asked.id,
				...(runs && { wrapUp: runs.wrapUp, nudges: runs.nudges }),
			},
			parts: [
				{ type: 'step-start' },
				...callParts(tool, call, { input, title, labels }),
			],
		},
	];
	if (runsHere(tool)) runHere({ toolName: tool, toolCallId: call, input });
};

// These take typed words as their answer and send it back themselves.
const TAKES_WORDS = ['ask-question', 'ask-detailed-question', 'choose-plugin'];

// A form waits for its own Submit, so typed words never answer one.
const askingCard = () =>
	pendingCards(conversation.messages).find((card) => !formFor(card.toolCallId));

const SETTINGS = { title: 'site title', description: 'tagline' };

// The model reads the card's question from here; most cards carry it in their call.
const questionOf = ({ input = {}, ...card }) => {
	if (input.question) return input.question;
	const name = getToolName(card);
	if (name === 'choose-setting') {
		return `Which ${SETTINGS[input.setting] ?? input.setting} would you like?`;
	}
	if (name === 'media-upload') {
		return `Which image should be ${{ icon: 'your site icon', logo: 'your logo' }[input.target] ?? 'here'}?`;
	}
	const ability = abilityOf(name) && abilityNamed(abilityOf(name));
	return ability ? `Run "${ability.label}" from ${ability.plugin}?` : '';
};

const optionsOf = ({ input = {} }) =>
	(input.options ?? input.suggestions ?? [])
		.map((option) => option?.title ?? option?.label ?? option)
		.filter((option) => typeof option === 'string');

// Typed past a list of titles, "something shorter" asks for others; it's no title of its own.
const answeringNote = (card) => {
	const question = questionOf(card);
	const options = optionsOf(card);
	return `The user typed this while the agent's card${question ? ` asking "${question}"` : ''} waited${options.length ? `, instead of picking one of its options (${options.join(', ')})` : ''}. It may be their answer, or something they want about it.`;
};

// The picker's choice of workflows has no tool, so typed words go with its question.
export const answerChoice = (text, { question, options = [] }) =>
	submit(text, {
		context: `This is what the user typed on the agent's open card asking "${question}" instead of picking one of its options (${options.map(({ label }) => label).join(', ')}): it answers that card.`,
	});

const CHECKED_MESSAGES = 8;

// Typed in the chat box, the words may ask for something else, which then goes past the question.
const answersCheck = async (card, text) => {
	try {
		const response = await fetch(`${AI_HOST}/api/agentx/answers`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				text,
				question: questionOf(card),
				options: optionsOf(card),
				messages: conversation.messages.slice(-CHECKED_MESSAGES),
			}),
		});
		if (!response.ok) return true;
		const { answers } = await response.json();
		return answers !== false;
	} catch {
		// Unsure, the words go to the question, as a typed answer on the card does.
		return true;
	}
};

// Typed on a card, or in the chat box while it waits, the words answer the card.
export const answerTyped = (card, text) => {
	const name = getToolName(card);
	if (TAKES_WORDS.includes(name)) {
		markActed();
		return answerCard(card, async () => CARDS[name](card).answer(text));
	}
	return sendText(text, { answers: card });
};

// A card left open counts as skipped, so the model knows the user typed past it; a form stays open.
// A workflow named here opens without the picker.
export const sendText = async (
	text,
	{ workflow, sentForm, task, again, hidden, context, answers, nudge } = {},
) => {
	const plain = !workflow && !sentForm && !task && !again && !hidden;
	const open = answers ?? (plain && !context && !typing ? askingCard() : null);
	const question =
		Boolean(open) && !answers && TAKES_WORDS.includes(getToolName(open));
	if (question && (await answersCheck(open, text))) {
		return answerTyped(open, text);
	}
	// A new request goes past the question as a message of its own.
	const asked = question ? null : open;
	// Typed past a card about one part, the words stay on that part, queued or not.
	const free = !(answers || sentForm || task || again || hidden);
	let over =
		asked ??
		(free
			? pendingCards(conversation.messages).find(
					({ input }) => input?.block?.id,
				)
			: null);
	if (over?.input?.block?.id) focusBlock(over.input.block.id);
	markActed();
	// Typing moves on from the Site Guide, so its open step folds away.
	if (plain) useGuideStore.setState({ step: null });
	// A message of the user's own goes past the tasks still lined up, which would otherwise come back.
	if (!task) clearTasks();
	const route = {
		workflow,
		sentForm,
		task,
		again,
		hidden,
		context,
		answers,
		nudge,
	};
	// Joined to the send on its way, its route would be dropped.
	if (waiting !== null && (waitingRouted || routed(route))) {
		queueSend(text, route);
		return;
	}
	const taken = takeAttached();
	if (waiting !== null) {
		waiting = joined(waiting, text);
		const selection = taken.selection ?? attached.selection;
		attached = {
			selection,
			focus: selection ? null : (taken.focus ?? attached.focus),
			picked: taken.selection ? taken.picked : attached.picked,
		};
		return;
	}
	waiting = text;
	waitingRouted = routed(route);
	attached = taken;
	typing = true;
	skipping =
		pendingCards(conversation.messages).length > 0 ||
		cardsTypedPast(conversation.messages).length > 0;
	closeGutter();
	minimizeForms();
	await landAll();
	await answering?.catch(() => {});
	await Promise.allSettled(runningTools);
	for (const card of pendingCards(conversation.messages)) {
		// A card whose reply was still settling when the words came in is only waiting now.
		const block = card.input?.block?.id;
		if (!over && free && block && !formFor(card.toolCallId)) {
			over = card;
			focusBlock(block);
			if (!attached.selection) {
				attached = { ...attached, focus: sendable(partNow(block)) };
			}
		}
		await answerWith(
			card,
			formFor(card.toolCallId)
				? OPEN
				: card.toolCallId === (over ?? asked)?.toolCallId
					? // As "answer", a title card's model saved "something shorter" as the title.
						{ skipped: true, typed: text }
					: (takeHeld(card.toolCallId) ?? { skipped: true }),
		);
	}
	for (const card of cardsTypedPast(conversation.messages)) {
		await answerWith(card, TYPED_PAST[getToolName(card)]);
	}
	for (const card of pageAsksTypedPast(conversation.messages)) {
		await markOutput(card.toolCallId, { canceled: true });
	}
	const all = waiting;
	const { picked, ...sending } = attached;
	waiting = null;
	attached = null;
	const unseen = hidden && all === text;
	// Joined to other typed words, the context would answer a request it wasn't written for.
	const told =
		all === text &&
		(context || ((over ?? asked) && answeringNote(over ?? asked)));
	return conversation.sendMessage(
		// Only messages are saved, so the bubble keeps the pick after a reload.
		{
			text: all,
			...((picked || again || unseen || told || nudge) && {
				metadata: {
					...(picked && { picked }),
					...(again && { again }),
					...(unseen && { hidden: true }),
					...(told && { context: told }),
					...(nudge && { nudge }),
				},
			}),
		},
		// Text joined from another send isn't the request alone any more.
		{ body: all === text ? { ...sending, workflow, sentForm, task } : sending },
	);
};

const takeQueued = () => {
	const { text, after } = useQueueStore.getState();
	const [next, ...rest] = after;
	useQueueStore.setState({
		text: '',
		...routeOf(null),
		held: false,
		again: false,
		afterTool: false,
		...next,
		after: rest,
	});
	return text;
};

// A step goes as a hidden message, on its part as the site shows it now.
// A batch carries each step's block as the site shows it now, as a lone step's selection does.
const batched = (batch) =>
	batch.flatMap(({ id, prompt, parts: [part] }) => {
		const html = partNow(part)?.html;
		return html ? [{ id, part, prompt, html }] : [];
	});

export const sendPlanStep = ({
	plan,
	step,
	part,
	send,
	last,
	batch = [],
	around,
	move,
	wrap,
	order,
	adds,
	items: rewrites,
	copies,
	form,
	fix,
	piece,
	stack,
	styleFrom,
	styleOnly,
}) => {
	// A block the site frame can't read goes by itself.
	const items = batched(batch);
	return conversation.sendMessage(
		{
			text: step.prompt,
			metadata: {
				planStep: {
					plan,
					id: step.id,
					part,
					...(send && { send }),
					...(last && { last }),
					...(items.length > 1 && { batch: items }),
					...(move && { move }),
					...(wrap && { wrap }),
					...(order && { order }),
					...(adds && { adds }),
					...(rewrites && { items: rewrites }),
					...(copies && { copies }),
					...(form && { form }),
					...(fix && { fix }),
					...(piece && { piece }),
					...(stack && { stack }),
					...(styleFrom && { styleFrom }),
					...(styleOnly && { styleOnly }),
				},
			},
		},
		{
			body: {
				workflow: 'block-edit',
				...(part && { selection: partNow(part) }),
				// A move looks for its place among the plan's own blocks first.
				...(around && { around: outlineNow(around) }),
			},
		},
	);
};

// A step part-way through goes as its parts done and its parts left, or a rewrite drops the rest of it.
const stepsFor = (plan) =>
	plan.steps.flatMap(
		({
			title,
			prompt,
			parts: keys,
			state,
			done,
			move,
			wrap,
			order,
			adds,
			items,
			form,
			copies,
			fix,
			piece,
			stack,
			styleFrom,
			styleOnly,
		}) => {
			const parts = keys.map((key) => idOf(plan, key)).filter(Boolean);
			const next = move && idOf(plan, move.next);
			const layout = wrapOf(plan, { wrap });
			const lists = orderOf(plan, { order });
			const moving = {
				...(next && { move: { ...move, next } }),
				...(layout && { wrap: layout }),
				...(lists && { order: lists }),
				...(adds && { adds: true }),
				...(items && { items: true }),
				...(form && { form }),
				...(copies && { copies: true }),
				...(fix && { fix }),
				...(piece && { piece: true }),
				...(stack && { stack: true }),
				...(styleFrom && { styleFrom }),
				...(styleOnly && { styleOnly }),
			};
			return state === 'running' && done > 0
				? [
						{ title, prompt, parts: parts.slice(0, done), state: 'done' },
						{
							title,
							prompt,
							parts: parts.slice(done),
							state: 'pending',
							...moving,
						},
					]
				: [{ title, prompt, parts, state, ...moving }];
		},
	);

const planPart = (plan) => {
	const part = idOf(plan, plan.part);
	return part ? { selection: partNow(part) } : {};
};

// A step that came back sends the whole plan to plan edit, on the plan's part as the site shows it now.
// round tells this send-back's reply from an earlier one's.
export const sendPlanEdit = ({ plan, why, round, added }) =>
	conversation.sendMessage(
		{
			text: why || plan.ask,
			metadata: {
				planEdit: {
					plan: plan.toolCallId,
					round,
					ask: plan.ask,
					why,
					steps: stepsFor(plan),
					...(added?.length && { added }),
				},
			},
		},
		{ body: { workflow: 'block-edit', ...planPart(plan) } },
	);

// A message typed while a plan runs goes between its steps, with the plan to read it against.
export const sendDuringPlan = (plan, round) =>
	conversation.sendMessage(
		{
			text: takeQueued(),
			metadata: {
				duringPlan: {
					plan: plan.toolCallId,
					round,
					ask: plan.ask,
					steps: stepsFor(plan),
				},
			},
		},
		{ body: { workflow: 'block-edit', ...planPart(plan) } },
	);

// Ids are positions, so a change before a task can leave its id on another block.
const stillShows = ({ text, block }) => {
	const doc = siteFrame()?.contentDocument;
	const element = block && doc ? blockById(doc, block) : null;
	const words = element ? wordsOf(element.outerHTML) : '';
	return Boolean(words) && text.includes(words);
};

// The block picked for the task before can't stand in for this one.
// The user's own first part goes unseen, since their message already asked for it.
export const sendTask = (nudge) => {
	const next = takeTask();
	if (!next) return;
	useSelectionStore.setState({
		picking: false,
		block: null,
		focus: null,
		pickAfter: null,
	});
	return sendText(next.text, {
		task: stillShows(next) ? { block: next.block } : true,
		hidden: Boolean(next.start),
		context: next.context,
		nudge,
	});
};

// Text typed mid-run goes as one turn when it's done; a routed request goes as another.
export const submit = (text, options) => {
	if (useRunStore.getState().working) return queueSend(text, options);
	const queue = useQueueStore.getState();
	if (!queue.text) return sendText(text, options);
	// A card waits only on the user, so what they type goes now, past it.
	if (!queue.after.length && !routed(queue) && !routed(options)) {
		return sendText(joined(takeQueued(), text));
	}
	// The queued message was first, so it goes now and this waits for its reply.
	const route = routeOf(queue);
	const queued = takeQueued();
	queueSend(text, options);
	return sendText(queued, route);
};

// A form sent after its call was answered open still reaches the agent: ask-form as a message, an ability as a step.
export const sendForm = async (form, values) => {
	const card = pendingCall(form.call);
	if (card) {
		await answerCard(card, () => formAnswer(form, values));
	} else if (form.tool === 'ask-form') {
		// Dropped before its request is built, so openForms can't route it to the workflow that asked.
		const { workflow, since } = metadataOf(form.call, conversation.messages);
		submit(
			formText(form, values),
			workflow ? { sentForm: { workflow, since } } : undefined,
		);
	} else {
		await runDetached(form, values);
	}
	dropForm(form.id);
};

// With no reply behind it, its Save leaves only a step.
export const showForm = (tool) =>
	openForm(
		formOf({ type: `tool-${tool}`, toolCallId: generateId(), input: {} }),
		() => true,
	);

// The agent saves a title or tagline live, and an open profile form's Save would put the old one back.
useSettingsStore.subscribe(({ title, description }, before) => {
	if (title === before.title && description === before.description) return;
	const { name, tagline } = profileOf();
	refillForms('edit-site-profile', { name, tagline });
});

const closedNote = ({ title }) => ({
	skipped: true,
	done: sprintf(
		// translators: %s is the title of a form in the AI Agent's chat, like “Your site profile”. A step in the chat after the user closed that form with its X.
		__('Closed “%s” without saving', 'extendify-local'),
		title,
	),
});

// Only typing thrown away is worth a note; an untouched form closes quietly.
export const closeForm = async (form) => {
	const typed = Object.keys(form.edits ?? {}).length > 0;
	const answer = typed ? closedNote(form) : { skipped: true };
	const card = pendingCall(form.call);
	if (card) await answerCard(card, async () => answer);
	else if (typed) await addStep(form, form.input ?? {}, answer);
	dropForm(form.id);
};

// A card or a choice the run ended on would be skipped unseen.
const waitsOnUser = (messages) =>
	Boolean(pendingCard(messages) || messages.at(-1)?.metadata?.options?.length);

// The user stopped it, it failed, or it asks the user something, so carrying on is the user's call.
export const sendQueued = () => {
	const queue = useQueueStore.getState();
	const { text, held, closingFirst } = queue;
	const userCall =
		stopped ||
		conversation.status === 'error' ||
		waitsOnUser(conversation.messages);
	// The queued message waits for the agent's reply to the failure.
	if (unread.length && !userCall && !typing) return addStep(...unread.shift());
	// A send still on its way goes first, and this waits for its reply.
	if (!text || held || closingFirst || waiting !== null) return;
	if (userCall) {
		useQueueStore.setState({ held: true });
		return;
	}
	const route = routeOf(queue);
	return sendText(takeQueued(), route);
};

// A send already on its way types past the cards of a run that just ended.
export const sending = () => waiting !== null;

// What the run already changed stays, and the continuity check decides if its workflow goes on.
export const sendNow = async () => {
	// Stopping would give up a running tool and lose its step, so the message waits queued.
	if (giveUps.size && useQueueStore.getState().text) {
		useQueueStore.setState({ afterTool: true });
		while (giveUps.size) await Promise.allSettled(giveUps.keys());
		// Deleted or stopped while it waited.
		if (!useQueueStore.getState().afterTool) return;
	}
	const route = routeOf(useQueueStore.getState());
	const text = takeQueued();
	// A second press finds the queue already sent, and stopping would cut off that message's reply.
	if (!text) return;
	await stopRun();
	return sendText(text, route);
};

// A fresh id per Delete, so the same text deleted twice still reaches the box.
let returns = 0;

// Put back in the chat box, a request keeps its route while the words sent still start with it.
let filled = null;

export const fillChatBox = (text, route) => {
	filled = routed(route) ? { text: text.trim(), route } : null;
	useQueueStore.setState({ returned: { text, id: ++returns } });
};

export const routeOfFilled = (text) => {
	const route =
		filled && text.trim().startsWith(filled.text) ? filled.route : undefined;
	filled = null;
	return route;
};

export const deleteQueued = () => {
	const route = routeOf(useQueueStore.getState());
	fillChatBox(takeQueued(), route);
};

export const takenBack = () => useQueueStore.setState({ returned: null });

const loadedLast = conversation.messages.at(-1);

// A reply restored on load ended long ago, so its nudges are old news.
export const restored = (message) => message.id === loadedLast?.id;

export const interruptedIn = (messages) => {
	const last = messages.at(-1);
	return last && isInterrupted(last) ? (last.parts[0].data ?? {}) : null;
};

// Moving on instead of trying again: the cut run's changes stay in the draft.
export const dropInterrupted = () => {
	if (!interruptedIn(conversation.messages)) return;
	conversation.messages = conversation.messages.slice(0, -1);
};

// The cut run's changes are still in the draft, and rerunning on top would make them twice.
export const tryAgain = async () => {
	const cut = interruptedIn(conversation.messages);
	if (!cut) return;
	const note = conversation.messages.at(-1).id;
	const { version, selection, workflow } = cut;
	if (version !== undefined && version !== useDraftStore.getState().current) {
		await coverWhile(() => undoTo(version)).catch(() => {});
	}
	// An undo on a hosted site takes seconds, and the user may have typed past the note meanwhile.
	if (conversation.messages.at(-1)?.id !== note) return;
	conversation.messages = conversation.messages.slice(0, -1);
	const part = selection ? partNow(selection) : null;
	return conversation.regenerate({
		body: { ...(workflow && { workflow }), ...(part && { selection: part }) },
	});
};

for (const card of pendingCards(conversation.messages)) {
	drawForm({
		toolName: getToolName(card),
		toolCallId: card.toolCallId,
		input: card.input,
	});
}

// A reply waiting on a card keeps them: answering it after a reload resumes that reply.
const savedMessages = (messages) =>
	lookupsOnlyIn(
		messages,
		pendingCards(messages).length ? messages.at(-1) : null,
	);

// The server cuts the chat back to this run's first message on the next load.
const cutRun = () => {
	if (!runOf(conversation).cut) return null;
	const { messages } = conversation;
	const { plan } = usePlanStore.getState();
	// Plan steps are messages too, even once a failed step ended the plan.
	const asked = messages.findLast(({ role }) => role === 'user');
	const planned = plan?.toolCallId ?? (asked && planOf(asked));
	const shown = planned
		? messages.findIndex(({ parts }) =>
				parts.some(({ toolCallId }) => toolCallId === planned),
			)
		: -1;
	const from =
		shown < 0
			? asked
			: messages.slice(0, shown).findLast(({ role }) => role === 'user');
	return from ? { from: from.id, plan: shown >= 0, ...started } : null;
};

const savedBody = () =>
	JSON.stringify({
		id: conversation.id,
		messages: savedMessages(conversation.messages),
		running: cutRun(),
	});

let lastSaved = savedBody();
// One save out at a time, so an older chat never lands after a newer one.
let saving = false;

// Added once after a build; then it's saved and scrolls away with the chat.
if (
	window.extAgentXData?.guide?.welcome &&
	!conversation.messages.some(isGuide)
) {
	conversation.messages = [
		...conversation.messages,
		{ id: generateId(), role: 'assistant', parts: [{ type: 'data-guide' }] },
	];
}

// The user's words, then the guide, with no request to the agent.
export const startStoreGuide = (text, nudge) => {
	conversation.messages = [
		...conversation.messages,
		{
			id: generateId(),
			role: 'user',
			parts: [{ type: 'text', text }],
			...(nudge && { metadata: { nudge } }),
		},
	];
	insertStoreGuide();
};

// The agent never sees it; one put in again moves to the newest place in the chat.
export const insertStoreGuide = () => {
	conversation.messages = [
		...conversation.messages.filter(
			({ parts }) =>
				!parts.some(
					({ type, data }) => type === 'data-guide' && data?.guide === 'store',
				),
		),
		{
			id: generateId(),
			role: 'assistant',
			parts: [{ type: 'data-guide', data: { guide: 'store' } }],
		},
	];
	saveConversation();
};

export const saveConversation = () => {
	// Mid-stream it would save half a reply, and the stream's end saves again.
	if (saving || conversation.status === 'streaming') return;
	const body = savedBody();
	if (body === lastSaved) return;
	lastSaved = body;
	saving = true;
	apiFetch({
		path: '/extendify/v1/agentx/conversation',
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body,
	})
		.catch((error) =>
			digest({
				error,
				details: { source: 'agentx', caller: 'save-conversation' },
			}),
		)
		.finally(() => {
			saving = false;
			saveConversation();
		});
};

// Added last, it would bury a card, a choice or a message still waiting on the user.
const roomFor = (messages) =>
	messages.at(-1)?.role !== 'user' && !waitsOnUser(messages);

export const addPluginMessage = async (message) => {
	await idle();
	// A wrap-up asked for as the run ended would stream into this message.
	if (requesting()) {
		await new Promise((resolve) => setTimeout(resolve));
		return addPluginMessage(message);
	}
	if (!roomFor(conversation.messages)) return false;
	conversation.messages = [...conversation.messages, message];
	saveConversation();
	return true;
};

// Written into the saved message, so a reload still shows the card answered.
export const answerProactive = (messageId) =>
	whenIdle(() => {
		conversation.messages = conversation.messages.map((message) =>
			message.id === messageId
				? {
						...message,
						parts: message.parts.map((part) =>
							part.type === 'data-proactive'
								? { ...part, data: { ...part.data, answered: true } }
								: part,
						),
					}
				: message,
		);
		saveConversation();
	});
