import { create } from 'zustand';

// block is the part picked in the site frame, shown as the chat box's pill until its message is sent.
// focus is the part the chat is about, picked or found by the agent, until another is picked.
// landing is true while a pick's box flies onto the chat box's chip, which says Cancel until the box covers it.
// pickAfter lists the replies whose nudges were picked when the user was asked to pick; picking starts once another's are.
// confirming is the part the agent asks about, which turns Select off until it's answered.
// asked is set while the agent waits for the user to click a part, so the click itself answers it.
export const useSelectionStore = create(() => ({
	picking: false,
	block: null,
	focus: null,
	landing: false,
	pickAfter: null,
	confirming: null,
	asked: false,
}));
