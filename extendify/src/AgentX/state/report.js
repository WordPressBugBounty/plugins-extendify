import { create } from 'zustand';

// The ask to report a run gone wrong, kept outside the chat so a remount can't ask again.
// It holds the user's last message then, so a newer one ends the ask.
export const useReportStore = create(() => ({
	after: null,
	note: false,
	// A reply that answered a tester's ERROR, which reports the chat once.
	flagged: null,
}));

export const lastAsked = (messages) =>
	messages.findLast(({ role }) => role === 'user')?.id ?? 'start';

export const offerReport = (messages) => {
	// A page carrying no switch still offers it; only a partner's false hides it.
	if (window.extSharedData?.showAgentReportIssue === false) return;
	useReportStore.setState({ after: lastAsked(messages), note: false });
};

export const openNote = () =>
	useReportStore.setState({ after: null, note: true });

export const flagRun = (id) => useReportStore.setState({ flagged: id });

export const dropReport = () =>
	useReportStore.setState({ after: null, note: false });
