import { RowCard } from '@agentx/chat/RowCard';
import { hidePart, showPart } from '@agentx/lib/part-preview';
import { rowOf } from '@agentx/lib/row-cards';
import { __ } from '@wordpress/i18n';

const TONE =
	'border-agentx-task-card-border bg-agentx-task-card text-agentx-task-card-ink';

// The next of the tasks a reply lined up; its button sends the task, and pointing at it outlines its part.
export const TaskCard = ({ task, onAct, onDismiss }) => {
	const { text, icon, action } = rowOf(task, 'task');
	return (
		<RowCard
			name={
				// translators: Labels the card in the AI Agent's chat that shows the next of several tasks it does one part of the page at a time.
				__('Next task', 'extendify-local')
			}
			text={text}
			icon={icon}
			action={
				action ??
				task.action ??
				// translators: Button on the AI Agent's card for the next task it lined up, like updating a menu link: sends that task.
				__('Change it', 'extendify-local')
			}
			tone={TONE}
			onAct={onAct}
			onDismiss={onDismiss}
			onMouseEnter={() => showPart(task.block)}
			onMouseLeave={hidePart}
			onFocus={() => showPart(task.block)}
			onBlur={hidePart}
		/>
	);
};
