import { InlineCard } from '@agentx/chat/InlineCard';
import { FOLDING, inlineOf, UNSEEN } from '@agentx/chat/inline';
import { NewTabLink } from '@agentx/chat/NewTabLink';
import { PastedMap } from '@agentx/chat/PastedMap';
import { pageLines, usePageStepsStore } from '@agentx/chat/page-steps';
import { StatusLine, thinking } from '@agentx/chat/StatusLine';
import { failedStep, Steps } from '@agentx/chat/Steps';
import { PRESS } from '@agentx/chat/styles';
import { rehypeSwatches, Swatched } from '@agentx/chat/swatches';
import { isCard } from '@agentx/chat/tools';
import { Guide } from '@agentx/guide/Guide';
import { DocumentIcon } from '@agentx/guide/icons';
import { StoreGuide } from '@agentx/guide/store/StoreGuide';
import { HAND_OFF_PARAM, handOff } from '@agentx/lib/hand-off';
import { pastedMap } from '@agentx/lib/pasted-map';
import { blockName } from '@agentx/lib/versions';
import { Spinner } from '@agentx/spinner/Spinner';
import { useShellStore } from '@agentx/state/shell';
import { useStatusStore } from '@agentx/state/status';
import { Tooltip } from '@agentx/Tooltip';
import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { comment } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';
import { getToolName, isToolUIPart } from 'ai';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const { siteUrl } = window.extAgentXData ?? {};

// wp-admin has no site frame, so a change that shows only there is made on the site.
const OpenOnSite = ({ asked }) =>
	siteUrl ? (
		<a
			href={addQueryArgs(siteUrl, { [HAND_OFF_PARAM]: 1 })}
			onClick={() => handOff(asked)}
			className={`agentx-focus self-start rounded-agentx-control border border-solid border-agentx-button-border bg-agentx-button px-3 py-[5px] text-agentx-body font-agentx-button text-agentx-button-ink no-underline ${PRESS} hover:bg-agentx-button-hover`}
		>
			{
				// translators: Link under the AI Agent's reply in the WordPress dashboard, for a change it can only make with the website open beside it. Opens the website with the agent open.
				__('Open the agent on your site', 'extendify-local')
			}
		</a>
	) : null;

// A phone can't select a part, so the agent's ask to click one becomes an ask for words.
const DescribeCard = () => (
	<InlineCard
		icon={comment}
		title={
			// translators: Card in the AI Agent's chat on a phone, in place of asking the user to click a part of their web page.
			__('Which part of the page do you mean?', 'extendify-local')
		}
		subtitle={
			// translators: Under the question of which part of the web page the user means, on a phone, where picking a part by clicking it isn't available. The example in quotes is something the user might type.
			__(
				'Describe it in a few words, like “the heading in the team section”.',
				'extendify-local',
			)
		}
	/>
);

const describing = (blocks) => {
	const ask = blocks.findLastIndex((block) => block.text !== undefined);
	return ask === -1
		? [...blocks, { describe: true }]
		: blocks.map((block, at) => (at === ask ? { describe: true } : block));
};

const Picked = ({ type, label }) => {
	const name = sprintf(
		// translators: %s is the kind of block the user picked on their website, like Heading. Tooltip and screen reader name for the small icon on the user's message in the AI Agent's chat, showing that block was attached to the message.
		__('Attachment: %s', 'extendify-local'),
		label ?? blockName(type),
	);
	return (
		<Tooltip text={name} className="me-1.5 align-[-0.1875em]">
			<span
				role="img"
				aria-label={name}
				data-agentx-picked-icon
				className="inline-flex text-agentx-user-message-attachment"
			>
				<DocumentIcon className="size-4" />
			</span>
		</Tooltip>
	);
};

const MARKDOWN =
	'text-agentx-message leading-agentx-reply text-agentx-reply-ink [&_a]:text-agentx-reply-link [&_a]:underline [&_code]:rounded-agentx-code [&_code]:bg-agentx-code [&_code]:px-1 [&_h1]:font-agentx-reply-heading [&_h2]:font-agentx-reply-heading [&_h3]:font-agentx-reply-heading [&_li+li]:mt-1 [&_ol]:list-decimal [&_ol]:ps-5 [&_pre]:overflow-x-auto [&_pre]:rounded-agentx-control [&_pre]:bg-agentx-code [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:ps-5 [&>*+*]:mt-3';

const markdownParts = {
	a: ({ node: _node, ...link }) => <NewTabLink {...link} />,
	span: ({ node: _node, 'data-hex': hex, ...span }) =>
		hex ? <Swatched hex={hex} /> : <span {...span} />,
};
const markdownPlugins = [rehypeSwatches];

const textOf = (message) =>
	message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('');

// break-words would leave a long address at its full width, past the edge of the chat.
const Asked = ({ message }) => {
	const { text, map } = pastedMap(textOf(message));
	return (
		<p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-agentx-user-message border border-agentx-user-message-border bg-agentx-user-message px-3 py-2 text-agentx-message text-agentx-user-message-ink shadow-(--agentx-user-message-shadow)">
			{message.metadata?.picked && (
				<Picked
					type={message.metadata.picked.type}
					label={message.metadata.picked.label}
				/>
			)}
			{text && <span>{text}</span>}
			{map && <PastedMap {...map} />}
		</p>
	);
};

const FINISHED = ['output-available', 'output-error'];

// A failed inline tool shows as its step instead, so the failure is never silent.
const isInline = (part) =>
	isToolUIPart(part) &&
	Boolean(inlineOf(part)) &&
	!['input-streaming', 'output-error'].includes(part.state);

// A card waiting on the user shows in the gutter, and an inline one in place, not as a step.
// A picked plugin's install step already says what the pick did, and a form left open did nothing yet.
// A skipped card leaves no step unless it names one, as a closed form does.
const isStep = (part) =>
	isToolUIPart(part) &&
	(!inlineOf(part) || part.state === 'output-error') &&
	(!part.output?.skipped || Boolean(part.output?.done)) &&
	!part.output?.typed &&
	!part.output?.open &&
	!part.output?.picked &&
	!part.output?.confirm &&
	(FINISHED.includes(part.state) || !isCard(getToolName(part)));

const runningTool = (message) =>
	message?.role === 'assistant' &&
	message.parts
		.filter(isStep)
		.flatMap(pageLines)
		.findLast((part) => !FINISHED.includes(part.state));

// Each step's done and failed labels, sent beside its tool call.
const labelsOf = (message) =>
	Object.fromEntries(
		message.parts
			.filter(({ type }) => type === 'data-step')
			.map(({ id, data }) => [id, data]),
	);

// In the order they streamed, so nothing that arrives later lands above what already shows.
const blocksOf = (message) => {
	const blocks = [];
	for (const part of message.parts) {
		const last = blocks.at(-1);
		if (part.type === 'text' && part.text) {
			if (last?.text === undefined) {
				blocks.push({ text: part.text });
			} else {
				// A second model step starts a new paragraph.
				last.text += `\n\n${part.text}`;
			}
		}
		if (isInline(part) && !UNSEEN.includes(getToolName(part))) {
			blocks.push({ inline: part });
		}
		if (
			isToolUIPart(part) &&
			isCard(getToolName(part)) &&
			part.state === 'input-available'
		) {
			blocks.push({ waiting: part });
		}
		if (part.type === 'data-guide') {
			blocks.push({ guide: part.data?.guide ?? 'site' });
		}
		// The agent's lead into its card, sent apart from the reply's text.
		if (part.type === 'data-nudge' && part.data?.lead) {
			if (last?.text === undefined) blocks.push({ text: part.data.lead });
			else last.text += `\n\n${part.data.lead}`;
		}
		if (isStep(part)) {
			for (const line of pageLines(part)) {
				const tail = blocks.at(-1);
				const before = tail?.steps?.at(-1);
				// The pick's step says what its card did, with the picture.
				if (
					before &&
					getToolName(line) === 'card-change' &&
					isToolUIPart(before) &&
					isCard(getToolName(before))
				) {
					tail.steps.pop();
				}
				// A failed step stands alone, so it never hides inside a group.
				const failed = failedStep(line);
				if (tail?.steps && !tail.failed && !failed) tail.steps.push(line);
				else blocks.push({ steps: [line], failed });
			}
		}
	}
	return blocks;
};

// The fade token can be any unit; a probe's computed height reads it in pixels.
const fadeHeight = (log) => {
	const probe = log.ownerDocument.createElement('div');
	probe.style.cssText = 'display:none;height:var(--spacing-agentx-log-fade)';
	log.append(probe);
	const { height } = log.ownerDocument.defaultView.getComputedStyle(probe);
	probe.remove();
	return Number.parseFloat(height) || 0;
};
const GUIDE_GAP_REM = 0.5;

const atEnd = (log) => log.scrollHeight - log.scrollTop - log.clientHeight < 24;

// Every floating card pushes the end up, so none covers the newest message.
const barRoom = (column) => {
	const bar = column?.querySelector('[data-agentx-pushes]');
	return bar ? column.offsetHeight - bar.offsetTop : 0;
};

// About three quarters of a second for a block, however long it is.
const REVEAL_FRAMES = 45;

const wordEnds = (text) =>
	[...text.matchAll(/\S+/g)].map((word) => word.index + word[0].length);

// Each block lands whole once the backend has checked it for a written-out tool call.
const useRevealed = (text, live) => {
	const ends = wordEnds(text);
	const step = Math.ceil(ends.length / REVEAL_FRAMES);
	// Starting at none, the chat drops for a frame between the status line and the text.
	const [shown, setShown] = useState(live ? step : ends.length);
	// Text shown whole, as over a waiting card, would replay once the card is answered.
	if (!live && shown < ends.length) setShown(ends.length);
	const done = !live || shown >= ends.length;
	useEffect(() => {
		if (done) return;
		const frame = requestAnimationFrame(() =>
			setShown((count) => count + step),
		);
		return () => cancelAnimationFrame(frame);
	});
	return { shown: done ? text : text.slice(0, ends[shown - 1] ?? 0), done };
};

// What waited on the reply's text shows without a jump.
const FadeIn = ({ children }) => (
	<motion.div
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		transition={{ duration: 0.2 }}
	>
		{children}
	</motion.div>
);

const Reply = ({ text, live, onGrow, onRevealed }) => {
	const { shown, done } = useRevealed(text, live);
	useLayoutEffect(() => onGrow?.(), [shown]);
	useEffect(() => {
		if (live && done) onRevealed();
	}, [live, done]);
	return (
		<div className={MARKDOWN}>
			<ReactMarkdown components={markdownParts} rehypePlugins={markdownPlugins}>
				{shown}
			</ReactMarkdown>
		</div>
	);
};

export const Messages = ({
	messages,
	working,
	failed,
	status,
	demo,
	floating,
	inlineFor,
	onOutput,
	onAnswer,
	waitingCard,
	choices,
	onTyping,
	footer,
	planCard,
	chat,
}) => {
	const ref = useRef(null);
	const following = useRef(true);
	// A pick on a card that tries looks on the site keeps the card still while its step lands under it.
	const held = useRef(null);
	// A message cut off hard under the toolbar read as important, so the top fades once scrolled.
	const [faded, setFaded] = useState(false);
	const last = messages.at(-1);
	const phone = useShellStore((state) => state.phone);
	const blocksIn = (message) =>
		phone && message.metadata?.edit?.asks === 'select'
			? describing(blocksOf(message))
			: blocksOf(message);
	const latestStatus = useStatusStore((state) => state.text);
	// A page being made adds its steps as they start, outside the messages.
	usePageStepsStore((state) => state);
	const shown = status ?? latestStatus;
	const running = working && runningTool(last);
	const runningId = running?.toolCallId;
	// On a step's first render the store still holds older statuses.
	const cleared = useRef(null);
	const fresh =
		shown &&
		!(runningId && cleared.current !== runningId) &&
		// A status sent before a step finished repeats it.
		!last?.parts.some(
			(part) =>
				isStep(part) && FINISHED.includes(part.state) && part.title === shown,
		)
			? shown
			: null;
	// A card open on the chat is the agent's turn to wait, so nothing says it is working.
	const asking =
		last?.role === 'assistant' &&
		last.parts.some(
			(part) =>
				isToolUIPart(part) &&
				isCard(getToolName(part)) &&
				part.state === 'input-available',
		);
	// A line of the reply is not the end of the turn, so the status stays through it.
	// It went as the first words landed and the run carried on unsaid.
	const busy = working && !asking;
	const lastBlocks = last?.role === 'assistant' ? blocksIn(last) : [];
	// A step of its own carries the status, and a running plan shows its own; words carry none.
	const underWords = lastBlocks.length > 0 && !lastBlocks.at(-1)?.steps;
	const statusLine = busy &&
		(!lastBlocks.length || underWords) &&
		!planCard && (
			// Laid out as a running step, so its text doesn't move when the step takes its place.
			<div className="flex items-center gap-2 text-agentx-body">
				<Spinner />
				<StatusLine text={fresh ?? thinking()} />
			</div>
		);
	// Only the newest inline component stays open and warms its options.
	const latestInline = messages
		.flatMap(({ parts }) => parts)
		.findLast(
			(part) => isInline(part) && FOLDING.includes(getToolName(part)),
		)?.toolCallId;
	// Replies already there when the chat opened show whole.
	const [restored] = useState(() => new Set(messages.map(({ id }) => id)));
	const [revealed, setRevealed] = useState(() => new Set());
	const markRevealed = (key) =>
		setRevealed((was) => (was.has(key) ? was : new Set(was).add(key)));
	const reveals =
		!demo && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
	// A floating card shows at once, so its reply skips typing out under it.
	const waiting = asking;
	const live = (message) =>
		reveals && !restored.has(message.id) && !(message === last && waiting);
	// What follows a block still typing waits, or it lands above unwritten words.
	const typing = (message) =>
		live(message)
			? blocksIn(message).findIndex(
					(block, at) =>
						block.text !== undefined && !revealed.has(`${message.id}:${at}`),
				)
			: -1;
	const nudgeOf = (message) => {
		const card = inlineFor?.(message);
		return card && live(message) ? <FadeIn>{card}</FadeIn> : card;
	};
	const shownBlocks = (message) => {
		const blocks = blocksIn(message);
		const at = typing(message);
		return at === -1 ? blocks : blocks.slice(0, at + 1);
	};
	const keepHeld = () => {
		const log = ref.current;
		const { element, top } = held.current ?? {};
		if (!log || !element?.isConnected) {
			held.current = null;
			return false;
		}
		log.scrollTop += element.getBoundingClientRect().top - top;
		return true;
	};
	// A reply's first frame lands before the log is attached.
	const follow = () => {
		const log = ref.current;
		if (keepHeld()) return;
		if (log && following.current) log.scrollTop = log.scrollHeight;
	};
	// The observer can fire after React has dropped the log, between a crash and the disconnect.
	const makeRoom = () =>
		ref.current?.style.setProperty(
			'--agentx-bar-height',
			`${barRoom(floating?.current)}px`,
		);
	// A reload's note answers nothing; while it's last, its own card says so.
	const unanswered = (index) =>
		messages
			.slice(index + 1)
			.find(({ parts }) =>
				parts.every(({ type }) => type !== 'data-interrupted'),
			)?.role === 'user' ||
		(index === messages.length - 1 && failed);

	const lastTyping = last?.role === 'assistant' && typing(last) !== -1;
	// Before paint, or the reply's nudges flash on for the one frame before it starts typing.
	useLayoutEffect(() => onTyping?.(lastTyping), [lastTyping]);

	// Statuses from before the step would come back once it ends.
	useEffect(() => {
		if (!runningId) return;
		useStatusStore.getState().clear();
		cleared.current = runningId;
	}, [runningId]);

	useLayoutEffect(() => {
		if (last?.role === 'user') {
			following.current = true;
			held.current = null;
		}
		// The bar starting to leave resizes nothing, so the observer misses it.
		makeRoom();
		if (keepHeld()) return;
		if (following.current) ref.current.scrollTop = ref.current.scrollHeight;
	});

	// A guide taller than the chat would open on its last steps, not its welcome; it often lands after the first render.
	const placed = useRef(null);
	// Each guide placed once, so one put in later, like the store's, opens at its top too.
	useLayoutEffect(() => {
		if (placed.current === last?.id) return;
		const guide = [...ref.current.querySelectorAll('[data-agentx-guide]')].at(
			-1,
		);
		if (!guide || last?.parts.every(({ type }) => type !== 'data-guide')) {
			return;
		}
		placed.current = last.id;
		following.current = false;
		const log = ref.current;
		// The guide's top lands a little under the top fade, wherever it sits in the log.
		const room =
			fadeHeight(log) +
			GUIDE_GAP_REM *
				Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
		log.scrollTop = Math.max(
			0,
			log.scrollTop +
				guide.getBoundingClientRect().top -
				log.getBoundingClientRect().top -
				room,
		);
	});

	useEffect(() => {
		const log = ref.current;
		const observer = new ResizeObserver(() => {
			makeRoom();
			follow();
		});
		// Replies that land while the phone's sheet is closed can't scroll the hidden log.
		// Its padding follows the draft bar, which must not count as the log resizing.
		observer.observe(log, { box: 'border-box' });
		if (floating?.current) observer.observe(floating.current);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={ref}
			role="log"
			onScroll={({ currentTarget: log }) => {
				following.current = atEnd(log);
				setFaded(log.scrollTop > 4);
			}}
			onPointerDown={({ target }) => {
				const card = target.closest?.('[data-agentx-holds]');
				held.current = card
					? { element: card, top: card.getBoundingClientRect().top }
					: null;
			}}
			// Scrolling by hand lets the log follow again.
			onWheel={() => {
				held.current = null;
			}}
			onTouchMove={() => {
				held.current = null;
			}}
			// The scrollbar would sit on the user's messages, and a focus ring at the left edge would be cut off.
			// The room under the last line is an ::after: as padding, the sticky plan card counted it twice.
			// Scroll padding keeps a focused control above the draft bar and one-row cards.
			className={`-ms-2 -me-3 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto ps-2 pe-3 after:block after:shrink-0 after:content-[''] ${footer ? 'after:h-[var(--agentx-bar-height,0px)]' : 'after:h-[calc(var(--agentx-bar-height,0px)+--spacing(21))]'} scroll-pb-[calc(var(--agentx-bar-height,0px)+--spacing(25))] [scrollbar-color:var(--color-agentx-scrollbar)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] ${faded ? '[mask-image:linear-gradient(to_bottom,transparent,#000_var(--spacing-agentx-log-fade))]' : ''}`}
		>
			{messages.map((message, index) =>
				message.metadata?.hidden ? null : message.role === 'user' ? (
					<div
						key={message.id}
						className="flex max-w-[85%] flex-col items-end gap-1 self-end"
					>
						<Asked message={message} />
						{unanswered(index) && (
							<span className="text-agentx-caption text-agentx-not-answered">
								{
									// translators: Shown under the user's message in the AI Agent's chat when the agent's reply to it failed.
									__('Not answered', 'extendify-local')
								}
							</span>
						)}
					</div>
				) : (
					// Empty, it would still take the log's gap and push the status line down.
					<div key={message.id} className="flex flex-col gap-3 empty:hidden">
						{shownBlocks(message).map((block, at, blocks) => {
							const shown = (key, element) =>
								live(message) && block.text === undefined ? (
									<FadeIn key={key}>{element}</FadeIn>
								) : (
									element
								);
							if (block.describe) {
								return shown('describe', <DescribeCard key="describe" />);
							}
							if (block.guide === 'store') {
								return shown(
									'store-guide',
									<StoreGuide key="store-guide" chat={chat} />,
								);
							}
							if (block.guide) {
								return shown('guide', <Guide key="guide" chat={chat} />);
							}
							if (block.waiting) {
								return block.waiting.toolCallId === waitingCard?.id
									? shown(
											block.waiting.toolCallId,
											<div key={block.waiting.toolCallId}>
												{waitingCard.element}
											</div>,
										)
									: null;
							}
							if (block.inline) {
								const Inline = inlineOf(block.inline);
								return shown(
									block.inline.toolCallId,
									<Inline
										key={block.inline.toolCallId}
										part={block.inline}
										onOutput={
											onOutput &&
											((fields) => onOutput(block.inline.toolCallId, fields))
										}
										onAnswer={
											onAnswer &&
											((output) => onAnswer(block.inline.toolCallId, output))
										}
										latest={block.inline.toolCallId === latestInline}
										movedOn={message !== last}
										takesFocus={
											!demo &&
											!restored.has(message.id) &&
											message === last &&
											at === blocks.length - 1
										}
										chat={chat}
										floating={floating}
									/>,
								);
							}
							return block.steps ? (
								shown(
									block.steps[0].toolCallId,
									<Steps
										key={block.steps[0].toolCallId}
										steps={block.steps}
										labels={labelsOf(message)}
										working={
											busy && message === last && at === blocks.length - 1
										}
										status={fresh}
									/>,
								)
							) : (
								<Reply
									key={`text-${at}`}
									text={block.text}
									live={live(message)}
									onGrow={follow}
									onRevealed={() => markRevealed(`${message.id}:${at}`)}
								/>
							);
						})}
						{typing(message) === -1 && message.metadata?.notHere && (
							<OpenOnSite
								asked={textOf(
									messages
										.slice(0, index)
										.findLast(({ role }) => role === 'user'),
								)}
							/>
						)}
						{typing(message) === -1 && nudgeOf(message)}
						{message === last && choices}
						{message === last && statusLine}
					</div>
				),
			)}
			{last?.role !== 'assistant' && statusLine}
			{/* A card whose reply isn't shown still shows. */}
			{waitingCard &&
				!messages.some(({ parts }) =>
					parts?.some(({ toolCallId }) => toolCallId === waitingCard.id),
				) &&
				waitingCard.element}
			{footer && (
				// Every new message lands above it, and it stays in view over the gutter as the log scrolls.
				<div className="sticky bottom-[calc(var(--agentx-bar-height,0px)+--spacing(4))] z-[1] flex flex-col gap-3">
					{footer}
				</div>
			)}
		</div>
	);
};
