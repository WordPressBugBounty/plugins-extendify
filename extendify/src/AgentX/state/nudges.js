import { create } from 'zustand';

// Kept outside the chat, so a remount never picks a reply's nudges again.
export const useNudgeStore = create(() => ({
	picks: {},
	colorsDone: 0,
	landedOn: undefined,
	held: [],
}));

// Nudges ready before the turn ends, like an image's, join that turn's list.
export const holdNudges = (entries) =>
	useNudgeStore.setState((state) => ({ held: [...state.held, ...entries] }));

export const takeHeld = () => {
	const { held } = useNudgeStore.getState();
	useNudgeStore.setState({ held: [] });
	return held;
};

export const wrapUpColors = () =>
	useNudgeStore.setState((state) => ({ colorsDone: state.colorsDone + 1 }));

const PARTS = ['placeholder', 'inline', 'gutter'];

const nulled = (slots) =>
	Object.fromEntries(
		slots.filter((slot) => PARTS.includes(slot)).map((slot) => [slot, null]),
	);

// One card part only: under the agent's line at a turn's end, above the chat box outside one.
export const pickOf = (nudge, at, { placeholder } = {}) => ({
	placeholder:
		placeholder === undefined ? (nudge?.placeholder ?? null) : placeholder,
	inline: at === 'end' ? (nudge?.inline ?? null) : null,
	gutter: at === 'up' ? (nudge?.gutter ?? null) : null,
	nudge: nudge ?? null,
});

// A change to a message never picked would mark it picked, and its turn's end would skip it.
const changePick = (messageId, change) =>
	useNudgeStore.setState((state) =>
		state.picks[messageId]
			? {
					picks: {
						...state.picks,
						[messageId]: change(state.picks[messageId]),
					},
				}
			: state,
	);

// One card at a time, so a bring-up leaves the live card as its asked line.
export const showNudge = (messageId, nudge, { at = 'end', placeholder } = {}) =>
	useNudgeStore.setState((state) => {
		const was = state.picks[messageId] ?? {};
		const asked = at === 'up' ? (was.inline ?? was.asked) : null;
		const pick = pickOf(nudge, at, { placeholder });
		return {
			picks: { ...state.picks, [messageId]: asked ? { ...pick, asked } : pick },
		};
	});

export const clearParts = (messageId, ...slots) =>
	changePick(messageId, (pick) => ({ ...pick, ...nulled(slots) }));

// Its card stays in the chat as a line saying what was asked.
export const dismissInline = (messageId, clearing = []) =>
	changePick(messageId, (pick) => ({
		...pick,
		...nulled(clearing),
		inline: null,
		asked: pick.inline ?? pick.asked ?? null,
	}));

export const markAnswered = (messageId) =>
	changePick(messageId, (pick) =>
		pick.inline
			? { ...pick, inline: { ...pick.inline, answered: true } }
			: pick,
	);

// The request waiting in the chat box followed the change an Undo just took back.
export const dropPlaceholders = () =>
	useNudgeStore.setState((state) => ({
		picks: Object.fromEntries(
			Object.entries(state.picks).map(([id, pick]) => [
				id,
				pick?.placeholder ? { ...pick, placeholder: null } : pick,
			]),
		),
	}));

// Answered cards stay, so the agent's line still has what it named.
export const answerInline = (ids) =>
	useNudgeStore.setState((state) => ({
		picks: Object.fromEntries(
			Object.entries(state.picks).map(([id, pick]) => [
				id,
				ids.includes(pick?.inline?.id)
					? { ...pick, inline: { ...pick.inline, answered: true } }
					: pick,
			]),
		),
	}));
