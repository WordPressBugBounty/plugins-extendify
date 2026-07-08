import { buildToolMessages } from '@agent/lib/tool-messages';
import { isChangeSiteDesignWorkflowAvailable, makeId } from '@agent/lib/util';
import { useStatusStore } from '@agent/state/status';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

const { chatHistory } = window.extAgentData;

const welcomeMessage = [
	{
		id: 1,
		type: 'message',
		details: {
			role: 'assistant',
			// translators: this is the initial message in the agent chat, welcoming the user. Keep it short and friendly and follow the same markdown format and emoji.
			content: isChangeSiteDesignWorkflowAvailable()
				? __(
						'#### Your site is ready 🎉\nWant to explore other website designs?',
						'extendify-local',
					)
				: __(
						'#### Your site is ready 🎉\nWant to explore other site colors?',
						'extendify-local',
					),
		},
	},
];
const state = (set, get) => ({
	messages: chatHistory?.length ? chatHistory.toReversed() : welcomeMessage,
	// API messages, back to the last finished workflow.
	getCurrentMessages: ({ includeTools = true } = {}) => {
		const messages = [];
		let foundUserMessage = false;
		for (const { type, details } of get().messages.toReversed()) {
			const finished = ['completed', 'canceled'].includes(details.status);
			if (type === 'workflow' && finished) break;
			if (type === 'workflow-component' && finished) break;
			if (type === 'tool' && includeTools) {
				// buildToolMessages returns [call, result]; push reversed so the
				// final toReversed() restores call-before-result order.
				for (const m of buildToolMessages(details).toReversed())
					messages.push(m);
			}
			// This prevents a loop of assistant messages from being at the end
			if (type === 'message' && details.role === 'user') {
				foundUserMessage = true;
			}
			if (type === 'message' && !foundUserMessage) continue;
			if (type === 'message') messages.push(details);
		}
		return messages.toReversed();
	},
	// API messages from every finished run of the given workflow.
	getMessagesFor: (workflowId) => {
		if (!workflowId) return [];
		const messages = [];
		let segment = [];
		for (const { type, details } of get().messages) {
			const finished = ['completed', 'canceled'].includes(details.status);
			if (['workflow', 'workflow-component'].includes(type) && finished) {
				if (details.workflowId === workflowId) messages.push(...segment);
				segment = [];
				continue;
			}
			if (type === 'tool') segment.push(...buildToolMessages(details));
			if (type === 'message') segment.push(details);
		}
		return messages;
	},
	getLastAssistantMessage: () =>
		get()?.messages?.findLast(
			(message) =>
				message.type === 'message' && message.details?.role === 'assistant',
		),
	hasMessages: () => get().messages.length > 0,
	addMessage: (type, details) => {
		const id = makeId();
		set((state) => {
			// max 250 messages
			const max = Math.max(0, state.messages.length - 249);
			const next = { id, type, details };
			return {
				// { id: 1, type: message, details: { role: 'user', content: 'Hello' } }
				// { id: 2, type: message, details: { role: 'assistant', content: 'Hi there!' } }
				// { id: 3, type: workflow, details: { name: 'Workflow 1' } }
				messages: [...state.messages.toSpliced(0, max), next],
			};
		});
		// A real message supersedes any in-flight progress status.
		useStatusStore.getState().clearStatuses();
		return id;
	},
	// pop messages all the way back to the last agent message
	popMessage: () => {
		set((state) => ({
			messages: state.messages?.slice(0, -1) || [],
		}));
	},
	clearMessages: () => set({ messages: [] }),
});

const path = '/extendify/v1/agent/chat-events';
const storage = {
	getItem: async () => await apiFetch({ path }),
	setItem: async (_name, state) =>
		await apiFetch({ path, method: 'POST', data: { state } }),
};

export const useChatStore = create()(
	persist(devtools(state, { name: 'Extendify Agent Chat' }), {
		name: `extendify-agent-chat-${window.extSharedData.siteId}`,
		storage: createJSONStorage(() => storage),
		skipHydration: true,
	}),
);
