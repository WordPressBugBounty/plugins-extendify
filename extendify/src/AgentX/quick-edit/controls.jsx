import { hrefOf, isAddress, searchPages } from '@agentx/quick-edit/link';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	alignCenter,
	alignLeft,
	alignRight,
	chevronDown,
	dragHandle,
	external,
	formatBold,
	formatItalic,
	Icon,
	link,
	linkOff,
} from '@wordpress/icons';

export const SURFACE =
	'bg-agentx-quick-edit-bar font-agentx text-agentx-quick-edit-bar-ink shadow-(--agentx-quick-edit-bar-shadow)';

export const POPOVER =
	'bg-agentx-quick-edit-popover font-agentx text-agentx-quick-edit-popover-ink shadow-(--agentx-quick-edit-bar-shadow)';

const TOOL =
	'agentx-focus inline-flex size-8 shrink-0 items-center justify-center rounded-agentx-quick-edit-control border-0 bg-transparent p-0 text-agentx-quick-edit-tool-ink hover:bg-agentx-quick-edit-tool-hover aria-expanded:bg-agentx-quick-edit-tool-pressed aria-pressed:bg-agentx-quick-edit-tool-pressed aria-selected:bg-agentx-quick-edit-tool-pressed';

export const TEXT_BUTTON =
	'agentx-focus inline-flex h-8 shrink-0 items-center justify-center rounded-agentx-quick-edit-control border-0 px-3 text-agentx-quick-edit font-agentx-quick-edit disabled:opacity-[var(--agentx-disabled-opacity,60%)]';

export const FIELD =
	'h-8 rounded-agentx-quick-edit-control border border-solid border-agentx-quick-edit-field-border bg-agentx-quick-edit-field px-2 text-agentx-quick-edit text-agentx-quick-edit-field-ink outline-none focus:border-agentx-quick-edit-field-focus';

// Opens on the bar's far side from the words, so they stay in view.
export const AWAY =
	'absolute left-0 z-10 group-data-[side=above]:bottom-full group-data-[side=above]:mb-3 group-data-[side=below]:top-full group-data-[side=below]:mt-3';

const LEVELS = [1, 2, 3, 4, 5, 6];

// A press would take focus from the words, and with it their selection.
export const keepFocus = (event) => event.preventDefault();

export const Divider = () => (
	<span
		aria-hidden="true"
		className="mx-1 h-5 w-px shrink-0 bg-agentx-quick-edit-divider"
	/>
);

export const ToolButton = ({ icon, label, onPress, pressed }) => (
	<button
		type="button"
		aria-label={label}
		aria-pressed={pressed}
		title={label}
		onMouseDown={keepFocus}
		onClick={onPress}
		className={TOOL}
	>
		<Icon icon={icon} size={24} className="fill-current" />
	</button>
);

export const FormatButtons = ({ run, onLink, linked }) => (
	<>
		<ToolButton
			icon={formatBold}
			// translators: Button on the Quick Edit toolbar that makes the selected words on the user's website bold.
			label={__('Bold', 'extendify-local')}
			onPress={() => run('bold')}
		/>
		<ToolButton
			icon={formatItalic}
			// translators: Button on the Quick Edit toolbar that makes the selected words on the user's website italic.
			label={__('Italic', 'extendify-local')}
			onPress={() => run('italic')}
		/>
		{onLink && (
			<ToolButton
				icon={link}
				// translators: Button on the Quick Edit toolbar that turns the selected words on the user's website into a link, changes the link the cursor is in, or changes where a button goes.
				label={__('Link', 'extendify-local')}
				onPress={onLink}
				pressed={linked}
			/>
		)}
	</>
);

export const LevelMenu = ({ level, open, onToggle, onPick }) => (
	<span className="relative inline-flex">
		<button
			type="button"
			// translators: Button on the Quick Edit toolbar that picks how big a heading on the user's website is, from Heading 1 to Heading 6.
			aria-label={__('Heading level', 'extendify-local')}
			aria-expanded={open}
			title={__('Heading level', 'extendify-local')}
			onMouseDown={keepFocus}
			onClick={onToggle}
			className={`${TOOL} text-agentx-quick-edit font-semibold`}
		>
			{`H${level}`}
		</button>
		{open && (
			<div
				role="listbox"
				aria-label={__('Heading level', 'extendify-local')}
				className={`${AWAY} flex gap-0.5 rounded-agentx-quick-edit p-1 ${POPOVER}`}
			>
				{LEVELS.map((n) => (
					<button
						key={n}
						type="button"
						role="option"
						aria-selected={n === level}
						aria-label={sprintf(
							// translators: %d is a heading level from 1 to 6, offered on the Quick Edit toolbar.
							__('Heading %d', 'extendify-local'),
							n,
						)}
						onMouseDown={keepFocus}
						onClick={() => onPick(n)}
						className={`${TOOL} text-agentx-quick-edit font-semibold`}
					>
						{`H${n}`}
					</button>
				))}
			</div>
		)}
	</span>
);

const COLOR_LABELS = {
	// translators: Button on the Quick Edit toolbar that colors the selected words on the user's website.
	text: __('Text color', 'extendify-local'),
	// translators: Button on the Quick Edit toolbar that puts a colored background behind the selected words on the user's website, like a highlighter pen.
	highlight: __('Highlight', 'extendify-local'),
	// translators: Button on the Quick Edit toolbar over a button on the user's website; it picks the button's color.
	button: __('Button color', 'extendify-local'),
};

const CLEAR_LABELS = {
	// translators: Button in Quick Edit's text color choices that takes the color off the selected words.
	text: __('Clear text color', 'extendify-local'),
	// translators: Button in Quick Edit's highlight choices that takes the highlight off the selected words.
	highlight: __('Clear highlight', 'extendify-local'),
	// translators: Button in Quick Edit's color choices for a button on the user's website; it puts back the color the site's design gives buttons.
	button: __('Use the site’s button color', 'extendify-local'),
};

export const Choices = ({ id, label, value, options, onChange }) => (
	<span className="relative inline-flex shrink-0">
		<select
			id={id}
			aria-label={label}
			value={value ?? ''}
			onChange={(event) => onChange(event.target.value)}
			className={`${FIELD} cursor-pointer appearance-none pe-8`}
		>
			{options.map(([option, name]) => (
				<option key={option} value={option}>
					{name}
				</option>
			))}
		</select>
		<Icon
			icon={chevronDown}
			size={20}
			className="pointer-events-none absolute end-1.5 top-1/2 -translate-y-1/2 fill-current"
		/>
	</span>
);

const BUTTON_STYLES = [
	// translators: Option on the Quick Edit toolbar over a button on the user's website; the button is filled with its color.
	['fill', __('Fill', 'extendify-local')],
	// translators: Option on the Quick Edit toolbar over a button on the user's website; the button shows only an outline in its color, with no fill.
	['outline', __('Outline', 'extendify-local')],
];

// A list, not a select, since a select takes the caret from the words being typed.
export const ButtonStyles = ({ value, open, onToggle, onPick }) => (
	<span className="relative inline-flex">
		<button
			type="button"
			// translators: Screen reader name for the choice on the Quick Edit toolbar over a button on the user's website, between filled and outlined.
			aria-label={__('Button style', 'extendify-local')}
			aria-haspopup="listbox"
			aria-expanded={open}
			onMouseDown={keepFocus}
			onClick={onToggle}
			className={`${FIELD} inline-flex shrink-0 cursor-pointer items-center gap-1 pe-1.5`}
		>
			<span>
				{BUTTON_STYLES.find(([style]) => style === value)?.[1] ??
					// translators: Shown in the style choice on the Quick Edit toolbar over a button on the user's website that wears one of the site design's own looks, which is neither filled nor outlined.
					__('Site’s style', 'extendify-local')}
			</span>
			<Icon icon={chevronDown} size={20} className="fill-current" />
		</button>
		{open && (
			<div
				role="listbox"
				aria-label={__('Button style', 'extendify-local')}
				className={`${AWAY} flex min-w-full flex-col gap-0.5 rounded-agentx-quick-edit p-1 ${POPOVER}`}
			>
				{BUTTON_STYLES.map(([style, label]) => (
					<button
						key={style}
						type="button"
						role="option"
						aria-selected={style === value}
						onMouseDown={keepFocus}
						onClick={() => onPick(style)}
						className={`${TEXT_BUTTON} justify-start bg-transparent px-2.5 text-agentx-quick-edit-popover-ink hover:bg-agentx-quick-edit-option-hover aria-selected:bg-agentx-quick-edit-option-selected`}
					>
						<span>{label}</span>
					</button>
				))}
			</div>
		)}
	</span>
);

// Nothing writes to the input, since a write while the Mac's color window is open can close it.
export const CustomColor = ({ value, onPick }) => (
	<label
		// translators: Shown over the rainbow circle in Quick Edit's color choices; it opens a picker for any color, not only the theme's.
		title={__('Custom color', 'extendify-local')}
		style={value ? { background: value } : undefined}
		className={`relative size-6 shrink-0 cursor-pointer rounded-agentx-quick-edit-swatch border border-solid border-agentx-quick-edit-swatch-border ${value ? 'outline-2 outline-offset-2 outline-agentx-quick-edit-swatch-picked' : 'bg-[conic-gradient(#ef4444,#eab308,#22c55e,#06b6d4,#3b82f6,#d946ef,#ef4444)]'}`}
	>
		<input
			type="color"
			aria-label={__('Custom color', 'extendify-local')}
			onChange={(event) => onPick(event.target.value)}
			className="absolute inset-0 size-full cursor-pointer opacity-0"
		/>
	</label>
);

export const ColorMenu = ({
	kind,
	open,
	onToggle,
	swatches,
	onPick,
	onCustom,
	onCustomDone,
	onClear,
}) => {
	const custom = useRef(null);
	const done = useRef(onCustomDone);
	done.current = onCustomDone;

	// React's onChange fires while the picker is still open; the native change fires once it closes.
	useEffect(() => {
		const input = custom.current;
		if (!input) return;
		const finish = () => done.current();
		input.addEventListener('change', finish);
		return () => input.removeEventListener('change', finish);
	}, [open]);

	return (
		<span className="relative inline-flex">
			<button
				type="button"
				aria-label={COLOR_LABELS[kind]}
				aria-expanded={open}
				title={COLOR_LABELS[kind]}
				onMouseDown={keepFocus}
				onClick={onToggle}
				className={TOOL}
			>
				{kind === 'button' && (
					<span
						aria-hidden="true"
						className="size-4 rounded-agentx-quick-edit-swatch border border-solid border-agentx-quick-edit-swatch-border bg-[conic-gradient(#ef4444,#eab308,#22c55e,#06b6d4,#3b82f6,#d946ef,#ef4444)]"
					/>
				)}
				{kind === 'text' && (
					<span
						aria-hidden="true"
						className="relative text-[15px] leading-none font-semibold"
					>
						A
						<span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-agentx-quick-edit-text" />
					</span>
				)}
				{kind === 'highlight' && (
					<span
						aria-hidden="true"
						className="rounded-[3px] bg-agentx-quick-edit-highlight px-1 py-0.5 text-[13px] leading-none font-semibold text-agentx-quick-edit-highlight-ink"
					>
						A
					</span>
				)}
			</button>
			{open && (
				<div
					role="dialog"
					aria-label={COLOR_LABELS[kind]}
					className={`${AWAY} w-max max-w-64 rounded-agentx-quick-edit p-2 ${POPOVER}`}
				>
					<div className="flex flex-wrap gap-1.5">
						{swatches.map((swatch) => (
							<button
								key={swatch.slug}
								type="button"
								aria-label={swatch.name}
								title={swatch.name}
								onMouseDown={keepFocus}
								onClick={() => onPick(swatch)}
								style={{ background: swatch.css }}
								className="agentx-focus size-6 shrink-0 cursor-pointer rounded-agentx-quick-edit-swatch border border-solid border-agentx-quick-edit-swatch-border p-0"
							/>
						))}
						<label
							// translators: Shown over the rainbow circle in Quick Edit's color choices; it opens a picker for any color, not only the theme's.
							title={__('Custom color', 'extendify-local')}
							className="relative size-6 shrink-0 cursor-pointer rounded-agentx-quick-edit-swatch border border-solid border-agentx-quick-edit-swatch-border bg-[conic-gradient(#ef4444,#eab308,#22c55e,#06b6d4,#3b82f6,#d946ef,#ef4444)]"
						>
							<input
								ref={custom}
								type="color"
								aria-label={__('Custom color', 'extendify-local')}
								onChange={(event) => onCustom(event.target.value)}
								className="absolute inset-0 size-full cursor-pointer opacity-0"
							/>
						</label>
					</div>
					<button
						type="button"
						onMouseDown={keepFocus}
						onClick={onClear}
						className={`${TEXT_BUTTON} mt-2 w-full bg-transparent text-agentx-quick-edit-button-ink hover:bg-agentx-quick-edit-button-hover`}
					>
						<span>{CLEAR_LABELS[kind]}</span>
					</button>
				</div>
			)}
		</span>
	);
};

export const AlignButtons = ({ value, onChange }) =>
	[
		// translators: Button on the Quick Edit toolbar that lines the text up on the left.
		['left', alignLeft, __('Align left', 'extendify-local')],
		// translators: Button on the Quick Edit toolbar that centers the text.
		['center', alignCenter, __('Align center', 'extendify-local')],
		// translators: Button on the Quick Edit toolbar that lines the text up on the right.
		['right', alignRight, __('Align right', 'extendify-local')],
	].map(([align, icon, label]) => (
		<ToolButton
			key={align}
			icon={icon}
			label={label}
			pressed={value === align}
			onPress={() => onChange('text_align', align)}
		/>
	));

// Outside the card's top corner, so it covers nothing in the card.
export const DragHandle = ({ onPointerDown }) => (
	<div
		aria-hidden="true"
		data-agentx-drag=""
		onPointerDown={onPointerDown}
		className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center select-none active:cursor-grabbing"
	>
		<Icon icon={dragHandle} size={20} className="fill-agentx-quick-edit-drag" />
	</div>
);

export const SaveButtons = ({ onCancel, onSave }) => (
	<div className="flex shrink-0 items-center gap-1">
		<button
			type="button"
			onMouseDown={keepFocus}
			onClick={onCancel}
			className={`${TEXT_BUTTON} bg-transparent text-agentx-quick-edit-button-ink hover:bg-agentx-quick-edit-button-hover`}
		>
			<span>
				{
					// translators: Button in Quick Edit that puts the words back as they were and closes it.
					__('Cancel', 'extendify-local')
				}
			</span>
		</button>
		<button
			type="button"
			onMouseDown={keepFocus}
			onClick={onSave}
			className={`${TEXT_BUTTON} bg-agentx-quick-edit-save text-agentx-quick-edit-save-ink enabled:hover:bg-agentx-quick-edit-save-hover`}
		>
			<span>
				{
					// translators: Button in Quick Edit that saves the edited words to the site's unsaved changes.
					__('Save', 'extendify-local')
				}
			</span>
		</button>
	</div>
);

export const LinkEditor = ({ link: current, onApply, onRemove, onClose }) => {
	const [text, setText] = useState(current?.href ?? '');
	const [newTab, setNewTab] = useState(current?.newTab ?? false);
	const [pages, setPages] = useState([]);
	const [active, setActive] = useState(-1);
	const field = useRef(null);

	useEffect(() => {
		field.current?.focus();
		field.current?.select();
	}, []);

	useEffect(() => {
		const typed = text.trim();
		if (typed.length < 2 || isAddress(typed)) {
			setPages([]);
			return;
		}
		const stop = new AbortController();
		const wait = setTimeout(() => {
			searchPages(typed, { signal: stop.signal })
				.then((found) => {
					setPages(found);
					setActive(found.length ? 0 : -1);
				})
				.catch(() => {});
		}, 200);
		return () => {
			clearTimeout(wait);
			stop.abort();
		};
	}, [text]);

	const apply = (options) => {
		const typed = text.trim();
		if (!typed) {
			onClose();
			return;
		}
		const address = isAddress(typed);
		const page = pages[active] ?? (address ? null : pages[0]);
		if (page) {
			onApply({ href: page.url, newTab, page }, options);
			return;
		}
		// Words whose pages haven't come back yet would link to https://words.
		if (!address) return;
		onApply({ href: hrefOf(typed), newTab }, options);
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				apply();
			}}
			className="relative flex items-center gap-1"
		>
			<input
				ref={field}
				value={text}
				onChange={(event) => {
					setText(event.target.value);
					setActive(-1);
				}}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						event.preventDefault();
						event.stopPropagation();
						onClose();
						return;
					}
					if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
						event.preventDefault();
						event.stopPropagation();
						apply({ save: true });
						return;
					}
					if (!pages.length) return;
					if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
						event.preventDefault();
						const step = event.key === 'ArrowDown' ? 1 : -1;
						setActive((now) => (now + step + pages.length) % pages.length);
					}
				}}
				// translators: Placeholder in Quick Edit's link field, where the user types a web address or words to find one of their own pages.
				placeholder={__('Search pages or paste a link', 'extendify-local')}
				// translators: Screen reader name for the field in Quick Edit where the user types the address the selected words link to, or searches their pages.
				aria-label={__('Link', 'extendify-local')}
				className={`${FIELD} w-64`}
			/>
			<ToolButton
				icon={external}
				// translators: Toggle in Quick Edit's link field; when on, the link opens in a new browser tab.
				label={__('Open in new tab', 'extendify-local')}
				pressed={newTab}
				onPress={() => setNewTab((now) => !now)}
			/>
			{current && onRemove && (
				<ToolButton
					icon={linkOff}
					// translators: Button in Quick Edit's link field that takes the link off the words, leaving the words.
					label={__('Remove link', 'extendify-local')}
					onPress={onRemove}
				/>
			)}
			<button
				type="submit"
				onMouseDown={keepFocus}
				className={`${TEXT_BUTTON} bg-transparent text-agentx-quick-edit-button-ink hover:bg-agentx-quick-edit-button-hover`}
			>
				<span>
					{
						// translators: Button in Quick Edit that links the selected words to the address or page picked beside it.
						__('Apply', 'extendify-local')
					}
				</span>
			</button>
			{pages.length > 0 && (
				<div
					className={`${AWAY} flex w-80 flex-col rounded-agentx-quick-edit p-1 ${POPOVER}`}
				>
					{pages.map((page, index) => (
						<button
							key={page.id}
							type="button"
							data-active={index === active || undefined}
							onMouseDown={keepFocus}
							onMouseEnter={() => setActive(index)}
							onClick={() => onApply({ href: page.url, newTab, page })}
							className="agentx-focus flex w-full cursor-pointer flex-col items-start rounded-agentx-quick-edit-control border-0 bg-transparent px-2 py-1.5 text-start text-agentx-quick-edit-popover-ink data-active:bg-agentx-quick-edit-option-hover"
						>
							<span className="w-full truncate text-agentx-quick-edit font-agentx-quick-edit">
								{page.title}
							</span>
							<span className="w-full truncate text-agentx-caption text-agentx-quick-edit-option-detail">
								{pathOf(page.url)}
							</span>
						</button>
					))}
				</div>
			)}
		</form>
	);
};

const pathOf = (url) => {
	try {
		return decodeURI(new URL(url).pathname);
	} catch {
		return url;
	}
};
