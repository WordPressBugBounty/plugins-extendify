import { finishedWorkflows, readHistory } from '@agentx/lib/nudges';
import { track } from '@agentx/lib/track';

const HISTORY = 'extendify-agentx-feedback';

// The first ask comes while the chat is still short; after that it stays out of the way.
const FIRST = 3;
const EVERY = 10;

const stored = () => {
	try {
		return JSON.parse(window.localStorage.getItem(HISTORY)) ?? {};
	} catch {
		return {};
	}
};

const store = (history) => {
	try {
		window.localStorage.setItem(HISTORY, JSON.stringify(history));
	} catch {}
};

// An ask from before it had its own history is still in the nudges'.
const history = () => ({ ...readHistory().feedback, ...stored() });

export const feedbackDue = ({ workflows = finishedWorkflows() } = {}) => {
	const { shownAfter } = history();
	return shownAfter === undefined
		? workflows >= FIRST
		: workflows - shownAfter >= EVERY;
};

export const markFeedbackShown = () =>
	store({ ...stored(), shownAfter: finishedWorkflows() });

export const markFeedbackAnswered = () => {
	track('nudge-dismissed', { nudge: 'feedback' });
	store({ ...stored(), interactedAt: Date.now() });
};
