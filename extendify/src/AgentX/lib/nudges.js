import { track } from '@agentx/lib/track';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY = 'extendify-agentx-nudges';

export const SLOTS = ['placeholder', 'inline', 'gutter'];

const groupKey = (group) => `group:${group}`;

// Zero days means for good.
const within = (at, days, now) =>
	Boolean(at) && (days === 0 || now - at < days * DAY_MS);

// Each says whether a nudge may show.
const CONDITIONS = {
	'previously-called-days': ({ history, now }, [days], nudge) =>
		!within(history[nudge.id]?.calledAt, Number(days), now),
	'previously-interacted': ({ history, now }, [days], nudge) =>
		!within(history[nudge.id]?.interactedAt, Number(days), now),
	// Hidden until its days pass since it last showed or the value it watches last changed.
	cooldown: ({ history, changed = {}, now }, _, nudge) => {
		const cooldown = history[nudge.id]?.cooldown;
		if (!cooldown) return false;
		const since = Math.max(cooldown.since, changed[nudge.watches] ?? 0);
		return now - since >= cooldown.days * DAY_MS;
	},
	// Shown at once the first time, then after a wait that doubles each time it shows.
	backoff: ({ history, now }, _, nudge) => {
		const backoff = history[nudge.id]?.backoff;
		return !backoff || now - backoff.since >= backoff.days * DAY_MS;
	},
	// One nudge of the group in that many days, whichever member showed last.
	spaced: ({ history, now }, [group, days]) =>
		!within(history[groupKey(group)]?.shownAt, Number(days), now),
	missing: ({ facts = {} }, [fact]) => !facts[fact],
	has: ({ facts = {} }, [fact]) => Boolean(facts[fact]),
	'never-shown': ({ history }, _, nudge) =>
		history[nudge.id]?.shownAfter === undefined,
	unchanged: ({ changed = {} }, [part]) => !changed[part],
	// Counted in finished workflows from the last card shown, from any set.
	'cards-every': ({ history, workflows = 0 }, [turns]) =>
		workflows - (history.cards?.shownAfter ?? Number.NEGATIVE_INFINITY) >=
		Number(turns),
};

// A condition this build doesn't know hides the nudge.
export const passes = (nudge, context) =>
	(nudge.when ?? []).every((rule) => {
		const [name, args = ''] = rule.split(':');
		return CONDITIONS[name]?.(context, args.split(','), nudge) ?? false;
	});

// A slot names a suggestion by id, or, for one the plugin brings up itself, holds it.
const isNudge = (nudge) =>
	Boolean(nudge) &&
	typeof nudge === 'object' &&
	typeof nudge.id === 'string' &&
	SLOTS.every(
		(slot) =>
			slot in nudge && ['string', 'object'].includes(typeof nudge[slot]),
	);

// Each slot's id becomes the suggestion it names; one this site doesn't offer drops the nudge.
const drawn = (nudge, suggestions) => {
	const slots = SLOTS.map((slot) => [
		slot,
		typeof nudge[slot] === 'string'
			? (suggestions.find(({ id }) => id === nudge[slot]) ?? false)
			: nudge[slot],
	]);
	if (slots.some(([, suggestion]) => suggestion === false)) return null;
	return { ...nudge, ...Object.fromEntries(slots) };
};

// In the workflow's order, keeping those that pass their conditions right now.
export const availableNudges = ({ nudges = [], suggestions, context }) =>
	nudges
		.filter(isNudge)
		.map((nudge) => drawn(nudge, suggestions))
		.filter((nudge) => nudge && passes(nudge, context));

// What each source adds to the weight of a nudge it puts in the list.
export const WEIGHT = {
	// A follow-up the user's own request lined up.
	task: 1000,
	// Next once the Site Guide, the store setup or the phone card is done, like the store after the Site Guide.
	after: 500,
	// The page in view is about it, like the store on the shop page.
	page: 200,
	// The reply's own nudges, in their order.
	reply: 100,
};

// One list that every source fills; a nudge in several adds up their weight, and the heaviest that passes comes first.
export const rankNudges = (entries, { suggestions = [], context }) => {
	const merged = new Map();
	for (const { nudge, id = nudge?.id, weight } of entries) {
		const had = merged.get(id) ?? { weight: 0, top: Number.NEGATIVE_INFINITY };
		// Its rules come from the source that gives it the most weight.
		const leads = Boolean(nudge) && weight > had.top;
		merged.set(id, {
			weight: had.weight + weight,
			top: leads ? weight : had.top,
			nudge: leads ? nudge : had.nudge,
		});
	}
	return [...merged.values()]
		.sort((a, b) => b.weight - a.weight)
		.map(({ nudge }) => nudge)
		.filter(isNudge)
		.map((nudge) => drawn(nudge, suggestions))
		.filter((nudge) => nudge && passes(nudge, context));
};

// A source's nudges in its own order, the first heaviest.
export const weighed = (nudges, weight) =>
	nudges.map((nudge, at) => ({ nudge, weight: weight + nudges.length - at }));

// The chat box offers the next task to send, and the card under the reply says which it is.
export const taskNudge = ({ tasks: [next] }) => {
	const task = {
		id: 'next-task',
		text: next.text,
		...(next.context && { context: next.context }),
		...(next.action && { action: next.action }),
		...(next.block && { block: next.block }),
		...(next.asked && { asked: true }),
		...(next.note && { note: next.note }),
		...(next.icon && { icon: next.icon }),
		details: { task: true },
	};
	return {
		id: 'next-task',
		introduced: true,
		placeholder: { ...task, type: 'placeholder', slot: 'placeholder' },
		inline: { ...task, type: 'task', slot: 'inline' },
		gutter: null,
	};
};

// With no line from the agent, nothing introduces a card, so only these, and a card that says what it offers, may show.
export const keepsToChatBox = ({ inline, gutter, stands }) =>
	Boolean(stands) || (!inline && !gutter);

// The list picks the one nudge, so the line leads into that one alone.
export const namedNudges = (nudges) =>
	nudges[0]?.introduced ? [nudges[0]] : [];

// A block edit's next tweak is written for that edit, so it isn't one of the nudges sent.
const tweakOf = (data) => {
	const text = data?.id === 'tweak' && data.text?.trim();
	if (!text) return null;
	return {
		id: 'tweak',
		placeholder: {
			id: 'tweak',
			text,
			type: 'placeholder',
			slot: 'placeholder',
			details: {},
		},
		inline: null,
		gutter: null,
	};
};

export const chosenNudge = (message, nudges) => {
	const picked = message.parts.findLast(
		({ type }) => type === 'data-nudge',
	)?.data;
	if (picked?.id === 'tweak') return tweakOf(picked);
	return (
		nudges.find(({ id }) => id === picked?.id) ??
		nudges.find(keepsToChatBox) ??
		null
	);
};

const stored = () => {
	try {
		return JSON.parse(window.localStorage.getItem(HISTORY)) ?? {};
	} catch {
		return {};
	}
};

const store = (history) => {
	try {
		window.localStorage.setItem(HISTORY, JSON.stringify(history));
	} catch {}
};

export const readHistory = () => stored().nudges ?? {};

export const finishedWorkflows = () => stored().workflows ?? 0;

export const countWorkflow = () => {
	const history = stored();
	store({ ...history, workflows: (history.workflows ?? 0) + 1 });
};

const remember = (id, changes) => {
	const history = stored();
	const nudges = history.nudges ?? {};
	store({
		...history,
		nudges: { ...nudges, [id]: { ...nudges[id], ...changes } },
	});
};

// Taking a nudge's action counts as interacting with it too.
export const markCalled = (id) => {
	track('nudge-taken', { nudge: id });
	remember(id, { calledAt: Date.now(), interactedAt: Date.now() });
};

export const markInteracted = (id) => {
	track('nudge-dismissed', { nudge: id });
	remember(id, { interactedAt: Date.now() });
};

export const ACTED = 'acted';

// Anything sent to the agent, or a card it runs, but never the store setup's own start.
export const markActed = () => {
	if (!readHistory()[ACTED]?.since) remember(ACTED, { since: Date.now() });
};

export const markShown = (id) =>
	remember(id, { shownAfter: finishedWorkflows() });

// Kept apart from the nudge history, which the chat's cards read.
export const readCleared = () => stored().cleared ?? {};

export const setCleared = (id, cleared) => {
	const history = stored();
	const { [id]: _, ...rest } = history.cleared ?? {};
	store({
		...history,
		cleared: cleared ? { ...rest, [id]: Date.now() } : rest,
	});
};

const rangeOf = (nudge, condition) =>
	(nudge.when ?? [])
		.find((rule) => rule.startsWith(`${condition}:`))
		?.slice(condition.length + 1)
		.split('-')
		.map(Number);

const groupsOf = (nudge) =>
	(nudge.when ?? [])
		.filter((rule) => rule.startsWith('spaced:'))
		.map((rule) => rule.slice('spaced:'.length).split(',')[0]);

export const startSpacing = (nudge, { now = Date.now() } = {}) => {
	for (const group of groupsOf(nudge)) {
		remember(groupKey(group), { shownAt: now });
	}
};

const slotOf = (nudge) =>
	SLOTS.findLast((slot) => nudge[slot]) ??
	(nudge.when ? 'proactive' : 'inline');

export const markNudgeShown = (nudge, { now = Date.now() } = {}) => {
	track('nudge-shown', { nudge: nudge.id, slot: slotOf(nudge) });
	markShown(nudge.id);
	restartCooldown(nudge, { now });
	startSpacing(nudge, { now });
	if (nudge.inline || nudge.gutter) markShown('cards');
};

const cooldownFrom = ([min, max], { now, random }) => ({
	days: min + Math.floor(random() * (max - min + 1)),
	since: now,
});

// Picked on a card's first ranking, so even a new card waits.
export const startCooldowns = (
	nudges,
	{ now = Date.now(), random = Math.random } = {},
) => {
	const history = readHistory();
	for (const nudge of nudges) {
		const range = rangeOf(nudge, 'cooldown');
		if (!range || history[nudge.id]?.cooldown) continue;
		remember(nudge.id, { cooldown: cooldownFrom(range, { now, random }) });
	}
};

export const restartCooldown = (
	nudge,
	{ now = Date.now(), random = Math.random, alongWith = [] } = {},
) => {
	const backoff = rangeOf(nudge, 'backoff');
	if (backoff) {
		const [first, longest] = backoff;
		const last = readHistory()[nudge.id]?.backoff?.days;
		const days = last ? Math.min(last * 2, longest) : first;
		remember(nudge.id, { backoff: { days, since: now } });
		return;
	}
	const range = rangeOf(nudge, 'cooldown');
	if (!range) return;
	for (const id of [nudge.id, ...alongWith]) {
		remember(id, { cooldown: cooldownFrom(range, { now, random }) });
	}
};
