import { OneButtonCard } from '@agentx/chat/OneButtonCard';
import { useFormsStore } from '@agentx/state/forms';
import { useEffect } from '@wordpress/element';
import { __, _x, sprintf } from '@wordpress/i18n';

export const leaveCard = (title) => ({
	text: sprintf(
		// translators: %s is the title of a form open in the AI Agent's chat, like “Create product”. Asks whether to stop working on that form and close it without sending it, since the user's last message is about something else.
		__('Stop working on %s?', 'extendify-local'),
		title,
	),
	// translators: Button that keeps the user working on the form open in the AI Agent's chat. It closes only the question about stopping, not the form.
	dismiss: __('Cancel', 'extendify-local'),
	// translators: Button that stops working on the form open in the AI Agent's chat and closes it without sending it, so the agent does what the user last asked instead. It does not confirm or save what is in the form.
	button: _x('Confirm', 'stop working on a form', 'extendify-local'),
});

const leave = async () => ({ left: true });

// Confirm closes the card's own workflow's forms, so formTitle names one of those.
export const LeaveForm = ({ formTitle, onAnswer }) => {
	const newest = useFormsStore((state) => state.forms.at(-1)?.title);
	const title = formTitle || newest;
	// A form closed or sent, even once the card shows, no longer holds the message back.
	useEffect(() => {
		if (!title) onAnswer(leave);
	}, [title]);
	if (!title) return null;
	return (
		<OneButtonCard
			{...leaveCard(title)}
			onPress={() => onAnswer(leave)}
			onDismiss={() => onAnswer(async () => ({ stay: true }))}
		/>
	);
};
