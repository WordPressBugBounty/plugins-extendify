import { saveWords } from '@agentx/lib/quick-edit';
import { track } from '@agentx/lib/track';
import { contactHref, lookOf, saveEdit } from '@agentx/quick-edit/save';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const HEADING_LOOK = [
	'fontSize',
	'lineHeight',
	'fontWeight',
	'fontFamily',
	'fontStyle',
	'letterSpacing',
	'textTransform',
];

// The tag changes only on save, so preview the theme's look for that level.
const showLevel = (words, level, style) => {
	const probe = words.ownerDocument.createElement(`h${level}`);
	probe.className = words.className;
	if (style) probe.setAttribute('style', style);
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	words.after(probe);
	const look = probe.ownerDocument.defaultView.getComputedStyle(probe);
	for (const name of HEADING_LOOK) words.style[name] = look[name];
	probe.remove();
};

// Saved with set-link, since a button's address isn't a link in its words.
const OWN_LINK = [
	'core/button',
	'core/navigation-link',
	'core/navigation-submenu',
];

// A button's look classes, numbered ones too, as the draft's Fill and Outline swap them.
const BUTTON_LOOK =
	/^is-style-((fill|outline|ext-(secondary|ghost|soft|link|destructive))(--\d+)?|ext-preset--button--.+)$/;

const looksOf = (classes) => classes.filter((name) => BUTTON_LOOK.test(name));

// A theme look like Secondary is neither, so either can be picked from it.
const styleOf = (classes) => {
	if (classes.includes('is-style-outline')) return 'outline';
	return classes.some((name) =>
		/^is-style-ext-(secondary|ghost|soft|link|destructive)$/.test(name),
	)
		? null
		: 'fill';
};

// WordPress prints a style's CSS only for the buttons wearing it, so another one's classes show it.
const borrowed = (button, style) => {
	const other = [
		...button.ownerDocument.querySelectorAll('.wp-block-button'),
	].find((each) => {
		if (each === button) return false;
		const classes = [...each.classList];
		return style === 'outline'
			? classes.includes('is-style-outline')
			: classes.some((name) =>
					name.startsWith('is-style-ext-preset--button--'),
				);
	});
	return other ? looksOf([...other.classList]) : null;
};

// WordPress's own outline, drawn until saved when no button on the page wears one.
const OUTLINE = {
	borderWidth: '2px',
	borderStyle: 'solid',
	borderColor: 'currentColor',
	color: 'inherit',
	background: 'transparent none',
	padding: '0.667em 1.33em',
};

// Where the draft keeps a button's color: its fill, or the outline's line and words.
const BUTTON_COLOR = {
	background_color: {
		properties: ['backgroundColor'],
		classes: /^has-(.+-background-color|background)$/,
	},
	text_color: {
		properties: ['color', 'borderColor'],
		classes: /^has-(.+-color|text-color)$/,
	},
};

export const useWordsEdit = (target, { onDone, onFailed, failed = null }) => {
	const { id, type, words } = target;
	const anchor = OWN_LINK.includes(type) ? words.closest('a') : null;
	const button = type === 'core/button' ? target.block : null;
	const [before] = useState(() => ({
		html: words.innerHTML,
		style: words.getAttribute('style'),
		wordsClass: words.className,
		blockClass: button?.className ?? '',
		look: {
			...lookOf(words),
			...(button && { block_style: styleOf([...button.classList]) }),
		},
		href: anchor?.getAttribute('href') ?? null,
		target: anchor?.getAttribute('target') ?? null,
	}));
	// A ref: Cmd+Enter in the link field sets it and saves before a rerender.
	const link = useRef(null);
	const [look, setLook] = useState(before.look);
	// A form field's other settings from its panel, saved with its label.
	const [more, setMore] = useState({});
	const [problem] = useState(failed);
	const saved = useRef(false);
	// The words once their marks are off, which is where a change starts.
	const start = useRef(null);
	const done = useRef(onDone);
	done.current = onDone;
	const refused = useRef(onFailed);
	refused.current = onFailed;

	const putBack = useRef(null);
	putBack.current = () => {
		words.innerHTML = before.html;
		if (before.style === null) words.removeAttribute('style');
		else words.setAttribute('style', before.style);
		words.className = before.wordsClass;
		if (button) button.className = before.blockClass;
		if (!anchor) return;
		anchor.setAttribute('href', before.href ?? '');
		if (before.target === null) anchor.removeAttribute('target');
		else anchor.setAttribute('target', before.target);
	};

	useEffect(() => {
		if (target.marks) {
			for (const mark of words.querySelectorAll(target.marks)) mark.remove();
		}
		// The page shows an excerpt cut short, so editing starts from all of it.
		if (target.full !== undefined) words.textContent = target.full;
		start.current = words.innerHTML;
		// The page's own focus outline would draw a second ring inside Quick Edit's.
		words.style.outline = 'none';
		return () => {
			words.style.removeProperty('outline');
			if (!saved.current) putBack.current();
		};
	}, [words, target]);

	// The page shows it at once, as WordPress will render it once saved.
	const change = (setting, value, { css = null } = {}) => {
		if (setting === 'text_align') words.style.textAlign = value;
		if (setting === 'heading_level') showLevel(words, value, before.style);
		if (setting === 'block_style' && button) {
			const own = value === before.look.block_style;
			const shown = own
				? looksOf(before.blockClass.split(/\s+/))
				: borrowed(button, value);
			const kept = [...button.classList].filter(
				(name) => !BUTTON_LOOK.test(name),
			);
			const fallback = value === 'outline' ? ['is-style-outline'] : [];
			button.className = [...kept, ...(shown ?? fallback)].join(' ');
			const drawn = !shown && value === 'outline';
			const original = document.createElement('a');
			original.setAttribute('style', before.style ?? '');
			for (const [property, css] of Object.entries(OUTLINE)) {
				words.style[property] = drawn ? css : original.style[property];
			}
		}
		const color = button && BUTTON_COLOR[setting];
		if (color) {
			for (const property of color.properties)
				words.style[property] = css ?? '';
			// Cleared, the button shows the design's color, not the one saved on it.
			if (value === null) {
				for (const name of [...words.classList]) {
					if (color.classes.test(name)) words.classList.remove(name);
				}
			}
			if (value === undefined) {
				for (const name of before.wordsClass.split(/\s+/)) {
					if (color.classes.test(name)) words.classList.add(name);
				}
			}
		}
		setLook((now) => ({ ...now, [setting]: value }));
	};

	const changeLink = ({ href, newTab }) => {
		anchor.setAttribute('href', href);
		if (newTab) anchor.setAttribute('target', '_blank');
		else anchor.removeAttribute('target');
		link.current = { url: href, newTab };
	};

	const ownLink = () => {
		if (link.current || !anchor) return link.current;
		const href = anchor.getAttribute('href') ?? '';
		const next = contactHref(href, words.textContent.trim());
		return next && next !== href ? { url: next } : null;
	};

	const save = async () => {
		if (!changed()) {
			done.current();
			return;
		}
		// Emptied words would leave an empty block behind; removing it is its own change.
		if (!words.textContent.trim()) {
			done.current();
			return;
		}
		const styles = Object.fromEntries(
			Object.entries(look).filter(
				([name, value]) => before.look[name] !== value,
			),
		);
		// Plugin, setting and title words save through their owner, with no look of their own.
		const pending =
			target.plugin || target.live || target.title
				? // The draft answers a refusal or an ask; a live save fails by throwing.
					saveWords(target, words.innerHTML, { more }).then((result) =>
						Array.isArray(result?.done) ? result : {},
					)
				: saveEdit(
						{ id, type },
						{
							html: words.innerHTML,
							before: before.html,
							styles,
							link: ownLink(),
						},
					);
		saved.current = true;
		done.current();
		const result = await pending.catch((error) => ({
			refused: error?.message || 'error',
		}));
		if (result?.refused || result?.confirm) {
			putBack.current();
			refused.current?.(
				result.confirm
					? // translators: Shown in Quick Edit when the edited words sit in a part shared by several pages of the user's website, which it can't save yet.
						__(
							'This part shows on other pages too, so it can’t be changed here yet.',
							'extendify-local',
						)
					: result.refused,
			);
			return;
		}
		track('quick-edit-saved', { kind: 'words' });
	};

	const changed = () =>
		Object.keys(more).length > 0 ||
		Boolean(link.current) ||
		words.innerHTML !== start.current ||
		Object.entries(look).some(([name, value]) => before.look[name] !== value);

	return {
		look,
		change,
		changed,
		ownLink: anchor && {
			href: anchor.getAttribute('href') ?? '',
			newTab: anchor.getAttribute('target') === '_blank',
		},
		changeLink,
		more,
		setMore,
		save,
		problem,
		cancel: () => done.current(),
	};
};
