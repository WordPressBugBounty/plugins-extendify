import { create } from 'zustand';

// The rating ask for one reply, apart from the nudges; the chat moving on leaves it unasked.
export const useFeedbackStore = create(() => ({ ask: null }));
