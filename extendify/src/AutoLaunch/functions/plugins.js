import { recordPluginActivity } from '@shared/api/DataApi';
import { digest } from '@shared/api/digest';
import { enableAutoUpdate } from '@shared/api/wp';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

export const getActivePlugins = () =>
	apiFetch({ path: 'extendify/v1/auto-launch/active-plugins' });

export const alreadyActive = (activePlugins, pluginSlug) =>
	activePlugins?.filter((p) => p.includes(pluginSlug))?.length;

export const installPlugin = async (slug) => {
	const fn = async () => {
		const p = await apiFetch({
			path: '/wp/v2/plugins',
			method: 'POST',
			data: { slug },
		});
		await recordPluginActivity({ slug, source: 'auto-launch' });
		await enableAutoUpdate(p?.plugin);
		return p;
	};
	try {
		return await fn();
	} catch (error) {
		if (error?.code === 'folder_exists') {
			// Already on disk — fetch its record so the caller can activate it.
			return await getPlugin(slug);
		}
		try {
			return await fn();
		} catch (error) {
			digest({
				error,
				details: { source: 'auto-launch', caller: 'installPlugin' },
			});
			return null;
		}
	}
};

export const getPlugin = async (slug) => {
	const response = await apiFetch({
		path: addQueryArgs('/wp/v2/plugins', { search: slug }),
	});
	return response?.find((p) => p.plugin?.split('/')[0] === slug);
};

export const activatePlugin = async (slug) => {
	const fn = (s) =>
		apiFetch({
			path: `/wp/v2/plugins/${s}`,
			method: 'POST',
			data: { status: 'active' },
		});

	try {
		await fn(slug);
		return true;
	} catch (_) {
		try {
			// try once more but get the slug first
			const { plugin } = await getPlugin(slug);
			await fn(plugin);
			return true;
		} catch (error) {
			digest({
				error,
				details: { source: 'auto-launch', caller: 'activatePlugin' },
			});
			return false;
		}
	}
};

// Isolates per-plugin failures so one bad plugin can't block the rest;
// returns the slugs that never went active.
export const ensurePluginsActive = async (
	slugs,
	{ installedSlugs = [] } = {},
) => {
	const failed = [];
	for (const slug of slugs) {
		try {
			const plugin = installedSlugs.includes(slug)
				? null
				: await installPlugin(slug);
			const activated = await activatePlugin(plugin?.plugin ?? slug);
			if (!activated) failed.push(slug);
		} catch (_) {
			failed.push(slug);
		}
	}
	return { failed };
};

// Last-chance guarantee before dependent work builds on these plugins: the
// optimistic install pass is best-effort and unverified.
export const verifyPluginsActive = async (
	slugs,
	{ installedSlugs = [] } = {},
) => {
	const activePlugins = await getActivePlugins();
	// Exact slug match here (not alreadyActive's substring test): matching
	// woocommerce against an active woocommerce-payments would skip a real miss.
	const missing = slugs.filter(
		(slug) => !activePlugins?.some((path) => path.split('/')[0] === slug),
	);
	if (!missing.length) return;

	const { failed } = await ensurePluginsActive(missing, { installedSlugs });
	if (!failed.length) return;

	digest({
		error: { message: `Plugins inactive after verify: ${failed.join(', ')}` },
		details: { source: 'auto-launch', caller: 'verifyPluginsActive', failed },
	});
};

// Currently this only processes patterns with placeholders
// by swapping out the placeholders with the actual code
// returns the patterns as blocks with the placeholders replaced
export const replacePlaceholderPatterns = async (patterns) => {
	// Directly replace "blog-section" patterns using their replacement code, skipping the API call
	patterns = patterns.map((pattern) => {
		if (
			pattern.patternTypes.includes('blog-section') &&
			pattern.patternReplacementCode
		) {
			return {
				...pattern,
				code: pattern.patternReplacementCode,
			};
		}
		return pattern;
	});

	const hasPlaceholders = patterns.filter((p) => p.patternReplacementCode);
	if (!hasPlaceholders?.length) return patterns;

	const activePlugins =
		(await getActivePlugins())?.data?.map((path) => path.split('/')[0]) || [];

	const pluginsActivity = patterns
		.filter((p) => p.pluginDependency)
		.map((p) => p.pluginDependency)
		.filter((p) => !activePlugins.includes(p));

	for (const plugin of pluginsActivity) {
		recordPluginActivity({
			slug: plugin,
			source: 'auto-launch',
		});
	}

	try {
		return await processPlaceholders(patterns);
	} catch (_e) {
		// Try one more time (plugins installed may not be fully loaded)
		return await processPlaceholders(patterns)
			// If this fails, just return the original patterns
			.catch(() => patterns);
	}
};

export const processPlaceholders = (patterns) =>
	apiFetch({
		path: '/extendify/v1/shared/process-placeholders',
		method: 'POST',
		data: { patterns },
	});
