import { AI_HOST } from '@constants';
import { addIdAttributeToBlock } from '@launch/lib/blocks';
import {
	getGeneratedPageTemplate,
	getImprintPageTemplate,
	getPageImages,
	getPageProfile,
	getSitePlugins,
} from '@page-creator/api/DataApi';
import { updateOption } from '@page-creator/api/WPApi';
import { processPatterns } from '@page-creator/lib/processPatterns';
import { replaceThemeVariables } from '@page-creator/util/replaceThemeVariables';
import { syncPageTitleTemplate } from '@page-creator/util/syncPageTitleTemplate';
import { pageNames } from '@shared/lib/pages';
import { safeParseJson } from '@shared/lib/parsing';
import { useSiteProfileStore } from '@shared/state/site-profile';
import apiFetch from '@wordpress/api-fetch';

const { themeSlug = 'extendable', siteId } = window.extSharedData ?? {};

const SENT = ['partnerId', 'devbuild', 'version', 'wpLanguage', 'wpVersion'];

// Sent as the site's, a page's profile names neither the business nor its tone.
const writeCopy = async ({ pageProfile, userState, page }) => {
	const { siteProfile } = useSiteProfileStore.getState();
	const described = siteProfile?.description || siteProfile?.aiDescription;
	const response = await fetch(`${AI_HOST}/api/patterns`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...Object.fromEntries(
				SENT.map((key) => [key, window.extSharedData?.[key]]),
			),
			siteId,
			page,
			userState,
			siteProfile: described ? siteProfile : pageProfile,
			pageProfile,
		}),
	});
	if (!response.ok) throw new Error('Bad response from server');
	return response.json();
};

const patternsFor = async (pageProfile, step) => {
	if (pageProfile?.isImprintPage) {
		step('layout');
		const imprint = await getImprintPageTemplate();
		return (imprint?.template ?? imprint)?.patterns ?? [];
	}
	step('images');
	const [siteImages, sitePlugins] = await Promise.all([
		getPageImages({ pageProfile }),
		getSitePlugins({ pageProfile }),
	]);
	step('layout');
	const layout = await getGeneratedPageTemplate({
		pageProfile,
		siteImages,
		sitePlugins,
	});
	const { state } = safeParseJson(window.extSharedData?.launchDataLegacy);
	step('copy');
	const written = await writeCopy({
		pageProfile,
		userState: {
			businessInformation: state?.businessInformation,
			siteInformation: state?.siteInformation,
			siteId,
		},
		page: layout?.template ?? layout,
	});
	return written?.patterns ?? [];
};

const hasPageWithTitle = () =>
	themeSlug === 'extendable' &&
	apiFetch({ path: '/wp/v2/templates/extendable//page-with-title' })
		.then(() => true)
		.catch(() => false);

// The page's first section of each kind takes that kind's slug as its id, so links to #about land there.
const contentOf = (patterns, withTitle) => {
	const seen = new Set();
	return patterns
		.filter(
			(pattern) => !withTitle || !pattern.patternTypes?.includes('page-title'),
		)
		.map(({ code, patternTypes }) => {
			const linked = code.replace(/href="#extendify-([^"]+)"/g, 'href="#"');
			const { slug } =
				Object.values(pageNames).find(({ alias }) =>
					alias.includes(patternTypes?.[0]),
				) ?? {};
			if (!slug || seen.has(slug)) return linked;
			seen.add(slug);
			return addIdAttributeToBlock(linked, slug);
		})
		.join('');
};

// Page Creator's own steps, without its editor: the profile, a layout, copy written for it, then a draft page.
export const makePage = async ({ title, description }, step = () => {}) => {
	step('profile');
	const pageProfile = await getPageProfile({
		description: description || title,
		siteProfile: useSiteProfileStore.getState().siteProfile,
	});
	const patterns = (await patternsFor(pageProfile, step)).map((pattern) => ({
		...pattern,
		code: replaceThemeVariables(pattern.code, themeSlug),
	}));
	if (!patterns.length) throw new Error('Page Creator returned no sections.');
	step('page');
	await syncPageTitleTemplate(window.extPageCreator?.pageTitlePattern);
	const processed = await processPatterns(patterns);
	const withTitle = await hasPageWithTitle();
	const page = await apiFetch({
		path: '/wp/v2/pages',
		method: 'POST',
		data: {
			title: title || pageProfile?.aiTitle,
			status: 'draft',
			content: contentOf(processed, withTitle),
			template: withTitle ? 'page-with-title' : 'no-title-sticky-header',
			meta: { made_with_extendify_launch: true },
		},
	});
	// The importer swaps the patterns' stock image addresses for copies in the media library.
	updateOption('extendify_check_for_image_imports', true).catch(() => {});
	return page;
};
