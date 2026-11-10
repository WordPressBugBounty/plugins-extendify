import { blockName, englishName } from '@agentx/lib/block-names';

// The agent reads these in English; an edit with none reads as a change to the block.
const VERBS = {
	remove: 'Removed ',
	add: 'Added ',
	move: 'Moved ',
	duplicate: 'Copied ',
	wrap: 'Put in columns: ',
	stack: 'Put in one column: ',
	cover: 'Put the text on the picture: ',
};

export { blockName };

// Saved on the site at once, so no block changed; the label names the setting or page instead.
const LIVE = {
	logo: () => 'Set a new logo',
	icon: () => 'Set a new site icon',
	title: ({ after }) => `Changed the site title to “${after}”`,
	tagline: ({ after }) => `Changed the tagline to “${after}”`,
	status: ({ after, title }) =>
		`${after === 'publish' ? 'Published' : 'Unpublished'} “${title}”`,
};

// The setting each other live key changed, named for the agent.
const SETTINGS = {
	timezone: 'time zone',
	date_format: 'date format',
	time_format: 'time format',
	start_of_week: 'first day of the week',
	language: 'site language',
	posts_per_page: 'number of posts on each blog page',
	comments: 'comments on new posts',
	homepage: 'homepage',
	visibility: "site's visibility to visitors",
	indexing: 'search engine indexing',
};

const THEME_SETTINGS = {
	content_width: 'the content width',
	wide_width: 'the wide width',
	block_gap: 'the space between blocks',
	spacing_scale: 'the spacing',
	font_scale: 'the text sizes',
};

const styledName = ({ layer, name }) =>
	layer === 'settings'
		? (THEME_SETTINGS[name] ?? 'a theme setting')
		: name || 'a palette color';

const liveLabel = (item) => {
	if (LIVE[item?.key]) return LIVE[item.key](item);
	return SETTINGS[item?.key]
		? `Changed the ${SETTINGS[item.key]} to “${item.label ?? item.after}”`
		: 'Saved a setting';
};

export const labelOf = (version, versions, variations) => {
	if (!version) return 'an earlier version';
	if (version.kind === 'variation') {
		const style = variations.find(({ slug }) => slug === version.variation);
		return `Style: ${style?.title ?? 'Saved styles'}`;
	}
	if (version.kind === 'colors') {
		return `Colors: ${version.name || 'Saved colors'}`;
	}
	if (version.kind === 'palette') {
		return `Changed ${version.name || 'a palette color'} everywhere`;
	}
	if (version.kind === 'settings') {
		return `Changed ${styledName({ layer: 'settings', name: version.name })} everywhere`;
	}
	if (version.kind === 'fonts') {
		return `Fonts: ${version.name || 'Saved fonts'}`;
	}
	if (version.kind === 'animation') {
		return `Animation: ${version.name || 'Saved animation'}`;
	}
	if (version.kind === 'vibe') {
		return `Style: ${version.name || 'Saved style'}`;
	}
	if (version.kind === 'layout') {
		return `${version.layout ? 'New' : 'Original'} layout on “${version.changed[0]?.title}”`;
	}
	if (version.kind === 'look') {
		return version.layout ? 'New look' : 'Original look';
	}
	if (version.kind === 'revert') {
		const reverted = versions.find(({ id }) => id === version.reverts);
		return `Put back ${reverted ? labelOf(reverted, versions, variations) : 'an earlier change'}`;
	}
	if (version.kind === 'restore') {
		const restored = versions.find(({ id }) => id === version.restores);
		return `Restored ${version.restores ? labelOf(restored, versions, variations) : 'the start'}`;
	}
	if (version.kind === 'live') return liveLabel(version.live?.[0]);
	const styled = (version.styled ?? []).map(styledName).join(' and ');
	const [block, ...more] = version.changed;
	if (!block) return styled ? `Changed ${styled} everywhere` : 'Saved styles';
	const also = styled ? `, and changed ${styled} everywhere` : '';
	if (!more.length) {
		return `${VERBS[block.op] ?? ''}${englishName(block.type)} in “${block.title}”${also}`;
	}
	const pages = [...new Set(version.changed.map(({ title }) => title))];
	return pages.length === 1
		? `${version.changed.length} blocks in “${block.title}”${also}`
		: `${version.changed.length} blocks on ${pages.length} pages${also}`;
};

// The change Undo takes back next, saved or not; a dropped one changed nothing.
export const lastChange = ({ current, versions }, variations) => {
	const version = versions.find(({ id }) => id === current);
	return version && !version.dropped
		? labelOf(version, versions, variations)
		: null;
};

// Only labels go: the agent reads the parts of the few changes it picks.
const MOST_CHANGES = 20;

// A change a later revert took back whole is off the page, so no message can mean it.
const takenBack = (versions) =>
	new Set(
		versions
			.filter(
				({ revertsAll, undone, dropped }) => revertsAll && !undone && !dropped,
			)
			.map(({ reverts }) => reverts),
	);

// Applied changes, saved or not, oldest first; the newest is the one Undo takes back.
export const changesOf = ({ current, versions }, variations) => {
	const gone = takenBack(versions);
	return versions
		.filter(({ id, undone, dropped }) => !undone && !dropped && !gone.has(id))
		.slice(-MOST_CHANGES)
		.map((version) => ({
			id: version.id,
			kind: version.kind,
			label: labelOf(version, versions, variations),
			blocks: version.changed.map(({ block, type, title, op, settings }) => ({
				id: block,
				type,
				page: title,
				op,
				...(settings?.length && { settings }),
			})),
			...(version.request && { request: version.request }),
			newest: version.id === current,
			saved: version.saved,
		}));
};

// Pending: applied and not saved yet, or saved and since undone.
export const unsavedChanges = ({ unsaved, versions }, variations) =>
	unsaved
		? versions
				.filter(({ undone, saved, dropped }) => !dropped && undone === saved)
				.map(
					(version) =>
						`${version.undone ? 'Undid ' : ''}${labelOf(version, versions, variations)}`,
				)
		: [];
