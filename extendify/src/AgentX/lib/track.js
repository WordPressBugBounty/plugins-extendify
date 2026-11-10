import { useShellStore } from '@agentx/state/shell';
import { AI_HOST } from '@constants';

/**
 * Every new button, toggle, card, sheet or setting in the agent gets an event: add its name
 * here and to EVENTS in ai-backend's app/api/agentx/events/names.ts, which drops any name
 * it doesn't list. Props carry ids and switches only, never words the user typed.
 */
export const EVENTS = [
	'session-started',
	'agent-opened',
	'agent-closed',
	'agent-minimized',
	'agent-restored',
	'view-changed',
	'autosave-toggled',
	'commands-opened',
	'bell-opened',
	'notification-taken',
	'notification-cleared',
	'notification-restored',
	'nudge-shown',
	'nudge-taken',
	'nudge-dismissed',
	'quick-edit-bubble',
	'quick-edit-opened',
	'quick-edit-saved',
	'select-used',
	'draft-saved',
	'draft-discarded',
	'draft-undone',
	'draft-redone',
	'history-opened',
	'guide-step',
	'sheet-moved',
	'describe-asked',
	'adjust-colors-picked',
	'adjust-colors-continued',
	'chat-crashed',
];

const { siteId, partnerId, version } = window.extSharedData ?? {};

const FLUSH_MS = 30000;
const FLUSH_AT = 25;
// The backend takes 50 a batch, and a long outage keeps only the newest.
const MOST_SENT = 50;
const MOST_QUEUED = 200;

let queue = [];
let timer = null;
let chatOf = () => null;

// The chat sets this, so events sort into its session without importing it here.
export const followChat = (of) => {
	chatOf = of;
};

const deviceOf = () => {
	const width = window.innerWidth;
	if (width < 768) return 'phone';
	return width < 1024 ? 'tablet' : 'desktop';
};

const schedule = () => {
	if (!timer) timer = setTimeout(() => flush(), FLUSH_MS);
};

export const flush = ({ leaving = false } = {}) => {
	clearTimeout(timer);
	timer = null;
	if (!queue.length || !siteId) return;
	const sending = queue.slice(0, MOST_SENT);
	queue = queue.slice(MOST_SENT);
	const url = `${AI_HOST}/api/agentx/events`;
	const body = JSON.stringify({
		siteId,
		partnerId,
		version,
		device: deviceOf(),
		events: sending,
	});
	// Plain text, so a beacon or fetch to the backend needs no preflight.
	const type = 'text/plain;charset=UTF-8';
	if (leaving && navigator.sendBeacon?.(url, new Blob([body], { type }))) {
		return;
	}
	fetch(url, {
		method: 'POST',
		body,
		keepalive: true,
		headers: { 'Content-Type': type },
	})
		.then((response) => {
			// A batch the backend refused would be refused again.
			if (!response.ok && response.status !== 400) throw response;
		})
		.catch(() => {
			queue = [...sending, ...queue].slice(-MOST_QUEUED);
			schedule();
		});
	if (queue.length) schedule();
};

export const track = (name, props) => {
	if (!EVENTS.includes(name)) return;
	// The Demo plays the chat's states, which nobody used.
	if (useShellStore.getState().chatDemo) return;
	const chat = chatOf();
	queue = [
		...queue,
		{
			name,
			at: Date.now(),
			...(chat && { chat }),
			...(props && { props }),
		},
	].slice(-MOST_QUEUED);
	if (queue.length >= FLUSH_AT) flush();
	else schedule();
};

// Closing the tab or leaving the page loses nothing still queued.
window.addEventListener('pagehide', () => flush({ leaving: true }));
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'hidden') flush({ leaving: true });
});
