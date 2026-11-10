import { FormImage } from '@agentx/chat/FormImage';
import {
	CARD_PRIMARY,
	CARD_SHAPE,
	CLOSE,
	NOTICE_TITLE,
	PRESS,
	ROW_CARD_SHAPE,
} from '@agentx/chat/styles';
import { submitOnModEnter, useCardKeys } from '@agentx/lib/keyboard';
import { Tooltip } from '@agentx/Tooltip';
import {
	flushSync,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	chevronDown,
	chevronUp,
	closeSmall,
	Icon,
	plus,
} from '@wordpress/icons';

const FIELD =
	'agentx-focus w-full min-w-0 rounded-agentx-control border border-solid border-agentx-field-border bg-agentx-field px-3 py-2 text-agentx-ink';

// Plain decimals only: a symbol or thousands separator fails WooCommerce's price check.
const PRICE = '[0-9]+([.,][0-9]{1,2})?';

// Taller, it would push the conversation out of the chat.
const useCap = (chat) => {
	const [cap, setCap] = useState();
	useLayoutEffect(() => {
		const column = chat?.current;
		if (!column) return;
		const observer = new ResizeObserver(() =>
			setCap(column.clientHeight * 0.75),
		);
		observer.observe(column);
		return () => observer.disconnect();
	}, [chat]);
	return cap;
};

// The model can name a select with nothing to pick from.
const kindOf = ({ type, options }) =>
	type === 'select' && !options?.length ? 'text' : type;

const optionOf = (option) =>
	typeof option === 'object' ? option : { value: option, label: option };

const initial = (field) => {
	if (kindOf(field) === 'checkbox') return Boolean(field.value);
	if (kindOf(field) === 'image')
		return Array.isArray(field.value) ? field.value : [];
	if (kindOf(field) === 'choices') {
		return field.value?.length
			? field.value.map((choice) => choice?.label ?? String(choice))
			: ['', ''];
	}
	if (field.value != null) return String(field.value);
	return kindOf(field) === 'select' && field.required
		? optionOf(field.options[0]).value
		: '';
};

export const shownValues = (fields, edits) =>
	Object.fromEntries(
		fields.map((field) => [
			field.name,
			field.name in edits ? edits[field.name] : initial(field),
		]),
	);

// A field only some answers take, like a dropdown's choices, shows only when one is picked.
const shows = ({ when }, values) =>
	!when ||
	Object.entries(when).every(([name, allowed]) =>
		allowed.includes(values[name]),
	);

const answered = (field, value) => {
	const kind = kindOf(field);
	if (kind === 'checkbox') return value;
	if (kind === 'image')
		return value.length
			? value.map(({ id, alt }) => ({ id, ...(alt && { alt }) }))
			: null;
	if (kind === 'choices') {
		const labels = value.map((choice) => choice.trim()).filter(Boolean);
		return labels.length ? labels.map((label) => ({ label })) : null;
	}
	const typed = value.trim();
	if (kind === 'number' && typed) return Number(typed);
	if (kind === 'price') return typed.replace(',', '.');
	return typed;
};

const rowsFor = (text) =>
	Math.min(10, Math.max(6, Math.ceil(String(text ?? '').length / 40) + 1));

const Control = ({ id, field, value, onChange, chat, floating, demo }) => {
	// Sized once, so the field doesn't jump while the user types.
	const [rows] = useState(() => rowsFor(value));
	// The browser's autofill offers saved names and addresses, which no agent form asks for.
	const shared = {
		id,
		autoComplete: 'off',
		required: field.required,
		maxLength: field.maxLength,
		value,
		onChange: (event) => onChange(event.target.value),
		className: FIELD,
	};
	switch (kindOf(field)) {
		case 'image':
			return (
				<FormImage
					value={value}
					onChange={onChange}
					chat={chat}
					anchor={floating}
					demo={demo}
				/>
			);
		case 'checkbox':
			return (
				<input
					id={id}
					type="checkbox"
					checked={value}
					onChange={(event) => onChange(event.target.checked)}
					className="agentx-focus m-0 size-4 shrink-0 accent-agentx-checkbox"
				/>
			);
		case 'textarea':
			return (
				<textarea {...shared} rows={rows} className={`${FIELD} resize-y`} />
			);
		case 'select':
			// The browser's own arrow sits flush against the field's edge.
			return (
				<div className="relative">
					<select {...shared} className={`${FIELD} appearance-none pe-9`}>
						{!field.required && <option value="" />}
						{field.options.map(optionOf).map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<Icon
						icon={chevronDown}
						size={20}
						className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 fill-current text-agentx-ink"
					/>
				</div>
			);
		case 'number':
			return <input {...shared} type="number" step="any" />;
		case 'price':
			return (
				<input {...shared} type="text" inputMode="decimal" pattern={PRICE} />
			);
		default:
			return <input {...shared} type="text" />;
	}
};

const ICON_BUTTON = `agentx-focus flex size-8 shrink-0 items-center justify-center rounded-agentx-control border-0 bg-transparent p-0 text-agentx-notice-close ${PRESS} enabled:hover:bg-agentx-hover enabled:hover:text-agentx-notice-ink disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

const ADD_CHOICE = `agentx-focus inline-flex h-8 shrink-0 items-center gap-1 self-start rounded-agentx-control border-0 bg-transparent px-2 text-agentx-notice-close ${PRESS} enabled:hover:bg-agentx-hover enabled:hover:text-agentx-notice-ink`;

const Choices = ({ legend, value, onChange }) => (
	<fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
		<legend className="mb-1 p-0 font-agentx-button">{legend}</legend>
		{value.map((choice, index) => {
			const remove = sprintf(
				// translators: %d is a number. Button on the AI Agent's form for adding a field to a form on the user's website; it takes that option out of the new field.
				__('Remove choice %d', 'extendify-local'),
				index + 1,
			);
			return (
				<div key={index} className="flex items-center gap-1">
					<input
						type="text"
						autoComplete="off"
						value={choice}
						aria-label={sprintf(
							// translators: %d is a number. Screen reader name for one option a visitor can pick, in the list of a new form field's choices on the AI Agent's form.
							__('Choice %d', 'extendify-local'),
							index + 1,
						)}
						onChange={(event) =>
							onChange(
								value.map((each, at) =>
									at === index ? event.target.value : each,
								),
							)
						}
						className={FIELD}
					/>
					<Tooltip text={remove}>
						<button
							type="button"
							aria-label={remove}
							onClick={() => onChange(value.filter((_, at) => at !== index))}
							className={ICON_BUTTON}
						>
							<Icon icon={closeSmall} size={24} className="fill-current" />
						</button>
					</Tooltip>
				</div>
			);
		})}
		<button
			type="button"
			onClick={() => onChange([...value, ''])}
			className={ADD_CHOICE}
		>
			<Icon icon={plus} size={20} className="fill-current" />
			<span>
				{
					// translators: Button on the AI Agent's form for adding a field like a dropdown to a form on the user's website; it adds one more option a visitor can pick.
					__('Add choice', 'extendify-local')
				}
			</span>
		</button>
	</fieldset>
);

// Any list of fields the agent sends; the tool that drew it decides what Submit does.
export const FormCard = ({
	title,
	fields,
	submitLabel,
	edits: kept = {},
	minimized = false,
	onAnswer,
	onClose,
	onEdit,
	onMinimize,
	onRestore,
	chat,
	floating,
	demo,
}) => {
	const { ref } = useCardKeys(demo, { fields: true });
	const id = useId();
	const cap = useCap(chat);
	const restore = useRef(null);
	// Kept apart from the agent's values, so a later call for the same form never overwrites them.
	const [edits, setEdits] = useState(kept);
	const [busy, setBusy] = useState(false);
	const values = shownValues(fields, edits);

	const edit = (name, value) => {
		setEdits((all) => ({ ...all, [name]: value }));
		onEdit?.(name, value);
	};

	const submit = async (event) => {
		event.preventDefault();
		setBusy(true);
		try {
			await onAnswer(
				Object.fromEntries(
					fields.map((field) => [
						field.name,
						shows(field, values) ? answered(field, values[field.name]) : null,
					]),
				),
			);
		} catch {
			setBusy(false);
		}
	};

	const close = (style) =>
		onClose && (
			<Tooltip text={__('Close', 'extendify-local')}>
				<button
					type="button"
					onClick={onClose}
					disabled={busy}
					aria-label={
						// translators: Closes the AI Agent's form card without sending it.
						__('Close', 'extendify-local')
					}
					className={style}
				>
					<Icon icon={closeSmall} size={24} className="fill-current" />
				</button>
			</Tooltip>
		);

	if (minimized) {
		return (
			<section
				aria-label={title}
				className={`${ROW_CARD_SHAPE} border-agentx-form-card-border bg-agentx-form-card flex items-center gap-1 ps-3 text-agentx-form-card-ink`}
			>
				<p className={`m-0 min-w-0 flex-1 truncate ${NOTICE_TITLE}`}>{title}</p>
				<Tooltip text={__('Restore', 'extendify-local')}>
					<button
						ref={restore}
						type="button"
						onClick={onRestore}
						aria-label={
							// translators: Opens the AI Agent's form card again after the user folded it down to its title.
							__('Restore', 'extendify-local')
						}
						className={ICON_BUTTON}
					>
						<Icon icon={chevronUp} size={24} className="fill-current" />
					</button>
				</Tooltip>
				{close(ICON_BUTTON)}
			</section>
		);
	}

	return (
		<form
			ref={ref}
			onSubmit={submit}
			onKeyDown={submitOnModEnter}
			autoComplete="off"
			aria-label={title}
			style={{ maxHeight: cap }}
			className={`${CARD_SHAPE} border-agentx-form-card-border bg-agentx-form-card text-agentx-form-card-ink relative m-0 flex min-h-0 flex-col gap-2`}
		>
			<p className={`m-0 ${NOTICE_TITLE} ${onMinimize ? 'pe-11' : 'pe-5'}`}>
				{title}
			</p>
			{/* Chrome won't shrink a fieldset's contents, so it can't be the scroll box. */}
			<div className="-m-1 flex min-h-0 flex-col overflow-y-auto p-1">
				<fieldset
					disabled={busy}
					className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0"
				>
					{fields.flatMap((field) => {
						if (!shows(field, values)) return [];
						if (kindOf(field) === 'choices') {
							return (
								<Choices
									key={field.name}
									legend={field.label}
									value={values[field.name]}
									onChange={(value) => edit(field.name, value)}
								/>
							);
						}
						const control = (
							<Control
								id={`${id}-${field.name}`}
								field={field}
								value={values[field.name]}
								onChange={(value) => edit(field.name, value)}
								chat={chat}
								floating={floating}
								demo={demo}
							/>
						);
						return kindOf(field) === 'image' ? (
							<fieldset
								key={field.name}
								className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0"
							>
								<legend className="mb-1 p-0 font-agentx-button">
									{field.label}
								</legend>
								{control}
							</fieldset>
						) : kindOf(field) === 'checkbox' ? (
							<div key={field.name} className="flex items-center gap-2">
								{control}
								<label htmlFor={`${id}-${field.name}`}>{field.label}</label>
							</div>
						) : (
							<div key={field.name} className="flex flex-col gap-1">
								<label
									htmlFor={`${id}-${field.name}`}
									className="font-agentx-button"
								>
									{field.label}
								</label>
								{control}
							</div>
						);
					})}
				</fieldset>
			</div>
			<button
				type="submit"
				disabled={busy}
				className={`${CARD_PRIMARY} self-end`}
			>
				{submitLabel}
			</button>
			<div className="absolute end-0 top-1.5 flex">
				{onMinimize && (
					<Tooltip text={__('Minimize', 'extendify-local')} className="-me-2">
						<button
							type="button"
							disabled={busy}
							// Focus would fall to the page with the button gone.
							onClick={() => {
								flushSync(onMinimize);
								restore.current?.focus();
							}}
							aria-label={
								// translators: Folds the AI Agent's form card down to its title, keeping what the user typed in it.
								__('Minimize', 'extendify-local')
							}
							// Its glyph sits low in its box and wide of the X's, so it moves up and in to line up.
							className={CLOSE}
						>
							<Icon
								icon={chevronDown}
								size={24}
								className="-translate-y-px fill-current"
							/>
						</button>
					</Tooltip>
				)}
				{close(CLOSE)}
			</div>
		</form>
	);
};
