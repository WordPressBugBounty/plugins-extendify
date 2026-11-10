import { blockName } from '@agentx/lib/versions';
import { __, _n, sprintf } from '@wordpress/i18n';

const TYPES = {
	// translators: An entrance animation where nothing animates, named in the AI Agent's list of unsaved changes.
	none: () => __('None', 'extendify-local'),
	// translators: An entrance animation where blocks fade into view, named in the AI Agent's list of unsaved changes.
	fade: () => __('Fade in', 'extendify-local'),
	// translators: An entrance animation where blocks fade in while rising into place, named in the AI Agent's list of unsaved changes.
	'fade-up': () => __('Fade up', 'extendify-local'),
	// translators: An entrance animation where blocks grow into their full size, named in the AI Agent's list of unsaved changes.
	'zoom-in': () => __('Zoom in', 'extendify-local'),
};

const SPEEDS = {
	// translators: A speed for the site's entrance animations, in the AI Agent's list of unsaved changes.
	slow: () => __('Slow', 'extendify-local'),
	// translators: A speed for the site's entrance animations, in the AI Agent's list of unsaved changes.
	medium: () => __('Medium', 'extendify-local'),
	// translators: A speed for the site's entrance animations, in the AI Agent's list of unsaved changes.
	fast: () => __('Fast', 'extendify-local'),
};

// translators: Names the site's own colors, fonts, style or animation, kept or brought back in the AI Agent's list of unsaved changes.
const original = () => __('Original', 'extendify-local');

// Each reads %s as the words the site shows for the setting's new value.
const SETTINGS = {
	// translators: %s is the site's new time zone, like Europe/Paris. A label for a change in the AI Agent's history, saved on the site at once.
	timezone: () => __('Time zone: %s', 'extendify-local'),
	// translators: %s is today's date written in the site's new date format. A label for a change in the AI Agent's history, saved on the site at once.
	date_format: () => __('Date format: %s', 'extendify-local'),
	// translators: %s is the time now written in the site's new time format. A label for a change in the AI Agent's history, saved on the site at once.
	time_format: () => __('Time format: %s', 'extendify-local'),
	// translators: %s is a day of the week, like Monday. A label for a change in the AI Agent's history: the site's weeks now start that day, saved on the site at once.
	start_of_week: () => __('Week starts on %s', 'extendify-local'),
	// translators: %s is the site's new language, like Spanish (Spain). A label for a change in the AI Agent's history, saved on the site at once.
	language: () => __('Language: %s', 'extendify-local'),
	// translators: %s is a number of posts. A label for a change in the AI Agent's history: how many posts each blog page lists, saved on the site at once.
	posts_per_page: () => __('Posts per page: %s', 'extendify-local'),
	// translators: %s is On or Off. A label for a change in the AI Agent's history: whether new posts take comments, saved on the site at once.
	comments: () => __('Comments on new posts: %s', 'extendify-local'),
	// translators: %s is a page's title, or Latest posts. A label for a change in the AI Agent's history: what the site's homepage shows, saved on the site at once.
	homepage: () => __('Homepage: %s', 'extendify-local'),
	// translators: %s is Published or Coming soon. A label for a change in the AI Agent's history: whether visitors see the site, saved on the site at once.
	visibility: () => __('Site visibility: %s', 'extendify-local'),
	// translators: %s is On or Off. A label for a change in the AI Agent's history: whether search engines may list the site, saved on the site at once.
	indexing: () => __('Search engine indexing: %s', 'extendify-local'),
};

const liveLabel = (item) => {
	switch (item?.key) {
		case 'logo':
			// translators: A label for a change in the AI Agent's history: a new logo, saved on the site at once.
			return __('New logo', 'extendify-local');
		case 'icon':
			// translators: A label for a change in the AI Agent's history: a new site icon, the small image in browser tabs, saved on the site at once.
			return __('New site icon', 'extendify-local');
		case 'title':
			// translators: %s is the site's new title. A label for a change in the AI Agent's history, saved on the site at once.
			return sprintf(__('Site title: %s', 'extendify-local'), item.after);
		case 'tagline':
			// translators: %s is the site's new tagline, the short line under its title. A label for a change in the AI Agent's history, saved on the site at once.
			return sprintf(__('Tagline: %s', 'extendify-local'), item.after);
		case 'status':
			return item.after === 'publish'
				? // translators: %s is a page's title. A label for a change in the AI Agent's history: the page was published.
					sprintf(__('Published “%s”', 'extendify-local'), item.title)
				: // translators: %s is a page's title. A label for a change in the AI Agent's history: the page was taken back to a draft.
					sprintf(__('Unpublished “%s”', 'extendify-local'), item.title);
		case 'featured':
			// translators: %s is a post's title. A label for a change in the AI Agent's history: the post got a new featured image, saved on the site at once.
			return sprintf(
				__('New featured image on “%s”', 'extendify-local'),
				item.title,
			);
		case 'canvas':
			return item.after === 'snow'
				? // translators: A line in the AI Agent's History panel: the agent turned on snow falling over the whole website, saved on the site at once.
					__('Added falling snow', 'extendify-local')
				: // translators: A line in the AI Agent's History panel: the agent turned off the snow falling over the whole website, saved on the site at once.
					__('Removed falling snow', 'extendify-local');
		default:
			return SETTINGS[item?.key]
				? sprintf(SETTINGS[item.key](), item.label ?? item.after)
				: original();
	}
};

const animationName = (id) => {
	const [type, speed] = (id ?? '').split(':');
	if (!TYPES[type] || !SPEEDS[speed]) return original();
	return sprintf(
		// translators: %1$s is an entrance animation, like Fade up, and %2$s its speed, like Slow. In the AI Agent's list of unsaved changes.
		__('%1$s (%2$s)', 'extendify-local'),
		TYPES[type](),
		SPEEDS[speed](),
	);
};

const OPS = {
	text: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Heading. One edit in the AI Agent's list of unsaved changes.
			__('Changed the %s text', 'extendify-local'),
			name,
		),
	attributes: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Button. One edit to a block's settings, like its size or link, in the AI Agent's list of unsaved changes.
			__('Changed the %s settings', 'extendify-local'),
			name,
		),
	// translators: One edit that swapped the top section of the home page for another design, in the AI Agent's list of unsaved changes.
	layout: () => __('Changed the layout', 'extendify-local'),
	remove: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Heading. One edit that took the block off the page, in the AI Agent's list of unsaved changes.
			__('Removed the %s', 'extendify-local'),
			name,
		),
	style: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Heading. One edit to how the block looks, like its color, size or spacing, in the AI Agent's list of unsaved changes.
			__('Changed the %s style', 'extendify-local'),
			name,
		),
	link: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Button. One edit to where the block's link goes, in the AI Agent's list of unsaved changes.
			__('Changed the %s link', 'extendify-local'),
			name,
		),
	move: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Heading. One edit that moved the block to another place on the page, in the AI Agent's list of unsaved changes.
			__('Moved the %s', 'extendify-local'),
			name,
		),
	duplicate: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Button. One edit that put a copy of the block on the page, in the AI Agent's list of unsaved changes.
			__('Copied the %s', 'extendify-local'),
			name,
		),
	title: (name) =>
		sprintf(
			// translators: %s is a post's new title. One edit that renamed a blog post, in the AI Agent's list of unsaved changes.
			__('Renamed a post to “%s”', 'extendify-local'),
			name,
		),
	add: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Paragraph. One edit that put a new block on the page, in the AI Agent's list of unsaved changes.
			__('Added a %s', 'extendify-local'),
			name,
		),
	wrap: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Paragraph. One edit that put that block side by side with others in columns, in the AI Agent's list of unsaved changes.
			__('Put the %s in columns', 'extendify-local'),
			name,
		),
	stack: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Columns. One edit that put the blocks of side-by-side columns into one column, in the AI Agent's list of unsaved changes.
			__('Put the %s in one column', 'extendify-local'),
			name,
		),
	// translators: One edit that set a section's heading, text and buttons on top of its photo, in the AI Agent's list of unsaved changes.
	cover: () => __('Put the text on the picture', 'extendify-local'),
	'title-hidden': () =>
		// translators: One edit in the AI Agent's list of unsaved changes: the site's name beside its logo in the header no longer shows.
		__('Hid the site title', 'extendify-local'),
	'title-shown': () =>
		// translators: One edit in the AI Agent's list of unsaved changes: the site's name beside its logo in the header shows again.
		__('Showed the site title', 'extendify-local'),
	// translators: One edit that put a map of a place on the page, in the AI Agent's list of unsaved changes.
	'add-map': () => __('Added a map', 'extendify-local'),
	// translators: One edit that changed the place a map on the page shows, or its height, in the AI Agent's list of unsaved changes.
	map: () => __('Changed the map', 'extendify-local'),
	revert: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Paragraph. A finished step in the AI Agent's chat after it put back an earlier change to that block at the user's request.
			__('Put back the %s', 'extendify-local'),
			name,
		),
	alt: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Image or Cover. One edit to the description its picture has for screen readers (its alt text), in the AI Agent's list of unsaved changes.
			__('Changed the %s picture’s description', 'extendify-local'),
			name,
		),
	image: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Image or Cover. One edit that swapped the picture the block shows, in the AI Agent's list of unsaved changes.
			__('Changed the %s picture', 'extendify-local'),
			name,
		),
};

const STYLE_WORDS = {
	// translators: Part of "Tried changing the Paragraph margin", a step in the AI Agent's chat that the page turned down.
	margin: () => __('margin', 'extendify-local'),
	// translators: Part of "Tried changing the Paragraph padding", a step in the AI Agent's chat that the page turned down.
	padding: () => __('padding', 'extendify-local'),
	// translators: Part of "Tried changing the Heading text size", a step in the AI Agent's chat that the page turned down.
	font_size: () => __('text size', 'extendify-local'),
	// translators: Part of "Tried changing the Heading text color", a step in the AI Agent's chat that the page turned down.
	text_color: () => __('text color', 'extendify-local'),
	// translators: Part of "Tried changing the Group background", a step in the AI Agent's chat that the page turned down.
	background_color: () => __('background', 'extendify-local'),
	// translators: Part of "Tried changing the Button corners", a step in the AI Agent's chat that the page turned down.
	border_radius: () => __('corners', 'extendify-local'),
	// translators: Part of "Tried changing the Heading font", a step in the AI Agent's chat that the page turned down.
	font_family: () => __('font', 'extendify-local'),
};

const TRIED = {
	'set-style': (name, args) => {
		const [setting] = Object.keys(args.styles ?? {});
		const words = STYLE_WORDS[setting]?.();
		return words
			? sprintf(
					// translators: %1$s is a kind of block, like Paragraph, and %2$s what about it, like margin. A step in the AI Agent's chat that the page turned down, so the agent tried another way.
					__('Tried changing the %1$s %2$s', 'extendify-local'),
					name,
					words,
				)
			: sprintf(
					// translators: %s is a kind of block, like Paragraph. A step in the AI Agent's chat that changed how it looks, which the page turned down, so the agent tried another way.
					__('Tried changing the %s style', 'extendify-local'),
					name,
				);
	},
	move: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Column. A step in the AI Agent's chat that the page turned down, so the agent tried another way.
			__('Tried moving the %s', 'extendify-local'),
			name,
		),
	delete: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Paragraph. A step in the AI Agent's chat that the page turned down, so the agent tried another way.
			__('Tried removing the %s', 'extendify-local'),
			name,
		),
	add: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Paragraph. A step in the AI Agent's chat that the page turned down, so the agent tried another way.
			__('Tried adding a %s', 'extendify-local'),
			name,
		),
	wrap: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Paragraph. A step in the AI Agent's chat that the page turned down, so the agent tried another way.
			__('Tried putting the %s in columns', 'extendify-local'),
			name,
		),
	stack: (name) =>
		sprintf(
			// translators: %s is a kind of block, like Columns. A step in the AI Agent's chat that the page turned down, so the agent tried another way.
			__('Tried putting the %s in one column', 'extendify-local'),
			name,
		),
	'text-on-image': () =>
		// translators: A step in the AI Agent's chat that set a section's text on top of its photo, which the page turned down, so the agent tried another way.
		__('Tried putting the text on the picture', 'extendify-local'),
	'logo-title': (_, { visible }) =>
		visible
			? // translators: A step in the AI Agent's chat that showed the site's name beside its logo again, which the page turned down, so the agent tried another way.
				__('Tried showing the site title', 'extendify-local')
			: // translators: A step in the AI Agent's chat that hid the site's name beside its logo, which the page turned down, so the agent tried another way.
				__('Tried hiding the site title', 'extendify-local'),
};

export const triedLabel = (op) =>
	op?.type
		? (
				TRIED[op.moves ? 'move' : op.op] ??
				((name) =>
					sprintf(
						// translators: %s is a kind of block, like Heading. A step in the AI Agent's chat that the page turned down, so the agent tried another way.
						__('Tried changing the %s', 'extendify-local'),
						name,
					))
			)(blockName(op.type), op)
		: undefined;

export const opLabel = (item) =>
	(OPS[item.op] ?? OPS.text)(item.name || blockName(item.type));

export const opOnPage = (item) =>
	sprintf(
		// translators: %1$s is one edit, like Changed the Heading text, and %2$s the title of the page or template it's on, like Home; on means where the edit is, not what it changed to. A label for one of the AI Agent's unsaved changes, not a sentence.
		__('%1$s on “%2$s”', 'extendify-local'),
		opLabel(item),
		item.title,
	);

export const pagesOf = (version) => [
	...new Set(version.changed.map(({ title }) => title)),
];

export const paletteLabel = (name) =>
	sprintf(
		// translators: %s is one of the site's palette colors, like Primary, whose value the user changed so every part using it changes. In the AI Agent's list of unsaved changes.
		__('Changed %s everywhere', 'extendify-local'),
		name ||
			// translators: Stands in for a palette color's name in "Changed %s everywhere" when it has none.
			__('a palette color', 'extendify-local'),
	);

// The settings a theme-setting edit may change, in the words the change list shows.
const THEME_SETTINGS = () => ({
	// translators: A theme setting the AI Agent changed across the site, in its list of unsaved changes.
	content_width: __('the content width', 'extendify-local'),
	// translators: A theme setting the AI Agent changed across the site, in its list of unsaved changes.
	wide_width: __('the wide width', 'extendify-local'),
	// translators: A theme setting the AI Agent changed across the site, in its list of unsaved changes.
	block_gap: __('the space between blocks', 'extendify-local'),
	// translators: A theme setting the AI Agent changed across the site, in its list of unsaved changes.
	spacing_scale: __('the spacing', 'extendify-local'),
	// translators: A theme setting the AI Agent changed across the site, in its list of unsaved changes.
	font_scale: __('the text sizes', 'extendify-local'),
	// translators: A theme setting the AI Agent changed across the site, in its list of unsaved changes: CSS it wrote for a look the site's style options can't give, like angled sides on boxes.
	custom_css: __('the custom style', 'extendify-local'),
});

export const themeSettingLabel = (setting) =>
	sprintf(
		// translators: %s is a theme setting, like "the content width", that the user changed for the whole site. In the AI Agent's list of unsaved changes.
		__('Changed %s everywhere', 'extendify-local'),
		THEME_SETTINGS()[setting] ??
			// translators: Stands in for a theme setting's name in "Changed %s everywhere" when it has none.
			__('a theme setting', 'extendify-local'),
	);

const DETAIL_NAMES = () => ({
	// translators: A business's phone number, named in the AI Agent's list of unsaved changes.
	phone: __('phone number', 'extendify-local'),
	// translators: A business's email address, named in the AI Agent's list of unsaved changes.
	email: __('email address', 'extendify-local'),
	// translators: A business's street address, named in the AI Agent's list of unsaved changes.
	address: __('address', 'extendify-local'),
	// translators: A business's opening hours, named in the AI Agent's list of unsaved changes.
	hours: __('opening hours', 'extendify-local'),
});

export const detailLabel = (detail) =>
	sprintf(
		// translators: %s is a contact detail, like "phone number". The AI Agent saved it for the site after the user gave it. In its list of unsaved changes.
		__('Saved your %s', 'extendify-local'),
		DETAIL_NAMES()[detail] ??
			// translators: Stands in for a contact detail's name in "Saved your %s" when it has none.
			__('contact details', 'extendify-local'),
	);

export const buttonInkLabel = (name) =>
	sprintf(
		// translators: %s is one of the site's palette colors, like Foreground. Says the AI Agent changed the text on the site's buttons to that color, so it stays readable after the user changed a palette color.
		__('Made the button text %s so it reads', 'extendify-local'),
		name,
	);

export const textInkLabel = (name) =>
	sprintf(
		// translators: %s is one of the site's palette colors, like Background. Says the AI Agent changed the color of the text drawn on that color, so it stays readable after the user changed that palette color.
		__('Made the text on %s readable', 'extendify-local'),
		name,
	);

// A palette color or theme setting changed in the same request as block edits.
export const styledLabel = ({ layer, name }) =>
	layer === 'settings' ? themeSettingLabel(name) : paletteLabel(name);

// What each version did, for the user; the agent reads the English labels in versions.js.
export const changeLabel = (version, versions, variations) => {
	switch (version.kind) {
		case 'colors':
			// translators: %s is a color scheme the user tried, like Marzipan. In the AI Agent's list of unsaved changes.
			return sprintf(
				__('Colors: %s', 'extendify-local'),
				version.name || original(),
			);
		case 'palette':
			return paletteLabel(version.name);
		case 'settings':
			return themeSettingLabel(version.name);
		case 'fonts':
			// translators: %s is a font pair the user tried, like Gotu & Manrope. In the AI Agent's list of unsaved changes.
			return sprintf(
				__('Fonts: %s', 'extendify-local'),
				version.name || original(),
			);
		case 'vibe':
			// translators: %s is a site style the user tried, like Soft; a site style sets corners, spacing and how blocks look. In the AI Agent's list of unsaved changes.
			return sprintf(
				__('Style: %s', 'extendify-local'),
				version.name || original(),
			);
		case 'animation':
			// translators: %s is an entrance animation the user tried, like Fade up (Slow). In the AI Agent's list of unsaved changes.
			return sprintf(
				__('Animation: %s', 'extendify-local'),
				animationName(version.animation),
			);
		case 'layout':
			return version.layout
				? sprintf(
						// translators: %s is the title of the page whose top section the user swapped for another design, like Home; on means where, not what it changed to. A label for one of the AI Agent's unsaved changes, not a sentence.
						__('New layout on “%s”', 'extendify-local'),
						version.changed[0]?.title,
					)
				: sprintf(
						// translators: %s is the title of the page whose top section the user put back to the design it had, like Home; on means where, not what it changed to. A label for one of the AI Agent's unsaved changes, not a sentence.
						__('Original layout on “%s”', 'extendify-local'),
						version.changed[0]?.title,
					);
		case 'look':
			return version.layout
				? // translators: A label for one of the AI Agent's unsaved changes: the user picked a whole new look for the site, its design, colors and fonts.
					__('New look', 'extendify-local')
				: // translators: A label for one of the AI Agent's unsaved changes: the user put back the site's own look, its design, colors and fonts.
					__('Original look', 'extendify-local');
		case 'variation':
			return sprintf(
				// translators: %s is a theme style variation the user tried, like Slate. In the AI Agent's list of unsaved changes.
				__('Style variation: %s', 'extendify-local'),
				variations.find(({ slug }) => slug === version.variation)?.title ??
					original(),
			);
		case 'revert': {
			const reverted = versions.find(({ id }) => id === version.reverts);
			return reverted
				? // translators: %s is an earlier change the agent took back at the user's request, like Colors: Marzipan. In the AI Agent's list of unsaved changes.
					sprintf(
						__('Put back: %s', 'extendify-local'),
						changeLabel(reverted, versions, variations),
					)
				: // translators: A change in the AI Agent's list of unsaved changes that took back an earlier one at the user's request.
					__('Put back an earlier change', 'extendify-local');
		}
		case 'live':
			return liveLabel(version.live?.[0]);
		case 'restore': {
			const restored = versions.find(({ id }) => id === version.restores);
			// The list stops at the last save, so going back past it reads as the saved site.
			return restored && !restored.saved
				? // translators: %s is an earlier change the user went back to, like Colors: Marzipan. In the AI Agent's list of unsaved changes.
					sprintf(
						__('Back to: %s', 'extendify-local'),
						changeLabel(restored, versions, variations),
					)
				: // translators: A change in the AI Agent's list of unsaved changes that went back to the site as it was last saved.
					__('Back to the saved site', 'extendify-local');
		}
		default: {
			const pages = pagesOf(version);
			if (!pages.length && version.styled?.length) {
				return styledLabel(version.styled[0]);
			}
			if (!pages.length) return original();
			return pages.length === 1
				? sprintf(
						// translators: %s is a page or template's title, like Home. Heads a group of edits the AI Agent made there, in its list of unsaved changes.
						__('Edited “%s”', 'extendify-local'),
						pages[0],
					)
				: sprintf(
						// translators: %d is how many pages or templates one reply from the AI Agent edited. Heads that group of edits in its list of unsaved changes.
						_n(
							'Edited %d page',
							'Edited %d pages',
							pages.length,
							'extendify-local',
						),
						pages.length,
					);
		}
	}
};

// In the site's own language, like "5 minutes ago".
export const ago = (at) => {
	const seconds = Math.round(at - Date.now() / 1000);
	const format = new Intl.RelativeTimeFormat(
		document.documentElement.lang || undefined,
		{
			numeric: 'auto',
		},
	);
	if (seconds > -60) return format.format(0, 'second');
	if (seconds > -3600) return format.format(Math.round(seconds / 60), 'minute');
	if (seconds > -86400)
		return format.format(Math.round(seconds / 3600), 'hour');
	return format.format(Math.round(seconds / 86400), 'day');
};

// The changes since the last save, newest first; undoing past the save brings in the saved ones it reaches.
export const changesSinceSave = ({ versions, current }) => {
	const saved = versions.findLastIndex((version) => version.saved);
	const shown = versions.findIndex(({ id }) => id === current);
	// A save refused for one source leaves its changes unsaved behind the saved ones.
	const refused = versions.findIndex(
		({ saved, undone, dropped }) => !saved && !undone && !dropped,
	);
	let from = saved + 1;
	if (refused >= 0) from = Math.min(from, refused);
	if (shown < saved) from = Math.min(from, Math.max(shown, 0));
	return {
		// An undone saved version stays, since Save would take it off the live site.
		rows: versions
			.slice(from)
			.filter(({ undone, saved, dropped }) => !dropped && (!undone || saved))
			.toReversed(),
		// The version the last save left live, or 0 for before the first one.
		savedId: saved >= 0 ? versions[saved].id : 0,
		// A dropped version changed nothing, so the site shows the one before it.
		shown:
			versions.slice(0, shown + 1).findLast(({ dropped }) => !dropped)?.id ?? 0,
		refused: refused >= 0 && refused < saved,
	};
};

// Every change this draft holds, saved or not, so the history stays after a save.
export const historyOf = (draft) => ({
	...changesSinceSave(draft),
	rows: draft.versions
		.filter(({ undone, saved, dropped }) => !dropped && (!undone || saved))
		.toReversed(),
});

// Changes to one thing in a row, like color schemes or one button's color, stack as one deck.
const likeKeyOf = (version) => {
	if (version.kind === 'restore') return null;
	if (version.kind === 'live') return `live:${version.live?.[0]?.key}`;
	if (version.kind !== 'block') return version.kind;
	const parts = [
		...new Set(version.changed.map(({ block, op }) => `${block}:${op}`)),
	];
	return parts.length ? `block:${parts.sort().join('|')}` : null;
};

// Rows newest first, with like rows in a row folded into one deck each.
export const decksOf = (rows) => {
	const decks = [];
	for (const row of rows) {
		const key = likeKeyOf(row);
		const last = decks.at(-1);
		if (key && last && likeKeyOf(last[0]) === key) last.push(row);
		else decks.push([row]);
	}
	return decks;
};

// Changes since the last save count even when they cancel out; a discard takes them off the stack.
export const stagedCount = (draft) => changesSinceSave(draft).rows.length;
