import { OUTLINED } from '@agentx/chat/styles';
import { noteFold } from '@agentx/lib/card-changes';
import { idle } from '@agentx/lib/keyboard';
import { useQueueStore } from '@agentx/state/queue';
import { useRunStore } from '@agentx/state/run';
import {
	Children,
	createContext,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { chevronDown, Icon } from '@wordpress/icons';

const Fold = createContext(() => {});

// Nothing waits on these cards, so the button only folds one away.
export const DoneCard = () => {
	const fold = useContext(Fold);
	return (
		<button type="button" onClick={fold} className={OUTLINED}>
			{
				// translators: Button on a card in the AI Agent's chat, like the one for trying colors, that folds the card away, keeping whatever the user picked on it.
				__('Done', 'extendify-local')
			}
		</button>
	);
};

const Badge = ({ icon, logo }) => {
	const [failed, setFailed] = useState(false);
	return logo && !failed ? (
		<img
			src={logo}
			alt=""
			onError={() => setFailed(true)}
			className="m-0 size-10 shrink-0 rounded-full border border-solid border-agentx-card-icon-border bg-agentx-card-icon object-contain"
		/>
	) : (
		<span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-solid border-agentx-card-icon-border bg-agentx-card-icon text-agentx-card-icon-ink">
			<Icon icon={icon} size={24} className="fill-current" />
		</span>
	);
};

const Heading = ({ id, icon, logo, title, subtitle }) => (
	<>
		<Badge icon={icon} logo={logo} />
		<span className="flex min-w-0 flex-1 flex-col">
			<span
				id={`${id}-title`}
				className="text-agentx-card-title font-agentx-card-title text-agentx-card-title-ink"
			>
				{title}
			</span>
			<span className="text-agentx-caption text-agentx-card-subtitle">
				{subtitle}
			</span>
		</span>
	</>
);

export const InlineCard = ({
	latest,
	takesFocus,
	icon,
	logo,
	title,
	subtitle,
	cancel = false,
	holds = false,
	part,
	children,
}) => {
	const id = useId();
	const [open, setOpen] = useState(latest && !part?.folded);
	// Saved with the chat, or reopening the agent unfolds a card the user folded away.
	const turn = (next) => {
		setOpen(next);
		if (part?.toolCallId) noteFold(part.toolCallId, !next);
	};
	const empty = Children.toArray(children).length === 0;
	const section = useRef(null);
	const working = useRunStore((state) => state.working);
	const queued = useQueueStore((state) => Boolean(state.text));
	const ran = useRef(false);

	// A newer card takes over, so this one folds away.
	useEffect(() => {
		if (!latest) setOpen(false);
	}, [latest]);

	// May mount after its run ended; before paint, or chat box typing lands on the card.
	useLayoutEffect(() => {
		if (!takesFocus || working) return;
		if (idle(document.activeElement)) {
			section.current?.focus({ preventScroll: true });
		}
	}, []);

	// A run ending on the card leaves it waiting, so it takes focus.
	useEffect(() => {
		if (working) {
			// The queue empties as the run ends, so it's read mid-run.
			ran.current = ran.current === 'queued' || queued ? 'queued' : 'ran';
			return;
		}
		const ended = ran.current;
		ran.current = false;
		if (ended !== 'ran' || !takesFocus) return;
		if (idle(document.activeElement)) {
			section.current?.focus({ preventScroll: true });
		}
	}, [working, takesFocus, queued]);

	return (
		<section
			ref={section}
			tabIndex={-1}
			aria-labelledby={`${id}-title`}
			data-agentx-holds={holds || undefined}
			className="agentx-focus flex max-w-agentx-card flex-col gap-3 rounded-agentx-card border border-solid border-agentx-card-border bg-agentx-card p-3 text-agentx-card-ink shadow-(--agentx-card-shadow)"
		>
			{empty ? (
				<div className="flex items-start gap-3">
					<Heading
						id={id}
						icon={icon}
						logo={logo}
						title={title}
						subtitle={subtitle}
					/>
				</div>
			) : (
				<button
					type="button"
					aria-expanded={open}
					aria-controls={`${id}-body`}
					onClick={() => turn(!open)}
					// Out to the card's edges so a fill reaches them; the open line takes 1px of the padding.
					className={`agentx-focus group -mx-3 -mt-3 -mb-3 flex items-start gap-3 border-0 bg-agentx-card-header px-3 pt-3 text-start text-agentx-card-header-ink hover:bg-agentx-card-header-hover ${open ? 'rounded-t-agentx-card border-b border-solid border-agentx-card-header-border pb-[11px]' : 'rounded-agentx-card pb-3'}`}
				>
					<Heading
						id={id}
						icon={icon}
						logo={logo}
						title={title}
						subtitle={subtitle}
					/>
					<Icon
						icon={chevronDown}
						size={24}
						className={`mt-2 shrink-0 fill-agentx-card-chevron transition-transform group-hover:fill-agentx-card-chevron-hover motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
					/>
				</button>
			)}
			{open && !empty && (
				<div id={`${id}-body`} className="flex flex-col gap-3">
					<Fold.Provider value={() => turn(false)}>
						{children}
						{cancel && (
							<div className="flex justify-end">
								<DoneCard />
							</div>
						)}
					</Fold.Provider>
				</div>
			)}
		</section>
	);
};
