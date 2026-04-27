import {
	applyDesignBuildHero,
	applyDesignBuildNav,
} from '@auto-launch/fetchers/get-design-build';
import { getHomeShape, homeTemplateShape } from '@auto-launch/fetchers/shape';
import {
	fetchWithTimeout,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import { getHeadersAndFooters } from '@auto-launch/functions/wp';
import { PATTERNS_HOST } from '@constants';
import { reqDataBasics } from '@shared/lib/data';
import { __ } from '@wordpress/i18n';

const url = `${PATTERNS_HOST}/api/home`;
const { wpLanguage, showImprint } = window.extSharedData;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

export const handleHome = async ({
	siteProfile,
	sitePlugins,
	siteImages,
	aiHeaders,
	designBuild,
}) => {
	// translators: this is for a action log UI. Keep it short
	setStatus(__('Preparing your home page', 'extendify-local'));

	const body = JSON.stringify({
		...reqDataBasics,
		siteProfile,
		siteImages,
		sitePlugins,
		aiHeaders,
		// If pages are passed in they may be used
		pages: designBuild?.pages ?? [],
		buildId: designBuild?.buildId,
	});

	const response = await retryTwice(() =>
		fetchWithTimeout(url, { method, headers, body }),
	);
	const template = homeTemplateShape.parse(await response.json());
	template.patterns = applyDesignBuildHero(template.patterns, designBuild);
	template.patterns = applyDesignBuildNav(template.patterns, designBuild);

	const hasFooterNav = Array.isArray(showImprint)
		? showImprint.includes(wpLanguage ?? '') &&
			siteProfile.category === 'Business'
		: false;

	const { headers: head, footers: foot } = await getHeadersAndFooters({
		useNavFooter: hasFooterNav,
		siteProfile,
	});
	const headerCode =
		designBuild?.headerCode ?? head[0]?.content?.raw?.trim() ?? '';
	const footerCode = foot[0]?.content?.raw?.trim() ?? '';
	return getHomeShape.parse({ home: { ...template, headerCode, footerCode } });
};
