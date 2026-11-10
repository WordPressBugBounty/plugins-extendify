import { RowCard } from '@agentx/chat/RowCard';
import { rowOf } from '@agentx/lib/row-cards';

export const ACTION_TONE =
	'border-agentx-action-card-border bg-agentx-action-card text-agentx-action-card-ink';

// Its button sends the card's request as the user's message.
export const ActionCard = ({ suggestion, onAct, onDismiss }) => {
	const { text, icon, action } = rowOf(suggestion, 'action');
	return (
		<RowCard
			name={suggestion.text}
			text={text}
			icon={icon}
			action={action ?? suggestion.card.button}
			tone={ACTION_TONE}
			onAct={onAct}
			onDismiss={onDismiss}
		/>
	);
};
