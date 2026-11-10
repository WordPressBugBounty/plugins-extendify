import { paletteOf } from '@agentx/lib/adjust-colors';
import { editBlocks } from '@agentx/lib/edit-blocks';
import { presetsOf } from '@agentx/lib/presets';
import {
	beforePaints,
	keptColorsOf,
	paint,
	readableFix,
} from '@agentx/lib/readable-text';
import { shellDocument } from '@agentx/lib/shell-document';
import { track } from '@agentx/lib/track';
import { CustomColor, SaveButtons, SURFACE } from '@agentx/quick-edit/controls';
import { swatchesOf } from '@agentx/quick-edit/inline-color';
import { useBesidePart } from '@agentx/quick-edit/place';
import { quietPage } from '@agentx/quick-edit/quiet-page';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const PRESET = /^has-(.+)-background-color$/;
const GRADIENT = /^has-.+-gradient-background$/;

// A theme color's slug, or the section's own color as the page draws it.
export const backgroundOf = (block) =>
	[...block.classList].map((name) => PRESET.exec(name)?.[1]).find(Boolean) ??
	(block.style.backgroundColor || null);

// The color whose look the section keeps, and the class the page draws that look by.
const MARK = /^has-(.+)-look$/;
const DRAWN = /^section-look-\d+$/;

const colorClassesOf = (block) =>
	[...block.classList].filter(
		(name) =>
			name === 'has-background' ||
			[PRESET, GRADIENT, MARK, DRAWN].some((pattern) => pattern.test(name)),
	);

export const sourceOf = (block) => {
	const classes = [...block.classList];
	return (
		classes.map((name) => MARK.exec(name)?.[1]).find(Boolean) ??
		classes.map((name) => PRESET.exec(name)?.[1]).find(Boolean) ??
		/^var\(--wp--preset--color--([\w-]+)\)/.exec(
			block.style.backgroundColor,
		)?.[1] ??
		null
	);
};

// The design's rules for this section in its first color, redrawn in another, as saving keeps them.
export const lookOf = (block, source, color) => {
	const instance = [...block.classList].find((name) =>
		/^is-style-.+--\d+$/.test(name),
	);
	if (!instance || !source) return '';
	const gate = `\\.has-${source}-background-color(?![\\w-])`;
	const own = new RegExp(`\\.${instance}(\\.[\\w-]+)*${gate}`);
	return [...block.ownerDocument.styleSheets]
		.flatMap((sheet) => {
			try {
				return [...sheet.cssRules];
			} catch {
				return [];
			}
		})
		.filter((rule) => own.test(rule.selectorText ?? ''))
		.map((rule) =>
			rule.cssText
				.replace(new RegExp(gate, 'g'), '')
				.replaceAll(`var(--wp--preset--color--${source})`, color),
		)
		.join('\n');
};

const lookSheetOf = (block, id) =>
	[...block.ownerDocument.querySelectorAll('style[data-agentx-look]')].find(
		(sheet) => sheet.dataset.agentxLook === id,
	);

const showLook = (block, id, css) => {
	const sheet = lookSheetOf(block, id);
	if (!css) return sheet?.remove();
	if (sheet) {
		sheet.textContent = css;
		return;
	}
	const added = block.ownerDocument.createElement('style');
	added.dataset.agentxLook = id;
	added.textContent = css;
	block.ownerDocument.head.append(added);
};

const swapColorClasses = (block, classes) => {
	block.classList.remove(...colorClassesOf(block));
	block.classList.add(...classes);
};

// Empty on each page load, so the checkbox shows only once this load's own Save fixed the section's words.
const fixedSections = new Set();

const SWATCH =
	'agentx-focus size-6 shrink-0 cursor-pointer rounded-agentx-quick-edit-swatch border border-solid border-agentx-quick-edit-swatch-border p-0 aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-agentx-quick-edit-swatch-picked';

export const SectionBar = ({
	target,
	changed,
	commit = { current: null },
	onDone,
	onFailed,
	failed = null,
}) => {
	const { id, type, block } = target;
	const bar = useRef(null);
	const [before] = useState(() => ({
		color: backgroundOf(block),
		source: sourceOf(block),
		classes: colorClassesOf(block),
		style: block.getAttribute('style'),
		look: lookSheetOf(block, id)?.textContent ?? '',
	}));
	const [swatches] = useState(() => swatchesOf(presetsOf()));
	const [color, setColor] = useState(before.color);
	const [problem] = useState(failed);
	const [kept] = useState(() => keptColorsOf(block));
	const offered = fixedSections.has(id);
	const [fixing, setFixing] = useState(true);
	const fix = useRef(null);
	const unpaint = useRef(() => {});
	const saved = useRef(false);
	// Picking the color a section has again still saves the words' fix.
	changed.current = () =>
		color !== before.color || !fixing || Boolean(fix.current?.changes.length);

	// Like the agent's own color changes, the words take a color that reads, unless unchecked here.
	const showText = (fixed) => {
		unpaint.current();
		const colors = presetsOf().colors?.filter(({ custom }) => !custom);
		fix.current = fixed ? readableFix(block, paletteOf(colors)) : null;
		unpaint.current = paint(
			fixed ? (fix.current?.paints ?? []) : beforePaints(block, kept),
		);
	};

	const putBack = useRef(null);
	putBack.current = () => {
		unpaint.current();
		swapColorClasses(block, before.classes);
		showLook(block, id, before.look);
		if (before.style === null) block.removeAttribute('style');
		else block.setAttribute('style', before.style);
	};

	useEffect(() => {
		const quiet = quietPage(block, { typed: false });
		bar.current?.focus();
		return () => {
			quiet();
			if (!saved.current) putBack.current();
		};
	}, [block]);

	useBesidePart(bar, block, { inView: true });

	const pick = (value) => {
		setColor(value);
		const preset = swatches.some(({ slug }) => slug === value);
		const { source } = before;
		const look =
			value !== null && value !== source
				? lookOf(
						block,
						source,
						preset ? `var(--wp--preset--color--${value})` : value,
					)
				: '';
		const classes = [
			preset && `has-${value}-background-color`,
			'has-background',
			look && `has-${source}-look`,
		].filter(Boolean);
		// Designs draw waves and tones by the color class, so painting over it leaves them stale.
		swapColorClasses(block, value === null ? [] : classes);
		showLook(block, id, look);
		block.style.background = '';
		if (value !== null && !preset) block.style.backgroundColor = value;
		showText(fixing);
	};

	const autoFix = (fixed) => {
		setFixing(fixed);
		showText(fixed);
	};

	const save = async () => {
		saved.current = changed.current();
		onDone();
		if (!saved.current) return;
		const changes = fix.current?.changes ?? [];
		const ink = fix.current?.ink;
		try {
			const result = await editBlocks({
				ops: [
					{
						op: 'set-style',
						block: id,
						type,
						styles: color === before.color ? {} : { background_color: color },
						...(fixing
							? changes.length && { readable: { changes } }
							: { readable: { off: true } }),
						...(ink?.added && { names: { [ink.slug]: ink.name } }),
						direct: true,
					},
				],
			});
			if (result?.refused) throw new Error(result.refused);
			if (fixing && changes.length) fixedSections.add(id);
			track('quick-edit-saved', { kind: 'section' });
		} catch (error) {
			putBack.current();
			onFailed?.(
				error?.message ||
					// translators: Shown in Quick Edit when saving a section's background color failed.
					__("Couldn't save it. Please try again.", 'extendify-local'),
			);
		}
	};
	commit.current = save;

	const keys = useRef(null);
	keys.current = (event) => {
		// Escape or Enter typed in the chat box mustn't cancel or save the color.
		if (!bar.current?.contains(event.target) && event.target !== document.body)
			return;
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onDone();
		}
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			save();
		}
	};
	useEffect(() => {
		const listen = (event) => keys.current(event);
		document.addEventListener('keydown', listen);
		return () => document.removeEventListener('keydown', listen);
	}, []);

	return createPortal(
		<div
			ref={bar}
			data-agentx-editor=""
			role="dialog"
			tabIndex={-1}
			// translators: Screen reader name for Quick Edit's bar over a section of the user's website, for changing its background color.
			aria-label={__('Section background', 'extendify-local')}
			className={`group fixed top-0 left-0 z-100002 flex max-w-[calc(100vw-1rem)] flex-col gap-1 rounded-agentx-quick-edit p-1 outline-none ${SURFACE}`}
		>
			<div className="flex flex-wrap items-center gap-3 pl-2">
				<span className="text-agentx-quick-edit text-agentx-quick-edit-label">
					{
						// translators: Label of the color choices in Quick Edit's bar over a section of the user's website; they set the section's background color.
						__('Background', 'extendify-local')
					}
				</span>
				<fieldset
					// translators: Screen reader name for the color choices in Quick Edit's bar over a section of the user's website.
					aria-label={__('Background color', 'extendify-local')}
					className="m-0 flex max-w-80 flex-wrap items-center gap-2 border-0 p-0"
				>
					<button
						type="button"
						// translators: The first color choice in Quick Edit's bar over a section of the user's website; it takes the section's background color off.
						aria-label={__('No background', 'extendify-local')}
						aria-pressed={color === null}
						title={__('No background', 'extendify-local')}
						onClick={() => pick(null)}
						className={`${SWATCH} bg-[repeating-conic-gradient(#d1d5db_0_25%,#fff_0_50%)] bg-size-[8px_8px]`}
					/>
					{swatches.map((swatch) => (
						<button
							key={swatch.slug}
							type="button"
							aria-label={swatch.name}
							aria-pressed={color === swatch.slug}
							title={swatch.name}
							onClick={() => pick(swatch.slug)}
							style={{ background: swatch.css }}
							className={SWATCH}
						/>
					))}
					<CustomColor
						value={
							color && !swatches.some(({ slug }) => slug === color)
								? color
								: null
						}
						onPick={pick}
					/>
				</fieldset>
				<SaveButtons onCancel={onDone} onSave={save} />
			</div>
			{offered && (
				<label className="flex items-center gap-2 px-2 pb-1 text-agentx-quick-edit">
					<input
						type="checkbox"
						checked={fixing}
						onChange={(event) => autoFix(event.target.checked)}
						className="size-4 accent-agentx-checkbox"
					/>
					<span>
						{
							// translators: Checkbox in Quick Edit's bar for a section of the user's website, checked at first. While checked, the text in the section changes to a color that is easy to read on the background color the user picks; unchecked, the text keeps the colors it had. "Auto-fix" means the site fixes it on its own.
							__('Auto-fix text color for readability', 'extendify-local')
						}
					</span>
				</label>
			)}
			{problem && (
				<p
					role="alert"
					className="m-0 px-2 pb-1 text-agentx-quick-edit text-agentx-quick-edit-problem"
				>
					{problem}
				</p>
			)}
		</div>,
		shellDocument().body,
	);
};
