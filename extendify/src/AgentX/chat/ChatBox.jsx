import { PRESS } from '@agentx/chat/styles';
import { HandPointerIcon } from '@agentx/guide/icons';
import { useTabFocus } from '@agentx/lib/hooks';
import { blockName } from '@agentx/lib/versions';
import { Tooltip } from '@agentx/Tooltip';
import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { closeSmall, Icon, keyboardReturn } from '@wordpress/icons';

const BUTTON = `agentx-focus inline-flex size-8 shrink-0 items-center justify-center rounded-agentx-send border-0 ${PRESS} disabled:opacity-[var(--agentx-disabled-opacity,40%)]`;
const SEND = `${BUTTON} bg-agentx-send text-agentx-send-ink not-disabled:hover:bg-agentx-send-hover`;
const STOP = `${BUTTON} bg-agentx-stop text-agentx-stop-ink`;
const SELECT = `agentx-focus inline-flex h-8 shrink-0 items-center gap-1.5 rounded-agentx-select-button border-0 bg-agentx-select-button ps-2 pe-2.5 text-agentx-body text-agentx-select-button-ink ${PRESS} not-disabled:hover:bg-agentx-select-button-hover disabled:opacity-[var(--agentx-disabled-opacity,40%)]`;
const PILL =
	'inline-flex h-8 min-w-0 items-stretch overflow-hidden rounded-agentx-pill bg-agentx-pill text-agentx-body font-agentx-pill text-agentx-pill-ink';
// Each half of the pill is a full-height segment, so a hover fills it to the pill's edge.
const PILL_NAME = `agentx-focus-inset min-w-0 truncate border-0 bg-transparent ps-2.5 pe-1.5 text-start font-agentx-pill text-current ${PRESS} hover:bg-agentx-pill-hover`;
// Keeps a pasted wall of text away from the models; the backend refuses longer.
const MAX_MESSAGE = 1500;

// Text sent while a message is queued joins it, so their total is what's capped.
export const ChatBox = ({
	disabled,
	busy,
	queued = '',
	returned,
	onTakenBack,
	onSend,
	onStop,
	draft = '',
	history = [],
	suggestion,
	onCommands,
	onTooLong,
	onType,
	inputRef,
	selected,
	picking = false,
	canPick = false,
	landing = false,
	onSelect,
	onClearSelected,
	onShowSelected,
	onHideSelected,
	onFlashSelected,
	tools,
}) => {
	const [text, setText] = useState(draft);
	// How far back in the sent messages Up has gone, 0 being what's being typed.
	const [back, setBack] = useState(0);
	const typed = useRef('');
	const tookBack = useRef(false);
	const { tabbedIn, onFocus, onBlur } = useTabFocus();

	const recall = (to) => {
		if (back === 0) typed.current = text;
		setBack(to);
		setText(to === 0 ? typed.current : history[history.length - to]);
	};

	// A deleted queued message comes back ahead of anything typed since.
	useEffect(() => {
		if (!returned) return;
		setText((typed) =>
			[returned.text, typed.trim()].filter(Boolean).join('\n\n'),
		);
		tookBack.current = true;
		onTakenBack?.();
	}, [returned, onTakenBack]);

	useLayoutEffect(() => {
		const field = inputRef?.current;
		if (!tookBack.current || !field) return;
		tookBack.current = false;
		field.focus();
		field.setSelectionRange(field.value.length, field.value.length);
		field.scrollTop = field.scrollHeight;
	});
	const message = text.trim();
	const tooLong =
		message.length + (queued && message ? queued.length + 2 : 0) > MAX_MESSAGE;

	useEffect(() => onTooLong?.(tooLong), [tooLong, onTooLong]);

	const send = (event) => {
		event?.preventDefault();
		if (!message || tooLong) return;
		onSend(message);
		setText('');
		setBack(0);
		// The button pressed may leave as the box empties.
		inputRef?.current?.focus();
	};

	const focusText = (event) => {
		const field = inputRef?.current;
		if (!field || field.disabled || event.button !== 0) return;
		if (event.target.closest('button, a, input, textarea, select')) return;
		// Without this the press blurs the text and loses its caret.
		event.preventDefault();
		if (field === document.activeElement) return;
		field.focus();
		field.setSelectionRange(field.value.length, field.value.length);
	};

	const selectedName = selected?.label ?? blockName(selected?.type ?? '');

	return (
		<form
			onSubmit={send}
			onMouseDown={focusText}
			className={`rounded-agentx-chat-box border-(length:--agentx-chat-box-border-width) border-agentx-chat-box-border bg-agentx-chat-box text-agentx-chat-box-ink shadow-(--agentx-chat-box-shadow) ${tabbedIn ? 'outline-(length:--agentx-focus-width) outline-agentx-chat-box-focus' : ''} ${disabled ? 'opacity-(--agentx-chat-box-disabled-opacity)' : ''}`}
		>
			{back > 0 && (
				<p className="m-0 px-4 pt-2 text-agentx-caption text-agentx-chat-box-history-ink">
					{sprintf(
						// translators: Shown above the text in the AI Agent's chat box while the user steps through the messages they sent with the arrow keys. %1$d is how far back, %2$d how many there are.
						__('History %1$d of %2$d', 'extendify-local'),
						back,
						history.length,
					)}
				</p>
			)}
			<div className="flex flex-col gap-1 p-2">
				<textarea
					ref={inputRef}
					data-agentx-chat-box
					value={text}
					disabled={disabled}
					rows={1}
					aria-label={__('Ask anything', 'extendify-local')}
					placeholder={
						suggestion ??
						// translators: Placeholder in the AI Agent's empty chat box. Typing / there opens the list of things the agent can do; keep it short.
						__('Type / to explore capabilities', 'extendify-local')
					}
					onChange={(event) => {
						setText(event.target.value);
						onType?.(event.target.value);
						// An edited message is a new one, no longer that past message.
						setBack(0);
					}}
					onFocus={onFocus}
					onBlur={onBlur}
					onKeyDown={(event) => {
						// Enter also confirms a word an input method is still composing.
						if (event.nativeEvent.isComposing) return;
						const { value, selectionStart, selectionEnd } = event.target;
						// Only from the first or last line, so moving within a long message still works.
						const onFirstLine = !value.slice(0, selectionStart).includes('\n');
						const onLastLine = !value.slice(selectionEnd).includes('\n');
						if (
							event.key === 'ArrowUp' &&
							onFirstLine &&
							back < history.length
						) {
							event.preventDefault();
							recall(back + 1);
							return;
						}
						if (event.key === 'ArrowDown' && onLastLine && back > 0) {
							event.preventDefault();
							recall(back - 1);
							return;
						}
						// An Escape that ends block picking doesn't also leave the history.
						if (event.key === 'Escape' && back > 0 && !event.defaultPrevented) {
							event.preventDefault();
							recall(0);
							return;
						}
						// Only in an empty box, so a / inside a message still types.
						if (event.key === '/' && !text && onCommands) {
							event.preventDefault();
							onCommands();
							return;
						}
						const takes =
							(event.key === 'Tab' && !event.shiftKey) ||
							event.key === 'ArrowRight';
						if (takes && suggestion && !text) {
							event.preventDefault();
							setText(suggestion);
							return;
						}
						if (event.key !== 'Enter' || event.shiftKey) return;
						event.preventDefault();
						send();
					}}
					className="field-sizing-content max-h-[calc(5lh+0.75rem)] w-full resize-none border-0 bg-transparent px-2 py-1.5 text-agentx-chat-box-input text-agentx-chat-box-ink outline-none placeholder:text-agentx-chat-box-placeholder"
				/>
				<div className="flex items-center gap-2">
					{selected && !landing ? (
						<span data-agentx-pill className={PILL}>
							<Tooltip
								text={sprintf(
									__('Show %s on your site', 'extendify-local'),
									selectedName,
								)}
								className="min-w-0"
							>
								<button
									type="button"
									onClick={onFlashSelected}
									onPointerEnter={onShowSelected}
									onPointerLeave={onHideSelected}
									onFocus={onShowSelected}
									onBlur={onHideSelected}
									aria-label={sprintf(
										// translators: %s is what the user picked on their website, like Heading or Phone number. Screen reader name for that block's name on the AI Agent's chat box, which scrolls the website to show the block.
										__('Show %s on your site', 'extendify-local'),
										selectedName,
									)}
									className={PILL_NAME}
								>
									{selectedName}
								</button>
							</Tooltip>
							<Tooltip text={__('Clear selected block', 'extendify-local')}>
								<button
									type="button"
									disabled={disabled}
									onClick={onClearSelected}
									// translators: Screen reader name for the X on the AI Agent's chat box that drops the block the user picked on their website, so it isn't sent with their message.
									aria-label={__('Clear selected block', 'extendify-local')}
									className={`agentx-focus-inset flex w-8 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-current ${PRESS} not-disabled:hover:bg-agentx-pill-hover disabled:opacity-[var(--agentx-disabled-opacity,40%)]`}
								>
									<Icon icon={closeSmall} size={20} className="fill-current" />
								</button>
							</Tooltip>
						</span>
					) : (picking || selected) && onSelect ? (
						// The picked part's chip, so the box flying from the site has somewhere to land.
						<span data-agentx-pill className={PILL}>
							<Tooltip
								// translators: Tooltip on the Cancel chip in the AI Agent's chat box while the user is picking a part of their website; Escape stops it too.
								text={__('Stop selecting', 'extendify-local')}
								keys="Esc"
								className="min-w-0"
							>
								<button
									type="button"
									// A pick's box is still flying onto it, and picking is already over.
									onClick={landing ? undefined : onSelect}
									aria-label={
										// translators: Screen reader name for the Cancel chip in the AI Agent's chat box, which stops picking a part of the website.
										__('Cancel selecting', 'extendify-local')
									}
									className={`${PILL_NAME} flex items-center gap-1 pe-2`}
								>
									<span>
										{
											// translators: Shown in the AI Agent's chat box while the user is picking a part of their website; pressing it stops picking. Keep it short.
											__('Cancel', 'extendify-local')
										}
									</span>
									<Icon
										icon={closeSmall}
										size={20}
										className="shrink-0 fill-current"
									/>
								</button>
							</Tooltip>
						</span>
					) : (
						// TODO: maybe show this only once the agent turns block picking on.
						onSelect && (
							<Tooltip
								// translators: Tooltip on the AI Agent's Select button, which lets the user click a part of their website to change it or ask about it.
								text={__(
									'Select a part of your site to change',
									'extendify-local',
								)}
							>
								<button
									type="button"
									disabled={disabled || !canPick}
									onClick={onSelect}
									className={SELECT}
								>
									<HandPointerIcon className="size-4" />
									{
										// translators: Button on the AI Agent's chat box; the user then clicks a block on their website to ask about or change it. Keep it short.
										__('Select', 'extendify-local')
									}
								</button>
							</Tooltip>
						)
					)}
					<div className="ms-auto flex shrink-0 items-center gap-2">
						{tools}
						{(!busy || message || !onStop) && (
							<Tooltip text={__('Send message', 'extendify-local')}>
								<button
									type="submit"
									disabled={disabled || !message || tooLong}
									aria-label={__('Send message', 'extendify-local')}
									className={SEND}
								>
									<Icon icon={keyboardReturn} size={20} fill="currentColor" />
								</button>
							</Tooltip>
						)}
						{busy && onStop && (
							<Tooltip text={__('Stop', 'extendify-local')}>
								<button
									type="button"
									onClick={onStop}
									aria-label={
										// translators: Screen reader name for the button that stops the AI Agent's current work.
										__('Stop', 'extendify-local')
									}
									className={STOP}
								>
									<span
										aria-hidden="true"
										className="size-2.5 rounded-xs bg-current"
									/>
								</button>
							</Tooltip>
						)}
					</div>
				</div>
			</div>
		</form>
	);
};
