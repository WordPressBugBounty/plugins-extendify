import { ACTION_TONE } from '@agentx/chat/ActionCard';
import { AskedLine } from '@agentx/chat/AskedLine';
import { RowCard } from '@agentx/chat/RowCard';
import { showInFrame } from '@agentx/lib/pages';
import { useEffect } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const listed = (url) =>
	(window.extAgentXData?.screens ?? []).find((place) => place.url === url);

const inDashboard = (url) => {
	const admin = window.extSharedData?.adminUrl;
	return Boolean(admin) && url.startsWith(admin);
};

// Only a place on the site's own list opens, so a made-up address never does.
export const OpenPage = ({ part, onAnswer }) => {
	const { say, url } = part.input ?? {};
	const place = listed(url);
	const answered = Boolean(part.output);

	useEffect(() => {
		if (!place && !answered) onAnswer?.({ missing: true });
	}, [place, answered]);

	const card = () => {
		if (!place) return null;
		if (part.output?.opened) {
			return (
				<AskedLine
					text={sprintf(
						// translators: %s is the name of a page, like Orders. Shown in the AI Agent's chat after the user opened it from the agent's card.
						__('Opened the %s page', 'extendify-local'),
						place.title,
					)}
				/>
			);
		}
		if (part.output?.dismissed) {
			return (
				<AskedLine
					text={sprintf(
						// translators: %s is the name of a page, like Orders. Shown in the AI Agent's chat after the user dismissed the agent's card offering to open it.
						__('Asked to open the %s page', 'extendify-local'),
						place.title,
					)}
				/>
			);
		}
		const dashboard = inDashboard(place.url);
		return (
			<RowCard
				icon="browser"
				tone={ACTION_TONE}
				text={sprintf(
					dashboard
						? // translators: %s is the name of a WordPress dashboard page, like Orders. On the AI Agent's card offering to open it, where the user makes the change themselves.
							__(
								'Would you like to open the %s page in a new tab so you can make this change?',
								'extendify-local',
							)
						: // translators: %s is the name of a page of the user's website, like About. On the AI Agent's card offering to open it.
							__('Would you like to open the %s page?', 'extendify-local'),
					place.title,
				)}
				action={
					// translators: Button on the AI Agent's card that opens the page it names.
					__('Open page', 'extendify-local')
				}
				dismiss={
					// translators: Button on the AI Agent's card asking to open a page; closes the card without opening it.
					__('Dismiss', 'extendify-local')
				}
				onAct={() => {
					if (dashboard) {
						window.open(place.url, '_blank', 'noopener,noreferrer');
					} else {
						showInFrame(place.url);
					}
					onAnswer?.({ opened: true });
				}}
				onDismiss={() => onAnswer?.({ dismissed: true })}
			/>
		);
	};

	return (
		<div className="flex flex-col gap-3">
			{say && (
				<p className="m-0 text-agentx-message leading-agentx-reply text-agentx-reply-ink">
					{say}
				</p>
			)}
			{card()}
		</div>
	);
};
