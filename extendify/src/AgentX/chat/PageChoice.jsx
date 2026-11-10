import { closePreview, previewLabel, previewOf } from '@agentx/chat/PageCard';
import {
	CARD_SHAPE,
	CLOSE,
	IN_CARD_CORNER,
	LIST,
	LIST_ICON,
	LIST_ROW,
	NOTICE_TITLE,
} from '@agentx/chat/styles';
import { TypedAnswer } from '@agentx/chat/TypedAnswer';
import { useCardKeys } from '@agentx/lib/keyboard';
import { useShellStore } from '@agentx/state/shell';
import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon, seen, unseen } from '@wordpress/icons';

// The address tells apart two pages of one name, like About and About 1.
const pathOf = (url) => {
	try {
		const { pathname, search } = new URL(url, window.location.origin);
		return `${pathname}${search}`;
	} catch {
		return url;
	}
};

export const PageChoice = ({ part, onAnswer, onClose, onTyped }) => {
	const { question, pages = [] } = part.input ?? {};
	const shows = useShellStore((state) => state.canvasTool?.shows);
	const [busy, setBusy] = useState(false);
	const keys = useCardKeys(false);
	// The floating chat in wp-admin has no canvas to show a page on.
	const canvas = Boolean(document.getElementById('extendify-agentx-site'));

	useEffect(() => () => closePreview(), []);

	const pick = async (page) => {
		setBusy(true);
		closePreview();
		try {
			await onAnswer(async () => ({
				...(page.id !== undefined && { id: page.id }),
				url: page.url,
				answer: page.title,
			}));
		} catch {
			setBusy(false);
		}
	};

	return (
		<section
			{...keys}
			onKeyDown={(event) => {
				keys.onKeyDown(event);
				if (event.key !== 'Escape' || busy) return;
				event.stopPropagation();
				onClose();
			}}
			aria-label={question}
			className={`agentx-focus relative flex flex-col gap-2 ${CARD_SHAPE} border-agentx-page-choice-card-border bg-agentx-page-choice-card text-agentx-page-choice-card-ink`}
		>
			<p className={`m-0 pe-8 break-words ${NOTICE_TITLE}`}>{question}</p>
			<Tooltip text={__('Close', 'extendify-local')} className={IN_CARD_CORNER}>
				<button
					type="button"
					onClick={onClose}
					disabled={busy}
					aria-label={
						// translators: Closes the AI Agent's card asking which page the user means, without picking one.
						__('Close', 'extendify-local')
					}
					className={CLOSE}
				>
					<Icon icon={closeSmall} size={24} className="fill-current" />
				</button>
			</Tooltip>
			<ul className={LIST}>
				{pages.map((page) => {
					const open = shows === page.url;
					const path = pathOf(page.url);
					return (
						<li key={page.url} className={`${LIST_ROW} pe-1`}>
							<button
								type="button"
								disabled={busy}
								onClick={() => pick(page)}
								aria-label={`${page.title} ${path}`}
								className="agentx-focus-inset flex min-w-0 flex-1 items-baseline gap-3 border-0 bg-transparent px-3 py-2 text-start text-agentx-notice-body text-agentx-list-ink enabled:hover:bg-agentx-list-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)]"
							>
								<span className="line-clamp-2 min-w-0 flex-1 font-agentx-button break-words">
									{page.title}
								</span>
								<span className="max-w-[40%] shrink-0 truncate text-agentx-caption text-agentx-notice-muted">
									{path}
								</span>
							</button>
							{canvas && (
								<Tooltip
									text={`${previewLabel(page.title)} ${path}`}
									className="max-[782px]:hidden"
								>
									<button
										type="button"
										aria-pressed={open}
										onClick={() =>
											open
												? closePreview()
												: useShellStore
														.getState()
														.setCanvasTool(previewOf(page))
										}
										aria-label={`${previewLabel(page.title)} ${path}`}
										className={LIST_ICON}
									>
										<Icon
											icon={open ? unseen : seen}
											size={20}
											className="fill-current"
										/>
									</button>
								</Tooltip>
							)}
						</li>
					);
				})}
			</ul>
			{onTyped && <TypedAnswer onAnswer={onTyped} busy={busy} />}
		</section>
	);
};
