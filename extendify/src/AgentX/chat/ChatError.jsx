import { OneButtonCard } from '@agentx/chat/OneButtonCard';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const messageFor = (error, offline) => {
	if (offline) {
		// translators: Shown in the AI Agent's chat when the browser lost its internet connection while sending a message.
		return __(
			"You're offline. Your message will send when the connection is back.",
			'extendify-local',
		);
	}
	if (error.status === 429) {
		// translators: Shown in the AI Agent's chat when the user sent too many messages in a short time.
		return __(
			'Too many messages at once. Wait a moment, then try again.',
			'extendify-local',
		);
	}
	if (noResponse(error)) {
		// translators: Shown in the AI Agent's chat when the agent sent back nothing, even after asking it again.
		return __('No response from the agent.', 'extendify-local');
	}
	// translators: Shown in the AI Agent's chat when its reply to the user's message failed.
	return __("The agent couldn't answer. Please try again.", 'extendify-local');
};

// The backend's error once its model sent nothing three times in a row.
const noResponse = (error) => error?.message === 'no-response';

export const ChatError = ({ error, offline, onRetry, demo }) => {
	useEffect(() => {
		if (!offline) return;
		window.addEventListener('online', onRetry);
		return () => window.removeEventListener('online', onRetry);
	}, [offline, onRetry]);

	return (
		<div role="alert">
			<OneButtonCard
				kind="error"
				text={messageFor(error, offline)}
				button={
					noResponse(error)
						? // translators: Button that asks the AI Agent again after it sent back no response.
							__('Try again', 'extendify-local')
						: // translators: Button that sends the user's last message to the AI Agent again after it failed.
							__('Retry', 'extendify-local')
				}
				onPress={onRetry}
				demo={demo}
			/>
		</div>
	);
};
