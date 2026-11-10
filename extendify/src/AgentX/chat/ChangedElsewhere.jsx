import { OneButtonCard } from '@agentx/chat/OneButtonCard';
import { __ } from '@wordpress/i18n';

// What a check of the draft found changed outside the agent, until dismissed.
export const ChangedElsewhere = ({ onDismiss, demo }) => (
	<OneButtonCard
		// translators: Screen reader name for the AI Agent's notice about changes made outside the agent.
		label={__('Changed elsewhere', 'extendify-local')}
		text={
			// translators: Shown in the AI Agent's chat when some of the user's unsaved changes were dropped because the page they were on was changed or deleted outside the agent.
			__('Content on this page was updated elsewhere.', 'extendify-local')
		}
		button={
			// translators: Closes the AI Agent's notice about changes made outside the agent.
			__('Got it', 'extendify-local')
		}
		onPress={onDismiss}
		demo={demo}
	/>
);
