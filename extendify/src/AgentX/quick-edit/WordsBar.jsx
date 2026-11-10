import { presetsOf } from '@agentx/lib/presets';
import { shellDocument } from '@agentx/lib/shell-document';
import {
	AlignButtons,
	AWAY,
	ButtonStyles,
	ColorMenu,
	Divider,
	DragHandle,
	FormatButtons,
	LevelMenu,
	LinkEditor,
	POPOVER,
	SaveButtons,
	SURFACE,
} from '@agentx/quick-edit/controls';
import { FieldPanel, fieldOf } from '@agentx/quick-edit/FieldPanel';
import {
	colorWords,
	selectSpan,
	spanOf,
	swatchesOf,
} from '@agentx/quick-edit/inline-color';
import {
	keepTypingInLinks,
	linkAt,
	setLink,
	unlink,
} from '@agentx/quick-edit/link';
import { useBesidePart } from '@agentx/quick-edit/place';
import { quietPage } from '@agentx/quick-edit/quiet-page';
import { useWordsEdit } from '@agentx/quick-edit/use-words-edit';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Words with links and colors of their own; a button's or menu item's look comes from the theme.
const PROSE = [
	'core/paragraph',
	'core/heading',
	'core/list-item',
	'core/verse',
	'core/preformatted',
];
const ALIGNED = ['core/paragraph', 'core/heading'];

const buttonColor = (style) =>
	style === 'outline' ? 'text_color' : 'background_color';

export const WordsBar = ({
	target,
	changed,
	commit = { current: null },
	onDone,
	onFailed,
	failed = null,
}) => {
	const { words, type } = target;
	// Only the text of these is kept, so there's nothing to format.
	const plain = Boolean(
		(target.plugin && !target.rich) || target.live || target.title,
	);
	const doc = words.ownerDocument;
	const bar = useRef(null);
	const edit = useWordsEdit(target, { onDone, onFailed, failed });
	changed.current = edit.changed;
	commit.current = edit.save;
	const [open, setOpen] = useState(null);
	const [linking, setLinking] = useState(null);
	const [linked, setLinked] = useState(false);
	const [swatches] = useState(() => swatchesOf(presetsOf()));
	const [field] = useState(() => (target.form ? fieldOf(words) : null));
	// The selection as the colors opened, kept by character, since the color picker takes focus from the words.
	const span = useRef(null);
	// A button's picked color: untouched, cleared (null), or a value with how it shows.
	const [tint, setTint] = useState(undefined);

	const back = () => {
		setOpen(null);
		setLinking(null);
		words.focus();
	};

	const onEscape = (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (open || linking) back();
		else edit.cancel();
	};

	const pageKeys = useRef(null);
	pageKeys.current = (event) => {
		// Enter also ends a word typed through an input method, like Japanese.
		if (event.isComposing) return;
		if (event.key === 'Escape') onEscape(event);
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			edit.save();
		}
		// A question's words sit in its toggle, where Space would open or close it instead of typing.
		if (event.key === ' ' && words.closest('summary, button')) {
			event.preventDefault();
			doc.execCommand('insertText', false, ' ');
		}
	};

	// In the bar, plain Enter presses the button or applies the field it's on.
	const barKeys = useRef(null);
	barKeys.current = (event) => {
		// Escape or Cmd+Enter typed in the chat box mustn't cancel or save these words.
		if (!bar.current?.contains(event.target)) return;
		if (event.key === 'Escape') onEscape(event);
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			edit.save();
		}
	};

	useEffect(() => {
		if (!field) {
			words.setAttribute('contenteditable', 'true');
			words.focus();
			const selection = doc.getSelection();
			selection?.selectAllChildren(words);
			selection?.collapseToEnd();
		}
		const quiet = quietPage(words, { typed: !field });
		const keep = field ? null : keepTypingInLinks(words);
		const listening = new AbortController();
		const { signal } = listening;
		// Elsewhere, a press would take the caret and a click would follow a link.
		const outside = (event) => {
			setOpen(null);
			if (words.contains(event.target)) {
				// A menu item's words sit inside its link, and a question's inside its toggle.
				if (
					event.type === 'click' &&
					event.target.closest('a, button, summary')
				) {
					event.preventDefault();
					event.stopPropagation();
				}
				return;
			}
			event.preventDefault();
			event.stopPropagation();
		};
		doc.addEventListener('mousedown', outside, { capture: true, signal });
		doc.addEventListener('click', outside, { capture: true, signal });
		doc.addEventListener('keydown', (event) => pageKeys.current(event), {
			capture: true,
			signal,
		});
		doc.addEventListener(
			'selectionchange',
			() => setLinked(Boolean(linkAt(doc.getSelection(), words))),
			{ signal },
		);
		document.addEventListener('keydown', (event) => barKeys.current(event), {
			signal,
		});
		document.addEventListener(
			'mousedown',
			(event) => {
				if (!bar.current?.contains(event.target)) setOpen(null);
			},
			{ signal },
		);
		return () => {
			listening.abort();
			quiet();
			keep?.();
			// The page keeps its own selection and focus, so the words would stay highlighted.
			doc.getSelection()?.removeAllRanges();
			words.blur();
			words.removeAttribute('contenteditable');
		};
	}, [words, doc, field]);

	const drag = useBesidePart(bar, words);

	const run = (command) => {
		words.focus();
		doc.execCommand(command);
	};

	const toggle = (name) => {
		if (!['level', 'style'].includes(name) && open !== name) {
			const selection = doc.getSelection();
			span.current = spanOf(
				words,
				selection?.rangeCount ? selection.getRangeAt(0) : null,
			);
		}
		setOpen((now) => (now === name ? null : name));
	};

	const paint = (kind, color) =>
		colorWords(words, span.current ?? { start: 0, end: 0 }, kind, color);

	const painted = () => {
		back();
		if (span.current) selectSpan(words, span.current);
	};

	const paintButton = (next) => {
		setTint(next);
		if (!next) {
			// The site's own button has no fill or line color of its own.
			edit.change('background_color', null);
			edit.change('text_color', null);
			return;
		}
		edit.change(buttonColor(edit.look.block_style), next.value, {
			css: next.css,
		});
	};

	const pickStyle = (style) => {
		edit.change('block_style', style);
		if (!tint) return;
		edit.change(buttonColor(edit.look.block_style), undefined);
		edit.change(buttonColor(style), tint.value, { css: tint.css });
	};

	const startLink = () => {
		const selection = doc.getSelection();
		setOpen(null);
		if (edit.ownLink) {
			setLinking({ own: true });
			return;
		}
		setLinking({
			range: selection?.rangeCount
				? selection.getRangeAt(0).cloneRange()
				: null,
			link: linkAt(selection, words),
		});
	};

	const endLink = (choice, { save = false } = {}) => {
		const now = linking;
		back();
		if (!choice || !now) return;
		if (now.own) {
			edit.changeLink(choice);
			if (save) edit.save();
			return;
		}
		const anchor = setLink(words, now, choice);
		doc.getSelection()?.selectAllChildren(anchor);
		if (save) edit.save();
	};

	const removeLink = () => {
		const now = linking;
		back();
		if (now?.link) unlink(now.link);
	};

	const colors = (kind) => (
		<ColorMenu
			kind={kind}
			open={open === kind}
			onToggle={() => toggle(kind)}
			swatches={swatches}
			onPick={(swatch) => {
				paint(
					kind,
					kind === 'text' ? { slug: swatch.slug } : { value: swatch.css },
				);
				painted();
			}}
			onCustom={(value) => paint(kind, { value })}
			onCustomDone={painted}
			onClear={() => {
				paint(kind, null);
				painted();
			}}
		/>
	);

	return createPortal(
		<div
			ref={bar}
			data-agentx-editor=""
			role="toolbar"
			// translators: Screen reader name for the bar over the words being edited on the user's website, with bold, colors, alignment and save.
			aria-label={__('Quick Edit', 'extendify-local')}
			className={`group fixed top-0 left-0 z-100002 flex flex-col gap-1 rounded-agentx-quick-edit p-1 ${SURFACE}`}
		>
			{field ? (
				<>
					<FieldPanel
						field={field}
						onChange={edit.setMore}
						onLabel={(value) => {
							words.textContent = value;
						}}
						onSave={edit.save}
					/>
					{/* Next to the label on either side, or a tall panel hung below it pushes Save off the screen. */}
					<div className="flex items-center group-data-[side=below]:order-first">
						<DragHandle onPointerDown={drag} />
						<span className="flex-1" />
						<SaveButtons onCancel={edit.cancel} onSave={edit.save} />
					</div>
				</>
			) : (
				<div className="flex items-center gap-0.5">
					{linking ? (
						<LinkEditor
							link={
								linking.own
									? edit.ownLink
									: linking.link && {
											href: linking.link.getAttribute('href') ?? '',
											newTab: linking.link.getAttribute('target') === '_blank',
										}
							}
							onApply={endLink}
							onRemove={linking.own ? null : removeLink}
							onClose={() => endLink(null)}
						/>
					) : (
						<>
							{type === 'core/heading' && (
								<>
									<LevelMenu
										level={edit.look.heading_level ?? 2}
										open={open === 'level'}
										onToggle={() => toggle('level')}
										onPick={(level) => {
											edit.change('heading_level', level);
											back();
										}}
									/>
									<Divider />
								</>
							)}
							{!plain && (
								<>
									<FormatButtons
										run={run}
										onLink={
											PROSE.includes(type) || edit.ownLink ? startLink : null
										}
										linked={linked}
									/>
									<Divider />
								</>
							)}
							{type === 'core/button' && (
								<>
									<ButtonStyles
										value={edit.look.block_style}
										open={open === 'style'}
										onToggle={() => toggle('style')}
										onPick={(style) => {
											pickStyle(style);
											back();
										}}
									/>
									<ColorMenu
										kind="button"
										open={open === 'button'}
										onToggle={() => toggle('button')}
										swatches={swatches}
										onPick={(swatch) => {
											paintButton({ value: swatch.slug, css: swatch.css });
											back();
										}}
										onCustom={(value) => paintButton({ value, css: value })}
										onCustomDone={back}
										onClear={() => {
											paintButton(null);
											back();
										}}
									/>
									<Divider />
								</>
							)}
							{PROSE.includes(type) && (
								<>
									{colors('text')}
									{colors('highlight')}
									<Divider />
								</>
							)}
							{ALIGNED.includes(type) && (
								<>
									<AlignButtons
										value={edit.look.text_align}
										onChange={edit.change}
									/>
									<Divider />
								</>
							)}
							<SaveButtons onCancel={edit.cancel} onSave={edit.save} />
						</>
					)}
				</div>
			)}
			{edit.problem && (
				<p
					role="alert"
					className={`${AWAY} m-0 w-72 rounded-agentx-quick-edit px-3 py-2 text-agentx-quick-edit ${POPOVER}`}
				>
					{edit.problem}
				</p>
			)}
		</div>,
		shellDocument().body,
	);
};
