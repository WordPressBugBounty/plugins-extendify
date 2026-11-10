import { BLOCK, BLOCK_TYPE, siteFrame } from '@agentx/lib/block-box';
import { blockById, blockMarkup, edgesOf } from '@agentx/lib/pick-block';

// Read back whole in one request, so a long page sends only its first blocks.
const MOST = 400;
const SECTIONS_SHOWN = 2;
// A long menu section would push the rest of the screen out of the request.
const MOST_ON_SCREEN = 120;
const TEXT_LENGTH = 120;
// A quoted phrase can sit past the outline's cut, deep in a long paragraph.
const WORDS_LENGTH = 600;
const SECTION_NAME_LENGTH = 60;
// A long menu or gallery would crowd the rest of the page out of the request.
const MOST_IN_SECTION = 60;
const HTML_LENGTH = 300;
// Plan research reads several at a time, and each read waits on the page.
const MOST_READ = 30;
// Their text is code, or never shows.
const UNSEEN = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'];

// Only display: none counts as hidden, so a closed dropdown's links still count; the box opens it.
const shows = (element) => element.checkVisibility?.() ?? true;

// The words inside a block's own markup, not its inner blocks'; an image's are its alt text.
// A frame shows no text of its own, so its title, like a map's place, stands for what it shows.
const ownText = (element, longest = TEXT_LENGTH, { only } = {}) => {
	if (!shows(element)) return '';
	// An HTML block has no wrapper, so a map's own frame carries the block's mark.
	if (element.tagName === 'IFRAME') {
		return only === 'alts' ? '' : element.title.trim().slice(0, longest);
	}
	const walker = element.ownerDocument.createTreeWalker(
		element,
		NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
		{
			acceptNode: (node) =>
				node.nodeType === Node.ELEMENT_NODE &&
				(node.hasAttribute(BLOCK) ||
					UNSEEN.includes(node.tagName) ||
					!shows(node))
					? NodeFilter.FILTER_REJECT
					: NodeFilter.FILTER_ACCEPT,
		},
	);
	const words = [];
	while (walker.nextNode()) {
		const node = walker.currentNode;
		if (node.nodeType === Node.TEXT_NODE && only !== 'alts') {
			words.push(node.data);
		} else if (node.tagName === 'IFRAME' && only !== 'alts') {
			words.push(node.title);
		} else if (node.tagName === 'IMG' && only !== 'shown') {
			words.push(node.alt);
		}
	}
	// Spaced, so table cells and the like don't run into one word.
	return words.join(' ').replace(/\s+/g, ' ').trim().slice(0, longest);
};

// A block holding others gives only its opening tag; its inner blocks are listed on their own.
// A cut one says so, since an edit read from half its markup would miss the formatting in the rest.
const markupOf = (element) => {
	if (!element.querySelector(`[${BLOCK}]`)) {
		const html = blockMarkup(element);
		return {
			html: html.slice(0, HTML_LENGTH),
			...(html.length > HTML_LENGTH && { cut: true }),
		};
	}
	const close = `</${element.localName}>`;
	const opening = blockMarkup(element.cloneNode(false)).slice(0, -close.length);
	return { html: `${opening}…${close}` };
};

// The theme's icon style, or a picture drawn this small, is an icon; the backend's isIcon reads the same.
const ICON_STYLE = /--icon(?:-small)?-\d|\bext-card-icon\b/;
const ICON_WIDTH = 64;
// The theme drew it; nobody ships a photograph as an SVG.
const DRAWN = /^data:image\/svg|\.svg(?:[?#]|$)/i;
const isIcon = (element) => {
	if (element.getAttribute(BLOCK_TYPE) !== 'core/image') return false;
	if (ICON_STYLE.test(element.getAttribute('class') ?? '')) return true;
	const img = element.querySelector('img');
	const svg = DRAWN.test(img?.getAttribute('src') ?? '');
	const look = element.ownerDocument.defaultView.getComputedStyle(element);
	// A star rating is wide and short, so its width alone reads as a picture.
	const tall =
		Number.parseFloat(look.height) || Number(img?.getAttribute('height')) || 0;
	if (svg && tall > 0 && tall <= ICON_WIDTH) return true;
	const drawn = Number.parseFloat(look.width);
	if (drawn > 0) return drawn <= ICON_WIDTH;
	const given = Math.max(Number(img?.getAttribute('width')) || 0, tall);
	if (given > 0) return given <= ICON_WIDTH;
	return svg;
};
const iconOf = (element) => (isIcon(element) ? { icon: true } : {});

export const outline = (doc) =>
	[...doc.querySelectorAll(`[${BLOCK}]`)].slice(0, MOST).map((element) => ({
		id: element.getAttribute(BLOCK),
		type: element.getAttribute(BLOCK_TYPE),
		text: ownText(element),
		...iconOf(element),
		...markupOf(element),
	}));

const holderOf = (element) => element.parentElement?.closest(`[${BLOCK}]`);

const holdsContent = (element) =>
	element.getAttribute(BLOCK_TYPE) === 'core/post-content' ||
	Boolean(element.querySelector(`[${BLOCK_TYPE}="core/post-content"]`));

// The template's blocks beside the page content count too, or the page's title is in no section.
const sectionsOf = (doc) =>
	[...doc.querySelectorAll(`[${BLOCK}]`)].filter((element) => {
		const holder = holderOf(element);
		if (holder?.getAttribute(BLOCK_TYPE) === 'core/post-content') return true;
		return !holdsContent(element) && (!holder || holdsContent(holder));
	});

const shownHeight = (element) => {
	const { top, bottom } = element.getBoundingClientRect();
	const height = element.ownerDocument.defaultView.innerHeight;
	return Math.max(0, Math.min(bottom, height) - Math.max(top, 0));
};

// The sections the user sees most of, then the header with the menu, scrolled away or not.
export const onScreen = (doc) => {
	const sections = sectionsOf(doc);
	const header = sections.find((section) =>
		section.querySelector(`[${BLOCK_TYPE}="core/navigation"]`),
	);
	const shown = sections
		.filter((section) => section !== header && shownHeight(section) > 0)
		.sort((a, b) => shownHeight(b) - shownHeight(a))
		.slice(0, SECTIONS_SHOWN);
	return [...sections.filter((section) => shown.includes(section)), header]
		.filter(Boolean)
		.flatMap((section) =>
			[section, ...section.querySelectorAll(`[${BLOCK}]`)].map((element) => ({
				id: element.getAttribute(BLOCK),
				type: element.getAttribute(BLOCK_TYPE),
				text: ownText(element),
				...iconOf(element),
				parent:
					element === section ? null : holderOf(element).getAttribute(BLOCK),
				where: section === header ? 'header' : 'section',
			})),
		)
		.slice(0, MOST_ON_SCREEN);
};

// Null in wp-admin, which has no site frame.
export const blocksOnScreen = () => {
	const doc = siteFrame()?.contentDocument;
	return doc ? onScreen(doc) : null;
};

const sectionName = (section) =>
	(section?.querySelector('h1, h2, h3, h4, h5, h6')?.textContent ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, SECTION_NAME_LENGTH);

// Alt text never shows, so the backend asks before changing a part matched only by it.
const hiddenOf = (element) => {
	const hidden = ownText(element, WORDS_LENGTH, { only: 'alts' });
	return hidden ? { hidden } : {};
};

// The heading of the card a block sits in, which tells a bare price apart.
const nearOf = (element) => {
	const holderAbove = (at) => at.parentElement?.closest(`[${BLOCK}]`);
	for (let at = holderAbove(element); at; at = holderAbove(at)) {
		const heading = [...at.querySelectorAll('h1, h2, h3, h4, h5, h6')].find(
			(each) => !element.contains(each),
		);
		if (heading) {
			return heading.textContent
				.replace(/\s+/g, ' ')
				.trim()
				.slice(0, SECTION_NAME_LENGTH);
		}
	}
	return '';
};

// The whole page, so words the user names are found off screen too.
export const pageWords = (doc) => {
	const sections = sectionsOf(doc);
	return [...doc.querySelectorAll(`[${BLOCK}]`)]
		.slice(0, MOST)
		.flatMap((element) => {
			const text = ownText(element, WORDS_LENGTH, { only: 'shown' });
			const { hidden } = hiddenOf(element);
			if (!text && !hidden) return [];
			const section = sections.find((each) => each.contains(element));
			const near = nearOf(element);
			return [
				{
					id: element.getAttribute(BLOCK),
					type: element.getAttribute(BLOCK_TYPE),
					text,
					...(hidden && { hidden }),
					...iconOf(element),
					...(near &&
						near !== sectionName(section) &&
						near !== text && { near }),
					onScreen: shownHeight(element) > 0,
					section: sectionName(section),
				},
			];
		});
};

// Off screen too, so a section can move beside any other.
export const pageOrder = (doc) =>
	sectionsOf(doc)
		.filter(
			(section) =>
				holderOf(section)?.getAttribute(BLOCK_TYPE) === 'core/post-content',
		)
		.map((section) => {
			// "Under its heading" needs the heading's id while the section is off screen.
			const heading = section
				.querySelector('h1, h2, h3, h4, h5, h6')
				?.closest(`[${BLOCK}]`);
			const text = insideOf(section) || ownText(section);
			// Two sections can share a heading, so a few words of its own tell them apart.
			const words = [...section.querySelectorAll(`[${BLOCK}]`)]
				.map((element) => ownText(element, SECTION_NAME_LENGTH))
				.find((own) => own && own !== text);
			return {
				id: section.getAttribute(BLOCK),
				type: section.getAttribute(BLOCK_TYPE),
				text,
				...(heading &&
					heading !== section && { heading: heading.getAttribute(BLOCK) }),
				...(words && { words }),
			};
		});

export const sectionsInOrder = () => {
	const doc = siteFrame()?.contentDocument;
	return doc ? pageOrder(doc) : null;
};

// Each section with its blocks, so a pattern can be found and a move or an add anchored inside it.
export const pageSections = (doc) =>
	sectionsOf(doc).map((section) => ({
		id: section.getAttribute(BLOCK),
		type: section.getAttribute(BLOCK_TYPE),
		onScreen: shownHeight(section) > 0,
		heading: sectionName(section),
		...(edgesOf(section) && { edges: edgesOf(section) }),
		blocks: [section, ...section.querySelectorAll(`[${BLOCK}]`)]
			.slice(0, MOST_IN_SECTION)
			.map((element) => ({
				id: element.getAttribute(BLOCK),
				type: element.getAttribute(BLOCK_TYPE),
				text: ownText(element),
				...hiddenOf(element),
				...iconOf(element),
				parent:
					element === section ? null : holderOf(element).getAttribute(BLOCK),
			})),
	}));

const PICTURES = [
	'core/image',
	'core/cover',
	'core/media-text',
	'core/gallery',
	'core/site-logo',
	'core/post-featured-image',
];

const areaOf = (element) => {
	if (element.closest('header')) return 'header';
	if (element.closest('footer')) return 'footer';
	return 'page';
};

// A box with no words of its own goes by what it holds, or two of them could only be told apart by number.
const insideOf = (element) => {
	if (!element.querySelector(`[${BLOCK}]`)) return '';
	const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
	return ((heading ?? element).textContent ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, SECTION_NAME_LENGTH);
};

const fileOf = (element) =>
	(element.querySelector('img')?.getAttribute('src') ?? '')
		.split('?')[0]
		.split('/')
		.pop()
		.slice(0, SECTION_NAME_LENGTH);

// How each looks and where it sits, since "the big heading" or "the logo" names no words.
export const pageParts = (doc, kind) => {
	const sections = sectionsOf(doc);
	return [...doc.querySelectorAll(`[${BLOCK}]`)]
		.slice(0, MOST)
		.filter(
			(element) =>
				kind !== 'picture' ||
				PICTURES.includes(element.getAttribute(BLOCK_TYPE)),
		)
		.map((element) => {
			const type = element.getAttribute(BLOCK_TYPE);
			const shown =
				type === 'core/button'
					? (element.querySelector('a, button') ?? element)
					: element;
			const style = doc.defaultView.getComputedStyle(shown);
			const { width, height } = element.getBoundingClientRect();
			const text = ownText(element);
			const inside = text ? '' : insideOf(element);
			const section = sectionName(
				sections.find((each) => each === element || each.contains(element)),
			);
			// A photo's alt is usually empty, so its card is all "Sam's picture" names.
			const near =
				text || inside || !PICTURES.includes(type) ? '' : nearOf(element);
			return {
				id: element.getAttribute(BLOCK),
				type,
				text,
				...hiddenOf(element),
				...iconOf(element),
				...(inside && { inside }),
				...(near && near !== section && { near }),
				onScreen: shownHeight(element) > 0,
				section,
				area: areaOf(element),
				tag: element.localName,
				size: style.fontSize,
				color: style.color,
				background: style.backgroundColor,
				...(edgesOf(element) && { edges: edgesOf(element) }),
				...(PICTURES.includes(type) && {
					file: fileOf(element),
					width: Math.round(width),
					height: Math.round(height),
				}),
			};
		});
};

// A button's colors are on its link, not the block around it.
const drawnOf = (element) =>
	element.getAttribute(BLOCK_TYPE) === 'core/button'
		? (element.querySelector('a, button') ?? element)
		: element;

const lookOf = (element) => {
	const shown = drawnOf(element);
	const style = element.ownerDocument.defaultView.getComputedStyle(shown);
	return {
		background: style.backgroundColor,
		color: style.color,
		border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
		radius: style.borderTopLeftRadius,
		font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily.split(',')[0]}`,
	};
};

// Plan research's read of the live page: the blocks a change could reach and how each looks.
export const readBlocks = (doc, { type, words, section } = {}) => {
	const within = section ? blockById(doc, section) : doc;
	if (!within) return [];
	const sections = sectionsOf(doc);
	const asked = words?.toLowerCase();
	return [...within.querySelectorAll(`[${BLOCK}]`)]
		.filter((element) => {
			const kind = element.getAttribute(BLOCK_TYPE) ?? '';
			return !type || kind === type || kind.endsWith(`/${type}`);
		})
		.filter(
			(element) => !asked || ownText(element).toLowerCase().includes(asked),
		)
		.slice(0, MOST_READ)
		.map((element) => ({
			id: element.getAttribute(BLOCK),
			type: element.getAttribute(BLOCK_TYPE),
			words: ownText(element),
			section: sectionName(
				sections.find((each) => each === element || each.contains(element)),
			),
			onScreen: shownHeight(element) > 0,
			...iconOf(element),
			look: lookOf(element),
		}));
};

// One block in full: the theme's colors and sizes it is set to, as its classes name them.
export const readBlock = (doc, id) => {
	const element = blockById(doc, id);
	if (!element) return null;
	const theme = [
		...new Set([...element.classList, ...drawnOf(element).classList]),
	].filter((name) =>
		/^has-[\w-]+-(color|background-color|font-size|gradient-background|border-color)$/.test(
			name,
		),
	);
	return {
		id,
		type: element.getAttribute(BLOCK_TYPE),
		words: ownText(element),
		...(theme.length && { theme }),
		look: lookOf(element),
		inner: [...element.querySelectorAll(`[${BLOCK}]`)]
			.slice(0, MOST_READ)
			.map((inner) => ({
				id: inner.getAttribute(BLOCK),
				type: inner.getAttribute(BLOCK_TYPE),
				words: ownText(inner),
			})),
	};
};
