import { InlineCard } from '@agentx/chat/InlineCard';
import { TEXT_BUTTON } from '@agentx/chat/ResolveChanges';
import { CARD_PRIMARY, PRESS } from '@agentx/chat/styles';
import {
	customOption,
	fillOptions,
	paletteOf,
	reads,
	sameColor,
	textOptions,
} from '@agentx/lib/adjust-colors';
import { BLOCK, BLOCK_TYPE, siteFrame } from '@agentx/lib/block-box';
import { undoTo } from '@agentx/lib/draft-actions';
import { editBlocks } from '@agentx/lib/edit-blocks';
import { blockById } from '@agentx/lib/pick-block';
import { presetsOf } from '@agentx/lib/presets';
import { coverWhile } from '@agentx/lib/switch-site';
import { track } from '@agentx/lib/track';
import { useDraftStore } from '@agentx/state/draft';
import { landOnMove } from '@agentx/state/landings';
import { wrapUpColors } from '@agentx/state/nudges';
import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { check, color as colorIcon, Icon } from '@wordpress/icons';
import { colord } from 'colord';
import { HexColorInput, HexColorPicker } from 'react-colorful';

const CLEAR = /^(transparent|rgba\([^)]*,\s*0\))$/;

// A swatch close to the card's own color would vanish without an edge of its own.
const edgeOf = (value) =>
	colord(value).isLight()
		? colord(value).darken(0.25).toHex()
		: colord(value).lighten(0.15).toHex();

const SwatchButton = ({ value, label, checked, onClick }) => (
	<button
		type="button"
		aria-label={label}
		aria-pressed={checked}
		onClick={onClick}
		style={{ backgroundColor: value, borderColor: edgeOf(value) }}
		className={`agentx-focus flex size-10 items-center justify-center rounded-agentx-control border border-solid p-0 ${PRESS} disabled:opacity-[var(--agentx-disabled-opacity,60%)]`}
	>
		{checked && (
			<Icon
				icon={check}
				size={24}
				style={{
					fill: colord(value).isLight()
						? 'var(--color-agentx-swatch-check-dark)'
						: 'var(--color-agentx-swatch-check-light)',
				}}
			/>
		)}
	</button>
);

const elementOf = (doc, id) => (doc ? blockById(doc, id) : null);

// A button's look is its link's, not its wrapper's.
const drawnOf = (element) =>
	element?.getAttribute(BLOCK_TYPE) === 'core/button'
		? (element.querySelector('a, button') ?? element)
		: element;

const styleOf = (element) =>
	element?.ownerDocument?.defaultView?.getComputedStyle(element);

// A block with a clear background shows whatever is behind it.
const fillBehind = (element) => {
	for (let node = element; node?.nodeType === 1; node = node.parentElement) {
		const fill = styleOf(node)?.backgroundColor;
		if (fill && !CLEAR.test(fill)) return { node, fill };
	}
	return { node: null, fill: 'rgb(255, 255, 255)' };
};

const hexOf = (css) => {
	const color = colord(css ?? '');
	return color.isValid() ? color.toHex() : null;
};

const blockOf = (node) => {
	const block = node?.closest?.(`[${BLOCK}]`);
	return block
		? {
				block: block.getAttribute(BLOCK),
				type: block.getAttribute(BLOCK_TYPE),
			}
		: null;
};

// What the page shows now, read once, so a pick can always go back to it.
const shownNow = ({ background, text }) => {
	const doc = siteFrame()?.contentDocument;
	const words = text
		.map((target) => ({ ...target, element: elementOf(doc, target.block) }))
		.filter(({ element }) => element);
	const filled = background ? elementOf(doc, background.block) : null;
	const behind = fillBehind(drawnOf(filled ?? words[0]?.element));
	if (!filled && !words.length) return null;
	const fillBlock = background ?? blockOf(behind.node);
	return {
		background: fillBlock,
		text: words.length ? words : fillBlock ? [{ ...fillBlock }] : [],
		fill: hexOf(behind.fill) ?? '#ffffff',
		ink: hexOf(styleOf(drawnOf(words[0]?.element ?? filled))?.color),
	};
};

const settingOf = ({ type, setting }) =>
	type === 'core/social-links' ? 'icon_color' : (setting ?? 'text_color');

const named = (option) =>
	option.added ? { names: { [option.slug]: option.name } } : {};

// One op per block, so a block's fill and words make one change and one line.
// A color the theme lacks goes on as is while tried, and joins the theme's colors only when it's landed on.
const opsOf = (now, { background, text }, { landing = false } = {}) => {
	const settings = [
		...(background && now.background
			? [
					{
						...now.background,
						styles: { background_color: background.slug },
						option: background,
					},
				]
			: []),
		...(text
			? now.text.map((target) => ({
					...target,
					styles: { [settingOf(target)]: text.slug },
					option: text,
				}))
			: []),
	];
	const blocks = [...new Set(settings.map(({ block }) => block))];
	return blocks.map((block) => {
		const on = settings.filter((each) => each.block === block);
		const names = Object.assign(
			{},
			...on.map(({ option }) => (landing ? named(option).names : {})),
		);
		return {
			op: 'set-style',
			block,
			type: on[0].type,
			styles: Object.assign({}, ...on.map(({ styles }) => styles)),
			...(Object.keys(names).length && { names }),
		};
	});
};

// The browser's color window has no button to confirm a color, so the picker is our own.
const CustomSwatch = ({ value, onTry, onPick }) => {
	const [open, setOpen] = useState(false);
	const [hex, setHex] = useState(value ?? '#3b82f6');
	const swatch = useRef(null);
	const panel = useRef(null);

	const close = () => {
		onTry(null);
		setOpen(false);
	};
	const closing = useRef(close);
	closing.current = close;

	useEffect(() => {
		if (!open) return;
		// The card can sit low in the chat, leaving the picker's buttons below its fold.
		panel.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
		const outside = (event) => {
			if (
				swatch.current?.contains(event.target) ||
				panel.current?.contains(event.target)
			) {
				return;
			}
			closing.current();
		};
		document.addEventListener('pointerdown', outside);
		return () => document.removeEventListener('pointerdown', outside);
	}, [open]);

	const change = (next) => {
		setHex(next);
		onTry(next);
	};

	return (
		<>
			<Tooltip
				text={
					// translators: Shown over the rainbow swatch on the AI Agent's card for adjusting colors; it opens a picker for any color, not only the theme's.
					__('Custom color', 'extendify-local')
				}
			>
				<button
					ref={swatch}
					type="button"
					aria-expanded={open}
					aria-label={__('Custom color', 'extendify-local')}
					onClick={() => (open ? close() : setOpen(true))}
					style={value ? { backgroundColor: value } : undefined}
					className={`agentx-focus relative flex size-10 cursor-pointer items-center justify-center rounded-agentx-control border border-solid border-agentx-card-border p-0 ${PRESS} ${value ? '' : 'bg-[conic-gradient(#ef4444,#eab308,#22c55e,#06b6d4,#3b82f6,#d946ef,#ef4444)]'}`}
				>
					{value && (
						<Icon
							icon={check}
							size={24}
							style={{
								fill: colord(value).isLight()
									? 'var(--color-agentx-swatch-check-dark)'
									: 'var(--color-agentx-swatch-check-light)',
							}}
						/>
					)}
				</button>
			</Tooltip>
			{open && (
				<fieldset
					ref={panel}
					aria-label={__('Custom color', 'extendify-local')}
					onKeyDown={(event) => {
						if (event.key !== 'Escape') return;
						event.stopPropagation();
						close();
					}}
					className="m-0 flex min-w-0 basis-full flex-col gap-2 border-0 p-0"
				>
					<HexColorPicker
						color={hex}
						onChange={change}
						style={{ width: '100%', height: '8rem' }}
					/>
					<div className="flex items-center gap-2">
						<HexColorInput
							color={hex}
							onChange={change}
							prefixed
							aria-label={
								// translators: Screen reader name for the field holding a color's code, like #3B82F6, in the AI Agent's picker for any color.
								__('Color code', 'extendify-local')
							}
							className="agentx-focus h-8 w-24 min-w-0 rounded-agentx-control border border-agentx-field-border bg-agentx-field px-2 text-agentx-notice-body text-agentx-ink uppercase"
						/>
						<span className="flex-1" />
						<button type="button" onClick={close} className={TEXT_BUTTON}>
							{
								// translators: Button in the AI Agent's picker for any color; closes it and puts the page back as it was.
								__('Cancel', 'extendify-local')
							}
						</button>
						<button
							type="button"
							onClick={() => {
								setOpen(false);
								onPick(hex);
							}}
							className={CARD_PRIMARY}
						>
							{
								// translators: Button in the AI Agent's picker for any color; puts the chosen color on the part of the page.
								__('Use this color', 'extendify-local')
							}
						</button>
					</div>
				</fieldset>
			)}
		</>
	);
};

const Row = ({ label, options, current, picked, onPick, onTry }) => (
	<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
		<legend className="mb-2 p-0 text-agentx-caption text-agentx-card-subtitle">
			{label}
		</legend>
		<div className="flex flex-wrap gap-2">
			{current && (
				<Tooltip
					text={
						// translators: The first swatch on the AI Agent's color card, the color the part of the page has now.
						__('Current color', 'extendify-local')
					}
				>
					<SwatchButton
						value={current}
						label={__('Current color', 'extendify-local')}
						checked={!picked}
						onClick={() => onPick(null)}
					/>
				</Tooltip>
			)}
			{options.map((option) => (
				<Tooltip
					key={option.slug}
					text={`${option.name} · ${option.value.toUpperCase()}`}
				>
					<SwatchButton
						value={option.value}
						label={option.name}
						checked={picked?.slug === option.slug}
						onClick={() => onPick(option)}
					/>
				</Tooltip>
			))}
			<CustomSwatch
				value={picked?.custom ? picked.value : null}
				onTry={onTry}
				onPick={(hex) => onPick(customOption(hex))}
			/>
		</div>
	</fieldset>
);

// Each pick shows on the page at once; Continue keeps them.
export const AdjustColors = ({
	part,
	latest,
	takesFocus,
	movedOn,
	onOutput,
}) => {
	const done = Boolean(part.output?.continued);
	const [now] = useState(() =>
		part.demoState
			? (part.input?.shown ?? null)
			: done
				? null
				: shownNow(part.input ?? {}),
	);
	const [picked, setPicked] = useState({ background: null, text: null });
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	// The draft before the card's first pick, and how many changes its picks have left on it.
	const start = useRef(undefined);
	const tries = useRef(0);
	// A message sent while a pick is on its way waits for it, so the color it lands on is kept.
	const flight = useRef(null);
	const kept = useRef(picked);
	kept.current = picked;
	const inline = useRef(new Map());
	const [palette] = useState(() => paletteOf(presetsOf().colors));
	const fill = picked.background?.value ?? now?.fill;
	const fills = fillOptions(palette);
	const inks = fill ? textOptions(palette, fill) : [];

	const place = async (next) => {
		setBusy(true);
		setFailed(false);
		if (start.current === undefined) {
			start.current = useDraftStore.getState().current ?? 0;
		}
		const ops = opsOf(now, next);
		// No op unsets a style, so a row set back to its color restores the start.
		const back = (row) => Boolean(kept.current[row] && !next[row]);
		const restores = !ops.length || back('background') || back('text');
		const result = await coverWhile(async () => {
			if (restores) await undoTo(start.current).catch(() => {});
			return ops.length ? editBlocks({ ops }).catch(() => null) : { done: [] };
		});
		setBusy(false);
		if (ops.length && !result?.done?.length) {
			setFailed(true);
			return;
		}
		tries.current = restores ? Number(ops.length > 0) : tries.current + 1;
		kept.current = next;
		setPicked(next);
		// Saved as each pick lands, worded as the edit's own step, so a typed message still leaves it.
		onOutput?.(
			ops.length
				? { picked: true, done: result.done.join(', ') }
				: { picked: false, done: null },
		);
	};

	// One call a pick, on top of the last, so the page shows it at once.
	const pick = (next) => {
		if (busy || !now) return;
		inline.current.clear();
		if (part.demoState) {
			setPicked(next);
			return;
		}
		flight.current = place(next);
	};

	// A fill the words no longer read on takes the text color that reads best, as the agent's own change did.
	const pickFill = (background) => {
		const behind = background?.value ?? now.fill;
		const readsOn = (ink) => Boolean(ink) && reads(ink, behind);
		const text = readsOn(picked.text?.value ?? now.ink)
			? picked.text
			: readsOn(now.ink)
				? null
				: (textOptions(palette, behind)[0] ?? picked.text);
		track('adjust-colors-picked', { row: 'background' });
		pick({ background, text });
	};

	const pickText = (text) => {
		track('adjust-colors-picked', { row: 'text' });
		pick({ ...picked, text });
	};

	// One change for the card, so one undo takes its colors back; a new color gets its theme name.
	const land = async () => {
		await flight.current;
		const picks = kept.current;
		const naming = Boolean(picks.background?.added || picks.text?.added);
		if (!now || (tries.current < 2 && !naming)) return;
		const ops = opsOf(now, picks, { landing: naming });
		const result = await coverWhile(async () => {
			await undoTo(start.current).catch(() => {});
			return ops.length ? editBlocks({ ops }).catch(() => null) : { done: [] };
		});
		tries.current = Number(ops.length > 0);
		if (result?.done?.length) {
			onOutput?.({ picked: true, done: result.done.join(', ') });
		}
	};

	useEffect(
		() =>
			done || movedOn || part.demoState
				? undefined
				: landOnMove(part.toolCallId, land),
		[done, movedOn],
	);

	// The picker shows its color on the page as it moves; Use this color makes the change.
	// A block's own color can sit inline too, so Cancel puts back what was there, not nothing.
	const tryOn = (setting) => (hex) => {
		if (busy || !now || part.demoState) return;
		const doc = siteFrame()?.contentDocument;
		const targets =
			setting === 'background'
				? [now.background]
				: now.text.filter(({ type }) => type !== 'core/social-links');
		const property = setting === 'background' ? 'background-color' : 'color';
		for (const target of targets) {
			const element = drawnOf(elementOf(doc, target?.block));
			if (!element) continue;
			const key = `${target.block} ${property}`;
			if (!inline.current.has(key)) {
				inline.current.set(key, element.style.getPropertyValue(property));
			}
			const shown = hex ?? inline.current.get(key);
			if (shown) element.style.setProperty(property, shown);
			else element.style.removeProperty(property);
			if (!hex) inline.current.delete(key);
		}
	};

	const goOn = async () => {
		if (busy || part.demoState) return;
		track('adjust-colors-continued', {
			changed: Boolean(picked.background || picked.text),
		});
		setBusy(true);
		await land().catch(() => {});
		setBusy(false);
		onOutput?.({ continued: true });
		wrapUpColors();
	};

	// Once it ends, the card is a step like any tool call: the colors picked, or nothing.
	if (done || movedOn) {
		return part.output?.done ? (
			<p className="m-0 text-agentx-body text-agentx-steps">
				{part.output.done}
			</p>
		) : null;
	}

	const icons = now?.text.every(({ type }) => type === 'core/social-links');
	return (
		<InlineCard
			part={part}
			latest={latest}
			holds
			takesFocus={takesFocus}
			icon={colorIcon}
			// translators: Heading of the AI Agent's card for adjusting the background and text colors it just changed so the words on that part of the page read.
			title={__('Adjust colors', 'extendify-local')}
			subtitle={
				// translators: Shown under the heading of the AI Agent's card for adjusting a background and text color; each color shows on the site as soon as it is picked.
				__('Pick a background and a text color.', 'extendify-local')
			}
		>
			{!now ? (
				<p className="m-0 text-agentx-notice-muted">
					{
						// translators: Shown on the AI Agent's color card when the part of the page it was for has been taken off.
						__("That part isn't on the page anymore.", 'extendify-local')
					}
				</p>
			) : (
				<fieldset
					disabled={busy}
					className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0"
				>
					{now?.background && (
						<Row
							// translators: Label of the row of background colors on the AI Agent's card for adjusting colors.
							label={__('Background', 'extendify-local')}
							options={fills.filter(({ value }) => !sameColor(value, now.fill))}
							current={now.fill}
							picked={picked.background}
							onPick={pickFill}
							onTry={tryOn('background')}
						/>
					)}
					<Row
						label={
							icons
								? // translators: Label of the row of icon colors on the AI Agent's card for adjusting colors.
									__('Icons', 'extendify-local')
								: // translators: Label of the row of text colors on the AI Agent's card for adjusting colors.
									__('Text', 'extendify-local')
						}
						options={inks.filter(({ value }) => !sameColor(value, now?.ink))}
						current={now?.ink}
						picked={picked.text}
						onPick={pickText}
						onTry={tryOn('text')}
					/>
					{failed && (
						<p
							role="alert"
							className="m-0 text-agentx-caption text-agentx-alert"
						>
							{
								// translators: Shown on the AI Agent's color card when the color couldn't be put on the page.
								__("Couldn't change the color. Try again.", 'extendify-local')
							}
						</p>
					)}
					<button
						type="button"
						onClick={goOn}
						className={`${CARD_PRIMARY} self-end`}
					>
						{
							// translators: Button on the AI Agent's card for adjusting colors that keeps the colors the page shows and moves on; each color picked was already put on the page.
							__('Continue', 'extendify-local')
						}
					</button>
				</fieldset>
			)}
		</InlineCard>
	);
};
