import { makeId } from '@agent/lib/util';
import { create } from 'zustand';

// Progress statuses live outside the message chain so they're never persisted
// or sent to the AI; the chat store clears them on every real message.
export const useStatusStore = create((set, get) => ({
	statuses: [],
	pushStatus: (type, label) =>
		set((state) => ({
			statuses: [...state.statuses, { id: makeId(), type, label }],
		})),
	clearStatuses: () =>
		set((state) => (state.statuses.length ? { statuses: [] } : state)),
	getLatestStatus: () => get().statuses.at(-1) ?? null,
}));
