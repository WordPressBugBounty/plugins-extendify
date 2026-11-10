import { create } from 'zustand';

// Whether the agent is working on a message, read outside the chat by the site frame and the draft checks.
// blurred: a blur around the agent's block waits on an answer, which locks the site too.
export const useRunStore = create(() => ({
	working: false,
	// A change to the page itself is landing, which is all the site's own toast says.
	changing: false,
	answering: false,
	blurred: false,
}));
