export const ADJUST_COLORS = 'adjust-colors';

const COLOR_SETTINGS = [
	'text_color',
	'background_color',
	'gradient',
	'link_color',
	'heading_color',
	'button_color',
];
const FILLS = ['background_color', 'gradient'];
const SWAP_FILLS = [...FILLS, 'button_color'];

const hidden = ({ metadata }) =>
	Boolean(metadata?.planStep || metadata?.planEdit || metadata?.duringPlan);

// A plan's steps are hidden user messages inside the turn its request started.
const turnOf = (messages, replyId) => {
	const at = messages.findIndex(({ id }) => id === replyId);
	if (at < 0) return [];
	const asked = messages
		.slice(0, at)
		.findLastIndex((message) => message.role === 'user' && !hidden(message));
	return messages
		.slice(asked + 1, at + 1)
		.filter(({ role }) => role === 'assistant');
};

const editsIn = (replies) =>
	replies
		.flatMap(({ parts }) => parts)
		.filter(
			(part) =>
				part.type === 'tool-edit-blocks' &&
				part.state === 'output-available' &&
				!part.output?.refused,
		);

const opsIn = (edits) => edits.flatMap(({ input }) => input?.ops ?? []);

// Only a turn that changed a color can have left words hard to read.
export const recolored = (messages, replyId) =>
	opsIn(editsIn(turnOf(messages, replyId))).some(
		({ op, styles }) =>
			op === 'copy-style' ||
			(op === 'set-style' &&
				Object.keys(styles ?? {}).some((key) => COLOR_SETTINGS.includes(key))),
	);

const within = (inner, outer) =>
	inner === outer || inner.startsWith(`${outer}.`);

// The words the turn recolored so they read or gave a stand-in color, and the fill behind them.
export const colorTargetsOf = (messages, replyId) => {
	const replies = turnOf(messages, replyId);
	const edits = editsIn(replies);
	const text = [
		...replies.flatMap(({ metadata }) => [
			...(metadata?.edit?.contrasts ?? []),
			...(metadata?.edit?.swaps ?? []).filter(
				({ setting }) => !SWAP_FILLS.includes(setting),
			),
		]),
		...edits
			.filter(({ input }) => input?.correction === 'contrast')
			.flatMap(({ input }) => input.ops ?? []),
	]
		.map(({ block, type, setting }) => ({
			block,
			type,
			setting: setting ?? 'text_color',
		}))
		.filter(
			({ block }, index, all) =>
				typeof block === 'string' &&
				all.findIndex((each) => each.block === block) === index,
		);
	const fills = opsIn(edits)
		.filter(
			({ op, block, styles }) =>
				op === 'set-style' &&
				typeof block === 'string' &&
				Object.keys(styles ?? {}).some((key) => FILLS.includes(key)),
		)
		.map(({ block, type }) => ({ block, type }));
	const background =
		fills.findLast(({ block }) =>
			text.some((words) => within(words.block, block)),
		) ??
		fills.at(-1) ??
		null;
	return { background, text };
};
