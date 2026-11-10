import { create } from 'zustand';

// Long enough to read; a newer status waits this long, and the ones between are dropped.
export const MIN_SHOWN_MS = 1000;

export const useStatusStore = create((set, get) => {
	let pending;
	const put = (text) => set({ text, shownAt: Date.now() });

	return {
		text: null,
		shownAt: 0,
		show: (text) => {
			clearTimeout(pending);
			const { text: current, shownAt } = get();
			const wait = current ? shownAt + MIN_SHOWN_MS - Date.now() : 0;
			if (wait <= 0) return put(text);
			pending = setTimeout(() => put(text), wait);
		},
		clear: () => {
			clearTimeout(pending);
			set({ text: null, shownAt: 0 });
		},
	};
});
