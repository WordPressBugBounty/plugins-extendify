import { CardBadge } from '@agentx/chat/CardBadge';
import { ImageThumb } from '@agentx/chat/ImageThumb';
import { RowCard } from '@agentx/chat/RowCard';
import {
	CARD_SHAPE,
	NOTICE_TITLE,
	OUTLINED,
	TEXT_ACTION,
} from '@agentx/chat/styles';
import { rowOf } from '@agentx/lib/row-cards';
import { useLayoutEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { external, Icon } from '@wordpress/icons';

// Folds at three lines until opened; a resize can make the text fit or not.
const Text = ({ text }) => {
	const ref = useRef(null);
	const [open, setOpen] = useState(false);
	const [folded, setFolded] = useState(false);

	useLayoutEffect(() => {
		const element = ref.current;
		if (open) return;
		const measure = () =>
			setFolded(element.scrollHeight > element.clientHeight);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [open]);

	return (
		<>
			<p
				ref={ref}
				className={`m-0 break-words whitespace-pre-line ${open ? '' : 'line-clamp-3'}`}
			>
				{text.trim()}
			</p>
			{folded && !open && (
				<button
					type="button"
					onClick={() => setOpen(true)}
					className={`${TEXT_ACTION} self-start`}
				>
					{
						// translators: Opens the rest of a long text, like the site description, on a card in the AI Agent's chat that shows it for the user to keep or update.
						__('Show more', 'extendify-local')
					}
				</button>
			)}
		</>
	);
};

const BUTTONS = {
	refresh: () => [
		// translators: Button on a card in the AI Agent's chat that shows a detail of the website, like its tagline: the detail is still right.
		__('Keep it', 'extendify-local'),
		// translators: Button on a card in the AI Agent's chat that shows a detail of the website, like its tagline: opens where that detail is changed.
		__('Update', 'extendify-local'),
	],
	setup: () => [
		// translators: Button on a card in the AI Agent's chat that says the website lacks something, like a logo: hides the card for now.
		__('Not now', 'extendify-local'),
		// translators: Button on a card in the AI Agent's chat that says the website lacks something, like a logo: starts adding it.
		__('Add it', 'extendify-local'),
	],
};

const TONE =
	'border-agentx-refresh-card-border bg-agentx-refresh-card text-agentx-refresh-card-ink';

export const RefreshCard = ({ suggestion, onDismiss, onAct }) => {
	const { label, kind, ask, note, more, value, image, action, icon, logo } =
		suggestion.details;
	const [dismiss, act] = (BUTTONS[suggestion.type] ?? BUTTONS.refresh)();
	// A setup card's button sends a message, which a row shows; a value to judge or a link out takes the full card.
	if (suggestion.type === 'setup' && !suggestion.details.url) {
		return (
			<RowCard
				name={label}
				{...rowOf(suggestion, 'setup')}
				logo={logo}
				action={action ?? act}
				tone={TONE}
				onAct={onAct}
				onDismiss={onDismiss}
			/>
		);
	}
	return (
		<section
			aria-label={label}
			className={`flex max-w-agentx-card flex-col gap-2 ${CARD_SHAPE} ${TONE}`}
		>
			<div className="flex min-w-0 gap-3">
				<CardBadge icon={icon} logo={logo} />
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<p className="m-0 text-agentx-caption text-agentx-notice-muted">
						{kind ?? label}
					</p>
					{(ask ?? note) && (
						<p className={`m-0 break-words ${NOTICE_TITLE}`}>{ask ?? note}</p>
					)}
					{more && <p className={`m-0 break-words ${NOTICE_TITLE}`}>{more}</p>}
					{image ? (
						<ImageThumb
							image={image}
							alt={image.name || label}
							className="h-16 w-auto max-w-full self-start p-1"
						/>
					) : (
						value && (
							<div className="flex flex-col gap-1 border-0 border-s-2 border-solid border-agentx-refresh-card-quote ps-3 text-agentx-notice-muted">
								<Text text={value} />
							</div>
						)
					)}
				</div>
			</div>
			<div className="flex items-center justify-end gap-2">
				<button type="button" onClick={onDismiss} className={OUTLINED}>
					<span>{dismiss}</span>
				</button>
				{suggestion.details.url ? (
					<a
						href={suggestion.details.url}
						target="_blank"
						rel="noopener noreferrer"
						onClick={onAct}
						className={`${OUTLINED} no-underline`}
					>
						<span>{action ?? act}</span>
						<Icon icon={external} size={16} className="fill-current" />
					</a>
				) : (
					<button type="button" onClick={onAct} className={OUTLINED}>
						<span>{action ?? act}</span>
					</button>
				)}
			</div>
		</section>
	);
};
