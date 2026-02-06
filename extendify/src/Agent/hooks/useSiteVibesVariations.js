import useSWRImmutable from 'swr/immutable';
import fetcher from '@agent/workflows/theme/tools/get-site-vibes';

export const useSiteVibesVariations = () => {
	const { data, error, isLoading } = useSWRImmutable(
		{
			key: 'site-vibes-variations',
			themeSlug: window.extAgentData.context.themeSlug,
		},
		fetcher,
	);
	return { data, error, isLoading };
};
