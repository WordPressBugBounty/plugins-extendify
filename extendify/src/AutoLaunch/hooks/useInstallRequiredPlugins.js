import { handleSitePlugins } from '@auto-launch/fetchers/get-plugins';
import { activatePlugin, installPlugin } from '@auto-launch/functions/plugins';
import useSWR from 'swr/immutable';

const { installedPluginsSlugs } = window.extSharedData || {};

export const useInstallRequiredPlugins = () => {
	const { data, error } = useSWR('required-plugins', () =>
		handleSitePlugins({ requiredOnly: true }),
	);

	if (data?.sitePlugins?.sitePlugins?.length) {
		const pluginsToInstall = data.sitePlugins.sitePlugins.filter(
			({ wordpressSlug: slug }) => !installedPluginsSlugs?.includes(slug),
		);
		if (pluginsToInstall.length === 0) return;
		(async function install() {
			for (const { wordpressSlug: slug } of pluginsToInstall) {
				const p = await installPlugin(slug);
				await activatePlugin(p?.plugin ?? slug);
			}
		})();
	}

	return {
		requiredPlugins: data?.selectedPlugins || [],
		isLoading: !error && !data,
		isError: error,
	};
};
