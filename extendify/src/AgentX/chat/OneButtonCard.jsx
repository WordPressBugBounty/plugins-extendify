import { CardBadge } from '@agentx/chat/CardBadge';
import { TEXT_BUTTON } from '@agentx/chat/ResolveChanges';
import { CARD_SHAPE, CLOSE, IN_CARD_CORNER, PRESS } from '@agentx/chat/styles';
import { TypedAnswer } from '@agentx/chat/TypedAnswer';
import { useCardKeys } from '@agentx/lib/keyboard';
import { Tooltip } from '@agentx/Tooltip';
import { __ } from '@wordpress/i18n';
import { closeSmall, external, Icon } from '@wordpress/icons';

const KINDS = {
	confirm:
		'border-agentx-confirm-card-border bg-agentx-confirm-card text-agentx-confirm-card-ink',
	update:
		'border-agentx-update-card-border bg-agentx-update-card text-agentx-update-card-ink',
	error:
		'border-agentx-error-card-border bg-agentx-error-card text-agentx-error-card-ink',
};

// Without a dismiss, typing in the chat box is how it moves on.
export const OneButtonCard = ({
	text,
	button,
	href,
	danger,
	busy,
	onPress,
	dismiss,
	onDismiss,
	onClose,
	aside,
	details,
	label,
	kind,
	onTyped,
	icon,
	demo,
}) => {
	const keys = useCardKeys(demo);
	const said = (
		<p className={`m-0 min-w-0 flex-1 break-words ${onClose ? 'pe-8' : ''}`}>
			{text}
		</p>
	);
	const style = `agentx-focus shrink-0 rounded-agentx-control border-0 px-3 py-1.5 font-agentx-button no-underline ${PRESS} disabled:opacity-[var(--agentx-disabled-opacity,60%)] ${
		danger
			? 'bg-agentx-danger text-agentx-danger-ink enabled:hover:brightness-(--agentx-hover-brightness)'
			: 'bg-agentx-cards-primary text-agentx-cards-primary-ink enabled:hover:brightness-(--agentx-hover-brightness)'
	}`;

	return (
		<section
			{...keys}
			onKeyDown={(event) => {
				keys.onKeyDown(event);
				// A confirm's Escape means its dismiss, as on any dialog.
				const leave = onDismiss ?? onClose;
				if (event.key !== 'Escape' || !leave) return;
				event.stopPropagation();
				if (!busy) leave();
			}}
			aria-label={
				label ??
				// translators: Screen reader name for a card in the AI Agent's chat that asks the user to confirm something or try it again.
				__('Confirm', 'extendify-local')
			}
			className={`agentx-focus relative flex flex-col gap-2 ${CARD_SHAPE} ${KINDS[kind] ?? KINDS.confirm}`}
		>
			{icon ? (
				<div className="flex min-w-0 items-start gap-3">
					<CardBadge icon={icon} />
					{said}
				</div>
			) : (
				said
			)}
			{onClose && (
				<Tooltip
					text={__('Close', 'extendify-local')}
					className={IN_CARD_CORNER}
				>
					<button
						type="button"
						aria-disabled={Boolean(busy)}
						onClick={() => !busy && onClose()}
						aria-label={
							// translators: Screen reader name for the X button on a card in the AI Agent's chat; closes the card without doing what it asks.
							__('Close', 'extendify-local')
						}
						className={CLOSE}
					>
						<Icon icon={closeSmall} size={24} className="fill-current" />
					</button>
				</Tooltip>
			)}
			{(button || aside) && (
				<div className="flex items-center justify-end gap-1">
					{aside}
					{details && (
						<a
							href={details.href}
							target="_blank"
							rel="noopener noreferrer"
							className={`flex items-center gap-1 ${TEXT_BUTTON}`}
						>
							<span>{details.text}</span>
							<Icon icon={external} size={16} className="fill-current" />
						</a>
					)}
					{(aside || details) && <span className="flex-1" />}
					{onDismiss && (
						<button
							type="button"
							aria-disabled={Boolean(busy)}
							onClick={() => !busy && onDismiss()}
							className={TEXT_BUTTON}
						>
							{dismiss}
						</button>
					)}
					{button &&
						(href ? (
							<a href={href} className={style}>
								{button}
							</a>
						) : (
							<button
								type="button"
								onClick={onPress}
								disabled={busy}
								className={style}
							>
								{button}
							</button>
						))}
				</div>
			)}
			{onTyped && <TypedAnswer onAnswer={onTyped} busy={busy} />}
		</section>
	);
};
