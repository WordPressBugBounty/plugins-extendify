import { handleSitePlugins } from '@auto-launch/fetchers/get-plugins';
import { ensurePluginsActive } from '@auto-launch/functions/plugins';
import { useEffect, useRef } from '@wordpress/element';
import useSWR from 'swr/immutable';

const { installedPluginsSlugs } = window.extSharedData || {};

export const useInstallRequiredPlugins = () => {
	const { data, error } = useSWR('required-plugins', () =>
		handleSitePlugins({ requiredOnly: true }),
	);
	const started = useRef(false);

	useEffect(() => {
		if (started.current || !data?.sitePlugins?.length) return;
		started.current = true;
		ensurePluginsActive(
			data.sitePlugins.map(({ wordpressSlug }) => wordpressSlug),
			{ installedSlugs: installedPluginsSlugs },
		);
	}, [data]);

	return {
		requiredPlugins: data?.selectedPlugins || [],
		isLoading: !error && !data,
		isError: error,
	};
};
