import { OneButtonCard } from '@agentx/chat/OneButtonCard';
import { leaveWithoutAsking } from '@agentx/lib/follow-site';
import apiFetch from '@wordpress/api-fetch';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const runUpdate = ({ plugin }) =>
	apiFetch({
		path: '/extendify/v1/agentx/update-plugin',
		method: 'POST',
		data: { file: plugin },
	})
		.then(() => ({ success: true }))
		// A gateway that gives up answers with a page, not JSON, and core may have finished.
		.catch((error) =>
			error?.code === 'invalid_json'
				? null
				: { success: false, data: { errorMessage: error?.message } },
		);

export const PluginUpdate = ({ update, url }) => {
	const [updating, setUpdating] = useState(false);
	const [error, setError] = useState('');

	const run = async () => {
		setUpdating(true);
		setError('');
		const answer = await runUpdate(update);
		// A gateway can time out after core finished updating, so reload rather than report a failure.
		if (!answer || answer.success) {
			leaveWithoutAsking();
			return window.location.reload();
		}
		setUpdating(false);
		setError(
			answer.data?.errorMessage ||
				__('The update failed. Please try again.', 'extendify-local'),
		);
	};

	return (
		<div aria-live="polite">
			<OneButtonCard
				kind="update"
				// translators: Screen reader name for the AI Agent's notice that the plugin it runs on has a newer version.
				label={__('Agent update', 'extendify-local')}
				text={
					error ||
					// translators: Shown above the AI Agent's disabled chat box when a newer version of the plugin it runs on is waiting to be installed.
					__(
						'An agent update is available! Update now to continue.',
						'extendify-local',
					)
				}
				button={
					update.nonce
						? updating
							? __('Updating...', 'extendify-local')
							: // translators: Button that updates the plugin the AI Agent runs on, then reloads the page.
								__('Update', 'extendify-local')
						: url &&
							// translators: Link to the WordPress Updates screen, under the AI Agent's notice that the plugin it runs on has a newer version.
							__('Go to Updates', 'extendify-local')
				}
				href={update.nonce ? undefined : url}
				busy={updating}
				onPress={run}
			/>
		</div>
	);
};
