import { CardBadge } from '@agentx/chat/CardBadge';
import { proactiveCopy } from '@agentx/chat/proactive';
import { CARD_SHAPE, NOTICE_TITLE_500, OUTLINED } from '@agentx/chat/styles';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { external, Icon } from '@wordpress/icons';

// A logo that fails to load leaves the number, so the list still reads in order.
const Marker = ({ image, number }) => {
	const [failed, setFailed] = useState(false);
	return image && !failed ? (
		<img
			src={image}
			alt=""
			onError={() => setFailed(true)}
			className="size-6 shrink-0 rounded-agentx-control object-contain"
		/>
	) : (
		<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-agentx-badge text-agentx-caption font-medium text-agentx-badge-ink ring-1 ring-agentx-badge-border">
			{number}
		</span>
	);
};

export const ProactiveCard = ({ data, answered, onAct, onDismiss }) => {
	const copy = proactiveCopy(data);
	if (!copy) return null;
	const { action } = copy;
	return (
		<section
			aria-label={copy.label}
			className={`flex max-w-agentx-card flex-col gap-3 ${CARD_SHAPE} border-agentx-proactive-card-border bg-agentx-proactive-card text-agentx-proactive-card-ink`}
		>
			<div className="flex min-w-0 gap-3">
				<CardBadge icon={copy.icon ?? 'rocket'} logo={copy.image} />
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<p className={`m-0 ${NOTICE_TITLE_500}`}>{copy.label}</p>
					<p className="m-0 break-words">{copy.text}</p>
					{copy.items?.length > 0 && (
						<ol className="m-0 flex list-none flex-col gap-2 p-0">
							{copy.items.map((item, at) => (
								<li key={item.key} className="flex min-w-0 items-center gap-2">
									<Marker image={item.image} number={at + 1} />
									<span className="min-w-0 break-words">{item.text}</span>
								</li>
							))}
						</ol>
					)}
				</div>
			</div>
			{!answered && !copy.info && (
				<div className="flex items-center justify-end gap-2">
					<button type="button" onClick={onDismiss} className={OUTLINED}>
						<span>
							{
								// translators: Button on a card the AI Agent shows on its own, like one about a slow website: hides the card for now.
								__('Not now', 'extendify-local')
							}
						</span>
					</button>
					{action?.url && (
						<a
							href={action.url}
							target="_blank"
							rel="noopener noreferrer"
							onClick={onAct}
							className={`${OUTLINED} no-underline`}
						>
							<span>{action.label}</span>
							<Icon icon={external} size={16} className="fill-current" />
						</a>
					)}
					{action && !action.url && (
						<button type="button" onClick={onAct} className={OUTLINED}>
							<span>{action.label}</span>
						</button>
					)}
				</div>
			)}
		</section>
	);
};
