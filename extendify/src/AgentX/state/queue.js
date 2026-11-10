import { create } from 'zustand';

// The message typed mid-run, shown above the chat box; a Stop, a failed reply or a card holds it.
// after holds sends that go as turns of their own once it has gone, like a card's request.
// again marks one the chat already shows, held for after a plan.
// closingFirst holds one typed as a plan ended until the plan's closing line is written.
// afterTool marks one sent with Send now while a tool ran, to go once its result lands.
export const useQueueStore = create(() => ({
	text: '',
	held: false,
	returned: null,
	again: false,
	closingFirst: false,
	afterTool: false,
	after: [],
}));
