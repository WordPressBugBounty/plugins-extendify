import { isObject } from '@shared/lib/utils';

const ownedSettings = ['layout', 'typography', 'custom'];
// Per-leaf, so clearing a heading size leaves fontFamily to the fonts layer.
// WordPress reads duotone per block name, never per variation, so blocks is owned here.
const ownedStyles = ['typography', 'elements', 'blocks'];

const leafPaths = (value, prefix) => {
	// PHP serializes an empty object as []; as a leaf it would purge the branch.
	if (Array.isArray(value) && value.length === 0) return [];
	if (!isObject(value)) return [prefix];

	const entries = Object.entries(value);
	// Vibes ship `elements: {}` to mean none; as a leaf it would purge fonts too.
	if (entries.length === 0) return [];

	return entries.flatMap(([key, child]) => leafPaths(child, [...prefix, key]));
};

// The fonts and palette layers own these; a declaring payload is ignored.
const isExcludedPath = (section, path) => {
	if (path[path.length - 1] === 'fontFamily') return true;
	if (section !== 'settings') return false;
	if (path[0] === 'color') return true;
	return path[0] === 'typography' && path[1] === 'fontFamilies';
};

const collectOwnedPaths = (vibes, section, roots) => {
	const paths = new Map();

	for (const vibe of Object.values(vibes)) {
		const source = vibe?.[section];
		if (!isObject(source)) continue;

		for (const key of roots) {
			if (!(key in source)) continue;

			for (const path of leafPaths(source[key], [key])) {
				if (isExcludedPath(section, path)) continue;
				paths.set(path.join('.'), path);
			}
		}
	}

	return [...paths.values()];
};

const valueAtPath = (source, path) =>
	path.reduce(
		(value, key) => (isObject(value) ? value[key] : undefined),
		source,
	);

const withoutPath = (source, [key, ...rest]) => {
	if (!isObject(source) || !(key in source)) return source;

	const updated = { ...source };

	if (rest.length === 0) {
		delete updated[key];
		return updated;
	}

	const child = withoutPath(updated[key], rest);

	if (isObject(child) && Object.keys(child).length === 0) {
		delete updated[key];
	} else {
		updated[key] = child;
	}

	return updated;
};

const withPath = (source, [key, ...rest], value) => {
	const updated = isObject(source) ? { ...source } : {};
	updated[key] =
		rest.length === 0 ? value : withPath(updated[key], rest, value);
	return updated;
};

// Every vibe's leaves are purged first, so a switch leaves none of the last one behind.
// A vibe that declares nothing lets the theme's own theme.json surface again.
const applySection = (current, incoming, ownedPaths) => {
	const purged = ownedPaths.reduce(
		(section, path) => withoutPath(section, path),
		current,
	);

	if (!isObject(incoming)) return purged;

	return ownedPaths.reduce((section, path) => {
		const value = valueAtPath(incoming, path);
		return value === undefined ? section : withPath(section, path, value);
	}, purged);
};

export const ownedSettingPaths = (vibes) =>
	collectOwnedPaths(vibes, 'settings', ownedSettings);

export const ownedStylePaths = (vibes) =>
	collectOwnedPaths(vibes, 'styles', ownedStyles);

export const applyVibeGlobals = ({ currentSettings, vibeSettings, vibes }) =>
	applySection(currentSettings, vibeSettings, ownedSettingPaths(vibes));

export const applyVibeStyles = ({ currentStyles, vibeStyles, vibes }) =>
	applySection(currentStyles, vibeStyles, ownedStylePaths(vibes));

// A fonts or colors write may not move vibe-owned leaves.
export const preserveVibeSettings = ({
	mergedSettings,
	currentSettings,
	vibes,
}) => applySection(mergedSettings, currentSettings, ownedSettingPaths(vibes));

export const preserveVibeStyles = ({ mergedStyles, currentStyles, vibes }) =>
	applySection(mergedStyles, currentStyles, ownedStylePaths(vibes));

// natural-1 is what the theme ships, so writing it would only restate the theme.
export const vibeGlobalsEntry = (vibes, selectedVibe) =>
	selectedVibe === 'natural-1' ? undefined : vibes?.[selectedVibe];
