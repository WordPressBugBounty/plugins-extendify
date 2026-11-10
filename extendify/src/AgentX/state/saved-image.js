import { create } from 'zustand';

// Written by the image card, which can't import the chat that adds the large-image tip.
export const useSavedImageStore = create(() => ({ image: null }));
