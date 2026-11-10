import { create } from 'zustand';

// A one-button card a component puts in the gutter; a sent message closes it.
export const useGutterStore = create(() => ({ card: null, held: {} }));

export const closeGutter = () => useGutterStore.setState({ card: null });

// What a card that stays open has made so far, the answer a message sent past it gives.
export const holdAnswer = (id, output) =>
	useGutterStore.setState(({ held }) => {
		const { [id]: _was, ...rest } = held;
		return { held: output ? { ...rest, [id]: output } : rest };
	});

export const takeHeld = (id) => {
	const output = useGutterStore.getState().held[id];
	holdAnswer(id, null);
	return output;
};
