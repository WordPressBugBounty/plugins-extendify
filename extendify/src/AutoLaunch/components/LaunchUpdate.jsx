import { forceReinstallPlugin, runUpdates } from '@auto-launch/functions/setup';
import { digest } from '@shared/api/digest';
import { Spinner } from '@wordpress/components';
import { useCallback, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// The reload is also the retry; the server bounds how many, so it can't loop.
export const LaunchUpdate = ({
	pluginUpdateNeeded,
	themeUpdateNeeded,
	pluginUpdateViaRest,
	pluginSlug,
	attempt,
}) => {
	const cardClass = 'flex w-full flex-col items-center p-6 text-center lg:p-10';

	const applyUpdates = useCallback(async () => {
		// Run serially, not concurrently: two WP upgraders fight over the shared
		// maintenance flag and filesystem.
		const phpUpdateNeeded =
			themeUpdateNeeded || (pluginUpdateNeeded && !pluginUpdateViaRest);
		try {
			if (phpUpdateNeeded) {
				const result = await runUpdates();
				if (result?.errors?.length) {
					throw new Error(result.errors.join('; '));
				}
			}
			if (pluginUpdateNeeded && pluginUpdateViaRest) {
				await forceReinstallPlugin(pluginSlug);
			}
		} catch (error) {
			digest({
				error,
				details: { source: 'auto-launch', caller: 'launch-update', attempt },
			});
		} finally {
			window.location.reload();
		}
	}, [
		pluginUpdateNeeded,
		themeUpdateNeeded,
		pluginUpdateViaRest,
		pluginSlug,
		attempt,
	]);

	useEffect(() => {
		applyUpdates();
	}, [applyUpdates]);

	return (
		<div className={cardClass}>
			<Spinner className="h-10 w-10 text-design-main" />
			<h2 className="mt-6 mb-0 p-0 text-lg font-semibold text-gray-900">
				{__('Updating your site', 'extendify-local')}
			</h2>
			<p className="mx-auto mt-3 mb-0 max-w-md p-0 text-base text-gray-900">
				{__(
					"We're installing the latest updates. Please don't close this window — it will only take a moment.",
					'extendify-local',
				)}
			</p>
		</div>
	);
};
