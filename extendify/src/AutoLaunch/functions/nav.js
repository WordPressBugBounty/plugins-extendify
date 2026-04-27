import { pageNames } from '@shared/lib/pages';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

export const createNavigation = async ({ content = '', title, slug }) => {
	const existing = await apiFetch({
		path: addQueryArgs('extendify/v1/auto-launch/get-navigation', { slug }),
	}).catch(() => undefined);

	if (existing?.id) return existing;

	return await apiFetch({
		path: 'extendify/v1/auto-launch/create-navigation',
		method: 'POST',
		data: { title, slug, content },
	});
};

export const updateNavigation = (id, content) =>
	apiFetch({
		path: `wp/v2/navigation/${id}`,
		method: 'POST',
		data: { content },
	});

export const addSectionLinksToNav = async (
	navigationId,
	homePatterns = [],
	pluginPages = [],
	createdPages = [],
	{ orderedSlugs = [] } = {},
) => {
	// Extract plugin page slugs for comparison
	const pluginPageTitles = pluginPages.map(({ title }) =>
		title?.rendered?.toLowerCase(),
	);

	const pages =
		createdPages
			?.filter((page) => page?.slug !== 'home')
			?.map((page) => page.slug)
			?.filter(Boolean) ?? [];

	const resolve = (pattern) => {
		const patternType = pattern.patternTypes?.[0];
		const lookup =
			Object.values(pageNames).find(({ alias }) =>
				alias.includes(patternType),
			) || {};
		return {
			label: pattern.navLabel ?? lookup.title,
			slug: pattern.navSlug ?? lookup.slug,
		};
	};

	const sectionPatterns = homePatterns.filter((pattern) => {
		const { slug } = resolve(pattern);
		return slug && !pluginPageTitles.includes(slug);
	});

	const seen = new Set();

	const sectionsNavigationLinks = sectionPatterns.map((pattern) => {
		const { label, slug } = resolve(pattern);
		if (!slug) return '';
		if (seen.has(slug)) return '';
		seen.add(slug);

		const url = pages.includes(slug)
			? `${window.extSharedData.homeUrl}/${slug}`
			: `${window.extSharedData.homeUrl}/#${slug}`;

		const attributes = JSON.stringify({
			label,
			type: 'custom',
			url,
			kind: 'custom',
			isTopLevelLink: true,
		});

		return `<!-- wp:navigation-link ${attributes} /-->`;
	});

	const pluginPagesNavigationLinks = pluginPages.map(
		({ title, id, type, link }) => {
			const attributes = JSON.stringify({
				label: title.rendered,
				id,
				type,
				url: link,
				kind: id ? 'post-type' : 'custom',
				isTopLevelLink: true,
			});

			return `<!-- wp:navigation-link ${attributes} /-->`;
		},
	);

	// When an ordered slug list is provided, interleave plugin pages by slug
	// so e.g. "shop" lands where the design preview placed it.
	let navigationLinks;
	if (orderedSlugs.length) {
		const bySlug = new Map();
		sectionsNavigationLinks.forEach((link, i) => {
			const slug = resolve(sectionPatterns[i]).slug;
			if (slug) bySlug.set(slug, link);
		});
		pluginPages.forEach((page, i) => {
			if (page.slug) bySlug.set(page.slug, pluginPagesNavigationLinks[i]);
		});
		const ordered = orderedSlugs
			.map((slug) => bySlug.get(slug))
			.filter(Boolean);
		const placed = new Set(orderedSlugs.filter((s) => bySlug.has(s)));
		const extras = [
			...sectionsNavigationLinks.filter(
				(_, i) => !placed.has(resolve(sectionPatterns[i]).slug),
			),
			...pluginPagesNavigationLinks.filter(
				(_, i) => !placed.has(pluginPages[i].slug),
			),
		];
		navigationLinks = [...ordered, ...extras].join('');
	} else {
		navigationLinks = sectionsNavigationLinks
			.concat(pluginPagesNavigationLinks)
			.join('');
	}

	await updateNavigation(navigationId, navigationLinks);
};

export const addPageLinksToNav = async (
	navigationId,
	allPages,
	createdPages,
	pluginPages = [],
	{ orderedSlugs = [] } = {},
) => {
	// Because WP may have changed the slug and permalink (i.e., because of different languages),
	// we are using the `originalSlug` property to match the original pages with the updated ones.
	const findCreatedPage = ({ slug }) =>
		createdPages.find(({ originalSlug: s }) => s === slug) || {};

	const filteredCreatedPages = allPages
		.filter((p) => findCreatedPage(p)?.id) // make sure its a page
		.filter(({ slug }) => slug !== 'home') // exclude home page
		.map((page) => findCreatedPage(page));

	// Plugin pages use `slug`, created pages use `originalSlug`
	const getSlug = (page) => page.originalSlug ?? page.slug;
	const getOrder = (page) => {
		const slug = getSlug(page);
		return (
			pageNames[slug]?.navOrder ??
			Object.values(pageNames).find((p) => p.alias?.includes(slug))?.navOrder ??
			Object.keys(pageNames).length + 1
		);
	};
	const mergedPages = [...filteredCreatedPages, ...pluginPages];

	let finalPages;
	if (orderedSlugs.length) {
		const indexOf = (p) => orderedSlugs.indexOf(getSlug(p));
		const ordered = mergedPages
			.filter((p) => indexOf(p) !== -1)
			.sort((a, b) => indexOf(a) - indexOf(b));
		const extras = mergedPages.filter((p) => indexOf(p) === -1);
		finalPages = [...ordered, ...extras];
	} else {
		const contactPage = mergedPages.find((page) => {
			const slug = getSlug(page);
			return slug === 'contact' || pageNames.contact?.alias?.includes(slug);
		});

		const sortedPages = mergedPages
			.filter((page) => page !== contactPage)
			.sort((a, b) => getOrder(a) - getOrder(b));

		finalPages = contactPage
			? (() => {
					const index =
						sortedPages.length === 5 ? 5 : Math.min(4, sortedPages.length);
					return [
						...sortedPages.slice(0, index),
						contactPage,
						...sortedPages.slice(index),
					];
				})()
			: sortedPages;
	}

	const pageLinks = finalPages.map(({ id, title, link, type }) => {
		const attributes = JSON.stringify({
			label: title.rendered,
			id,
			type,
			url: link,
			kind: id ? 'post-type' : 'custom',
			isTopLevelLink: true,
		});

		return `<!-- wp:navigation-link ${attributes} /-->`;
	});

	const topLevelLinks = pageLinks.slice(0, 5).join('');
	const submenuLinks = pageLinks.slice(5);
	// We want a max of 6 top-level links, but if 7+, then move the last
	// two+ to a submenu.
	const additionalLinks =
		submenuLinks.length > 1
			? ` <!-- wp:navigation-submenu ${JSON.stringify({
					// translators: "More" here is used for a navigation menu item that contains additional links.
					label: __('More', 'extendify-local'),
					url: '#',
					kind: 'custom',
				})} --> ${submenuLinks.join('')} <!-- /wp:navigation-submenu -->`
			: submenuLinks.join(''); // only 1 link here

	await updateNavigation(navigationId, topLevelLinks + additionalLinks);
};

const getNavAttributes = (headerCode) => {
	try {
		return JSON.parse(headerCode.match(/<!-- wp:navigation([\s\S]*?)-->/)[1]);
	} catch (_e) {
		return {};
	}
};

export const updateNavAttributes = (headerCode, attributes) => {
	const newAttributes = JSON.stringify({
		...getNavAttributes(headerCode),
		...attributes,
	});
	return headerCode.replace(
		// biome-ignore lint: don't want to refactor and test this regex now
		/(<!--\s*wp:navigation\b[^>]*>)([^]*?)(<!--\s*\/wp:navigation\s*-->)/gi,
		`<!-- wp:navigation ${newAttributes} /-->`,
	);
};
