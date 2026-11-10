import { CARD_ICONS } from '@agentx/chat/CardBadge';
import { __, sprintf } from '@wordpress/i18n';

// Each sends its request into the chat; a link out or a value to judge takes the full card.
export const isRow = (suggestion) =>
	['task', 'action'].includes(suggestion?.type) ||
	(suggestion?.type === 'setup' && !suggestion.details?.url);

// A standing nudge's card asks its own question, so it shows without the agent's line.
export const needsLine = (suggestion, nudge) =>
	isRow(suggestion) && !nudge?.stands;

const taskText = (task) =>
	task.note ??
	(task.asked
		? sprintf(
				// translators: %s is the rest of what the user asked the AI Agent for, in their own words, which it does next. On the card for that next step.
				__('You also asked: “%s”', 'extendify-local'),
				task.text,
			)
		: task.text);

const own = (suggestion, type) => {
	if (type === 'action') {
		const { text, fallback, icon } = suggestion.card;
		return { text: text ?? fallback, icon };
	}
	if (type === 'task') {
		return { text: taskText(suggestion), icon: suggestion.icon ?? 'text' };
	}
	const { question, note, bell, request, kind, label, icon } =
		suggestion.details;
	return {
		text: question ?? note ?? bell?.message ?? request ?? kind ?? label,
		icon,
	};
};

// A task with no question of its own shows its request until the agent writes one.
export const ownSentence = (suggestion, type = suggestion.type) => {
	if (type === 'action') return suggestion.card?.text;
	if (type === 'task') return suggestion.note ?? null;
	return suggestion.details?.question ?? suggestion.details?.note;
};

// The agent picks the icon with its line, and writes the question and button only where the plugin has none.
export const rowOf = (suggestion, type = suggestion.type) => {
	const { text, icon } = own(suggestion, type);
	const writes = !ownSentence(suggestion, type) && suggestion.written?.text;
	return {
		text: writes || text,
		icon: suggestion.written?.icon ?? icon,
		...(writes &&
			suggestion.written.action && {
				action: suggestion.written.action,
			}),
	};
};

const writtenOf = (card) => {
	const text = typeof card?.text === 'string' && card.text.trim();
	const action = typeof card?.action === 'string' && card.action.trim();
	const icon = Object.hasOwn(CARD_ICONS, card?.icon ?? '') && card.icon;
	if (!text && !icon) return null;
	return {
		...(text && { text }),
		...(text && action && { action }),
		...(icon && { icon }),
	};
};

// A card the agent wrote itself: its button sends the words as if typed, with context the chat never shows.
export const agentOffer = (message) => {
	const sent = message?.parts?.findLast(({ type }) => type === 'data-nudge');
	const { id, offer, card } = sent?.data ?? {};
	const text = typeof offer?.text === 'string' && offer.text.trim();
	const written = writtenOf(card);
	if (!id || !text || !written?.text) return null;
	return {
		id,
		introduced: true,
		placeholder: null,
		inline: {
			id,
			type: 'task',
			slot: 'inline',
			text,
			written,
			details: {
				...(typeof offer.context === 'string' && { context: offer.context }),
				...(typeof offer.workflow === 'string' && {
					workflow: offer.workflow,
				}),
			},
		},
		gutter: null,
	};
};

export const withWritten = (nudge, message) => {
	const sent = message?.parts?.findLast(({ type }) => type === 'data-nudge');
	const written = writtenOf(sent?.data?.card);
	if (!nudge?.inline || sent?.data?.id !== nudge.id || !written) return nudge;
	return { ...nudge, inline: { ...nudge.inline, written } };
};
