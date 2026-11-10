import { ChatRail, DraftNotices } from '@agentx/CanvasBar';
import { ActionCard } from '@agentx/chat/ActionCard';
import { AskedLine } from '@agentx/chat/AskedLine';
import { askedLine } from '@agentx/chat/asked';
import { ChangedElsewhere } from '@agentx/chat/ChangedElsewhere';
import { ChangesSheet } from '@agentx/chat/ChangesSheet';
import { ChatBox } from '@agentx/chat/ChatBox';
import { ChatError } from '@agentx/chat/ChatError';
import { CommandsSheet } from '@agentx/chat/CommandsSheet';
import { CARDS } from '@agentx/chat/cards';
import {
	ADJUST_COLORS,
	colorTargetsOf,
	recolored,
} from '@agentx/chat/color-turn';
import {
	addsIn,
	answerCard,
	answerChoice,
	answerProactive,
	answerTyped,
	asksFirst,
	asksToPick,
	blockName,
	changedIn,
	closeForm,
	colorsOpen,
	conversation,
	copiesIn,
	deleteQueued,
	dropInterrupted,
	endedWell,
	endsInWords,
	fillChatBox,
	finishCall,
	formsOfCard,
	formsStillOpen,
	holdingCard,
	insertStoreGuide,
	interruptedIn,
	linesUpTasks,
	locked,
	markOutput,
	markPlanEnded,
	movesIn,
	nudgedOf,
	nudgesSent,
	offersFollowUps,
	owesLine,
	pendingCard,
	renamedBy,
	replanIn,
	restored,
	retry,
	routeOfFilled,
	runningIn,
	runOf,
	saveConversation,
	sendDuringPlan,
	sendFeedback,
	sendForm,
	sending,
	sendNow,
	sendPlanEdit,
	sendPlanStep,
	sendQueued,
	sendReplan,
	sendReport,
	sendReportComment,
	sendTask,
	sendText,
	sendWrapUp,
	showCard,
	showForm,
	skippingCard,
	startStoreGuide,
	stopRun,
	stopStep,
	submit,
	takenBack,
	touchesSite,
	tryAgain,
	wrapsUp,
} from '@agentx/chat/conversation';
import { DraftBar } from '@agentx/chat/DraftBar';
import { Feedback } from '@agentx/chat/Feedback';
import { FeedbackSheet } from '@agentx/chat/FeedbackSheet';
import { FormCard } from '@agentx/chat/FormCard';
import { formOf } from '@agentx/chat/forms';
import { gutterOf } from '@agentx/chat/gutter';
import { Messages } from '@agentx/chat/Messages';
import { Nudge } from '@agentx/chat/Nudge';
import { OneButtonCard } from '@agentx/chat/OneButtonCard';
import { PlanPanel } from '@agentx/chat/PlanPanel';
import { PluginUpdate } from '@agentx/chat/PluginUpdate';
import { ProactiveCard } from '@agentx/chat/ProactiveCard';
import { usePlanFocus } from '@agentx/chat/plan-focus';
import {
	afterImage,
	afterPhone,
	bringUp,
	guideFinished,
	onPage,
	pageNudge,
	proactiveInstall,
	storeFinished,
} from '@agentx/chat/plugin-nudges';
import { QuestionCard } from '@agentx/chat/QuestionCard';
import { QueuedMessage } from '@agentx/chat/QueuedMessage';
import { RefreshCard } from '@agentx/chat/RefreshCard';
import { ReportNote } from '@agentx/chat/ReportNote';
import { previewsMap } from '@agentx/chat/results';
import { SimpleMultipleChoice } from '@agentx/chat/SimpleMultipleChoice';
import { ROW_CARD_SHAPE } from '@agentx/chat/styles';
import { allSuggestions, PROFILE_REFRESHES } from '@agentx/chat/suggestions';
import { TaskCard } from '@agentx/chat/TaskCard';
import { isCard } from '@agentx/chat/tools';
import { WelcomeBack } from '@agentx/chat/WelcomeBack';
import { GuideImageSheet } from '@agentx/guide/GuideImageSheet';
import { siteFrame } from '@agentx/lib/block-box';
import { stagedCount } from '@agentx/lib/changes';
import { askToSave, askToSaveDue, undoTo } from '@agentx/lib/draft-actions';
import {
	feedbackDue,
	markFeedbackAnswered,
	markFeedbackShown,
} from '@agentx/lib/feedback';
import { takeHandOff } from '@agentx/lib/hand-off';
import { menuLinkTask } from '@agentx/lib/menu-task';
import {
	chosenNudge,
	countWorkflow,
	finishedWorkflows,
	keepsToChatBox,
	markCalled,
	markInteracted,
	markNudgeShown,
	namedNudges,
	rankNudges,
	readHistory,
	restartCooldown,
	startCooldowns,
	taskNudge,
	WEIGHT,
	weighed,
} from '@agentx/lib/nudges';
import {
	guideComplete,
	STORE_NUDGE,
	siteFacts,
	storeGuideDue,
} from '@agentx/lib/outstanding';
import { lastMadePost, pageForMenu } from '@agentx/lib/pages';
import { flashPart, hidePart, showPart } from '@agentx/lib/part-preview';
import { pickAfterRun, useBlockPicker } from '@agentx/lib/pick-block';
import {
	agentOffer,
	needsLine,
	rowOf,
	withWritten,
} from '@agentx/lib/row-cards';
import { enterSite } from '@agentx/lib/site-focus';
import { coverWhile } from '@agentx/lib/switch-site';
import { track } from '@agentx/lib/track';
import { welcomeBackItems } from '@agentx/lib/welcome-back';
import { useChangedStore } from '@agentx/state/changed';
import { useDraftStore } from '@agentx/state/draft';
import { useFeedbackStore } from '@agentx/state/feedback';
import {
	editForm,
	minimizeForm,
	restoreForm,
	useFormsStore,
} from '@agentx/state/forms';
import { useGuideStore } from '@agentx/state/guide';
import { closeGutter, useGutterStore } from '@agentx/state/gutter';
import {
	answerInline,
	clearParts,
	dismissInline,
	markAnswered,
	showNudge,
	takeHeld,
	useNudgeStore,
} from '@agentx/state/nudges';
import { usePageStore } from '@agentx/state/page';
import {
	addCopies,
	batchOf,
	completePlan,
	editsOf,
	endOf,
	endPlanUndone,
	idOf,
	lastEdit,
	markBackNotDone,
	markDuring,
	markEdited,
	markLater,
	markMade,
	markNotDone,
	markSent,
	markSentBack,
	markSkipped,
	nextEdit,
	orderOf,
	remapParts,
	resumePlan,
	stopPlan,
	stopPlanning,
	usePlanStore,
	wrapOf,
} from '@agentx/state/plan';
import { useProfileStore } from '@agentx/state/profile';
import { useQueueStore } from '@agentx/state/queue';
import {
	dropReport,
	lastAsked,
	offerReport,
	openNote,
	useReportStore,
} from '@agentx/state/report';
import { useRunStore } from '@agentx/state/run';
import { useSavedImageStore } from '@agentx/state/saved-image';
import { useSelectionStore } from '@agentx/state/selection';
import { useShellStore } from '@agentx/state/shell';
import { useStoreGuideStore } from '@agentx/state/store-guide';
import { clearTasks, lineUpTasks, useTasksStore } from '@agentx/state/tasks';
import { useChat } from '@ai-sdk/react';
import {
	flushSync,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { error, Icon } from '@wordpress/icons';
import { getToolName, isToolUIPart } from 'ai';
import {
	AnimatePresence,
	motion,
	useIsPresent,
	useReducedMotion,
} from 'motion/react';

// Gutter tools that ask a question, which show in the chat; the confirms stay in the gutter.
const ASKS_IN_CHAT = ['choose-page', 'choose-many', 'media-upload'];

const discarding = (title) => ({
	text: sprintf(
		// translators: %s is the title of a form in the AI Agent's chat, like “Your site profile”. The agent asks the user to confirm closing it, which loses what they typed.
		__('Discard what you typed in “%s”?', 'extendify-local'),
		title,
	),
	// translators: Button that closes a form in the AI Agent's chat, losing what the user typed in it.
	button: __('Discard', 'extendify-local'),
	danger: true,
	// translators: Button that keeps a form open, closing the AI Agent's question about discarding what the user typed.
	dismiss: __('Cancel', 'extendify-local'),
});

// A demo state shows its own status, apart from the live run's flags.
const workingOn = (status, last) =>
	status === 'submitted' || status === 'streaming' || runningIn(last);

// A plan comes back to plan edit this many times at most, or two steps could send it back and forth.
const MOST_BACKS = 2;
// Plan edit reads why a step went back, as the backend's own reasons are.
const GONE = "The block this step works on isn't on the page anymore.";
const ADDED = 'A step added blocks the steps after it were planned without.';

// The panel shows a plan's steps, so a step's reply keeps only its words.
const planOf = ({ metadata, parts }) =>
	metadata?.planStep?.plan ??
	metadata?.planEdit?.plan ??
	metadata?.duringPlan?.plan ??
	parts.find(({ type }) => type === 'tool-show-plan')?.toolCallId;

const isEnded = (part) =>
	part.type === 'tool-show-plan' &&
	Boolean(part.output?.ended) &&
	!part.input?.revises;

const endedLast = (messages) =>
	messages
		.flatMap(({ parts }) => parts)
		.filter(isEnded)
		.reduce((all, part) => {
			const to = all.findLastIndex(
				(message) => planOf(message) === part.toolCallId,
			);
			if (to === -1) return all;
			return all.map((message, at) => {
				const rest = message.parts.filter((each) => each !== part);
				if (at !== to) {
					return rest.length === message.parts.length
						? message
						: { ...message, parts: rest };
				}
				const closing = rest.findIndex(({ type }) => type === 'data-closing');
				const cut = closing === -1 ? rest.length : closing;
				return {
					...message,
					parts: [...rest.slice(0, cut), part, ...rest.slice(cut)],
				};
			});
		}, messages);

// A plan's rewrite shows on its card, so what it read on the way stays out of the log.
const rewriting = (part) =>
	isToolUIPart(part) && !isCard(getToolName(part)) && !isEnded(part);

// The plan pinned under the chat while its closing line is written shows only there.
const unpinned = (messages, pinned) =>
	messages.map((message) =>
		pinned && message.parts.some((part) => part.toolCallId === pinned)
			? {
					...message,
					parts: message.parts.filter((part) => part.toolCallId !== pinned),
				}
			: message,
	);

const forLog = (messages, pinned) =>
	unpinned(endedLast(messages), pinned).flatMap((message) => {
		if (
			message.role === 'user' &&
			(message.metadata?.planEdit || message.metadata?.again)
		) {
			return [];
		}
		if (
			message.role === 'assistant' &&
			(message.metadata?.planEdit || message.metadata?.duringPlan)
		) {
			const parts = message.parts.filter((part) => !rewriting(part));
			return parts.some(({ type }) => type !== 'step-start')
				? [{ ...message, parts }]
				: [];
		}
		// What a wrap-up sent back to plan mode is the agent's own ask, never the user's.
		if (message.role === 'user' && message.metadata?.replan) return [];
		if (!message.metadata?.planStep) return [message];
		if (message.role === 'user') return [];
		// The closing line streams into the last step's reply, with its lead into the next card.
		const parts = message.parts.filter(
			(part) =>
				part.type === 'text' ||
				part.type === 'step-start' ||
				part.type === 'data-nudge' ||
				isEnded(part) ||
				(isToolUIPart(part) &&
					isCard(getToolName(part)) &&
					part.state === 'input-available') ||
				// The pick, so the step's line about its card isn't left hanging.
				(isToolUIPart(part) && getToolName(part) === 'card-change') ||
				// A map's step, or a map a plan made never shows its preview.
				(isToolUIPart(part) && previewsMap(part)),
		);
		return parts.some(({ type }) => type !== 'step-start')
			? [{ ...message, parts }]
			: [];
	});

const textOf = ({ parts }) =>
	parts
		.filter(({ type }) => type === 'text')
		.map(({ text }) => text)
		.join('');

// The user's own messages, oldest first, for Up and Down in the chat box.
const sentTexts = (messages) =>
	messages
		.filter(
			({ role, metadata }) =>
				role === 'user' &&
				!metadata?.planStep &&
				!metadata?.planEdit &&
				!metadata?.replan &&
				!metadata?.again,
		)
		.map(textOf)
		.filter(Boolean);

// A demo state's buttons would otherwise reach the backend or WordPress's updater.
const blockClicks = (event) => {
	if (!event.target.closest('a, button')) return;
	event.preventDefault();
	event.stopPropagation();
};

const UpdateNotice = ({ floor, url }) => (
	<OneButtonCard
		kind="update"
		// translators: Screen reader name for the AI Agent's notice that WordPress is too old for it to chat.
		label={__('WordPress update needed', 'extendify-local')}
		text={sprintf(
			// translators: %s is a WordPress version number, like 7.0. Shown above the AI Agent's disabled chat box on a site running an older WordPress.
			__(
				'The agent requires WordPress version %s or later.',
				'extendify-local',
			),
			floor,
		)}
		button={
			url &&
			// translators: Link to the WordPress updates screen, under the AI Agent's notice that WordPress is too old to chat.
			__('Update WordPress', 'extendify-local')
		}
		href={url}
	/>
);

const TooLong = () => (
	<p
		role="alert"
		className={`m-0 flex items-center gap-1.5 ${ROW_CARD_SHAPE} border-agentx-too-long-card-border bg-agentx-too-long-card px-3 py-3 [font-weight:var(--font-weight-agentx-notice-title,var(--font-weight-agentx-title,500))] text-agentx-too-long-card-ink`}
	>
		<Icon icon={error} size={20} className="shrink-0 fill-current" />
		{
			// translators: Shown over the AI Agent's chat box when the message typed is over the length it accepts.
			__('Message too long', 'extendify-local')
		}
	</p>
);

const EASE_OUT = [0.23, 1, 0.32, 1];

// In on a strong ease-out; out sooner and with less travel, since the user has moved on.
const gutterMotion = (still) => ({
	initial: { opacity: 0, y: 8 },
	animate: {
		opacity: 1,
		y: 0,
		transition: still ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT },
	},
	exit: {
		opacity: 0,
		y: 4,
		transition: still ? { duration: 0 } : { duration: 0.15, ease: EASE_OUT },
	},
});

// Content fading out of the gutter keeps its old handlers, so it takes no clicks or focus.
const Leaving = ({ onLeave, children }) => {
	const present = useIsPresent();
	const ref = useRef(null);
	const leave = useRef(onLeave);
	leave.current = onLeave;
	// Content that comes back before it's gone takes clicks again.
	useLayoutEffect(() => {
		if (!ref.current) return;
		if (!present && ref.current.contains(document.activeElement)) {
			leave.current?.();
		}
		ref.current.inert = !present;
	}, [present]);
	return (
		<div ref={ref} className="flex flex-col gap-3">
			{children}
		</div>
	);
};

const GutterItem = ({ onLeave, children }) => {
	const reduceMotion = useReducedMotion();
	const present = useIsPresent();
	return (
		<motion.div
			// Leaving, it gives its room back at once, or the conversation drops after the fade.
			data-agentx-pushes={present || undefined}
			{...gutterMotion(reduceMotion)}
		>
			<Leaving onLeave={onLeave}>{children}</Leaving>
		</motion.div>
	);
};

const draftSteps = (titles = []) =>
	titles.map((title, at) => ({ id: `draft-${at}`, title, state: 'pending' }));

// Not a backend step: the closing line's check.
const ROWS = ['action', 'task', 'setup', 'refresh'];

// The words a card showed, which the agent judges the message answering it against.
const cardWords = (card) =>
	ROWS.includes(card?.type)
		? rowOf(card).text
		: (card?.card?.text ?? card?.text);

const clickSends = (card) => {
	if (card.type === 'setup') {
		return card.details.bell?.message ?? card.details.request;
	}
	return card.type === 'refresh' ? card.details.request : card.text;
};

// The server judges the message against these, like a card typed over.
const aboutNudge = (
	id,
	card,
	request,
	{ workflow = card?.details?.workflow, taken = true } = {},
) => ({
	id,
	card: cardWords(card),
	request,
	...(workflow && { workflow }),
	taken,
});

const confirmingStep = () => ({
	id: 'confirm',
	// translators: The last step of the AI Agent's plan, a list of steps above the chat box, shown while it checks the finished changes against what the user asked.
	title: __('Confirming the result', 'extendify-local'),
	state: 'running',
});

export const Chat = (notices) => {
	const live = useChat({ chat: conversation });
	const demo = useShellStore((state) => state.chatDemo);
	const { regenerate } = live;
	// Each typed-past nudge is judged once, by the reply to the words that passed it.
	const judged = useRef(new Set());
	const box = useRef(null);
	// A phone would pop its keyboard up over the site.
	useEffect(() => {
		if (demo || window.matchMedia('(max-width: 782px)').matches) return;
		box.current?.focus({ preventScroll: true });
	}, []);
	// A request wp-admin couldn't make comes along, and the user says whether to make it here.
	useEffect(() => {
		const asked = !demo && takeHandOff();
		if (!asked) return;
		const shown = asked.length > 120 ? `${asked.slice(0, 120)}…` : asked;
		useGutterStore.setState({
			card: {
				text: sprintf(
					// translators: %s is a request the user typed to the AI Agent in the WordPress dashboard, which can only be done on the website. Shown when the agent opens on the website from there.
					__('Continue with “%s”?', 'extendify-local'),
					shown,
				),
				// translators: Button that sends the user's request from the WordPress dashboard to the AI Agent on the website.
				button: __('Continue', 'extendify-local'),
				// translators: Button that drops the user's request from the WordPress dashboard instead of sending it to the AI Agent on the website.
				dismiss: __('Cancel', 'extendify-local'),
				onPress: () => submit(asked),
				onDismiss: () => {
					closeGutter();
					box.current?.focus();
				},
			},
		});
	}, []);
	useEffect(
		() =>
			useSavedImageStore.subscribe(({ image }) => {
				afterImage(image);
			}),
		[],
	);
	const root = useRef(null);
	const floating = useRef(null);
	const { messages = [], status = 'ready', error } = demo ?? live;
	const { update, pluginUpdate, pluginUpdateUrl } = demo ?? notices;
	const { compact } = notices;
	const last = messages.at(-1);
	const nudged = demo ? last : nudgedOf(messages);
	// A demo state stands in for the chat only, so the site and draft follow the live run.
	const liveWorking = runOf(live).working;
	const working = demo ? workingOn(status, last) : liveWorking;
	const liveQueue = useQueueStore();
	useEffect(() => {
		saveConversation();
	}, [live.messages, live.status]);
	// The note stays up while Try again undoes what the cut run changed.
	const [undoing, setUndoing] = useState(false);
	// Where a reload cut a run off, until the user tries it again or moves on.
	const cut = demo
		? (demo.interrupted ?? null)
		: !working && !error
			? interruptedIn(messages)
			: null;
	const unsaved = useDraftStore((state) => state.unsaved);
	const guideSheet = useGuideStore((state) => state.sheet);
	// Only finishing the Site Guide in this chat says so; one done before it opened stays quiet.
	const guideDone = useGuideStore((state) => guideComplete(state.steps));
	const guideWasDone = useRef(guideDone);
	useEffect(() => {
		if (guideDone && !guideWasDone.current && !demo) guideFinished();
		guideWasDone.current = guideDone;
	}, [guideDone]);
	const storeFinishedAt = useStoreGuideStore((state) => state.finishedAt);
	// Next on an already-done step finishes the guide again, and the line stacked up.
	const storeWasFinished = useRef(Boolean(storeFinishedAt));
	useEffect(() => {
		if (storeFinishedAt && !storeWasFinished.current && !demo) storeFinished();
		storeWasFinished.current = Boolean(storeFinishedAt);
	}, [storeFinishedAt]);
	const staged = useDraftStore((state) => stagedCount(state) > 0);
	const liveNotice = useDraftStore((state) => state.notice);
	const liveClashes = useDraftStore((state) => state.clashes);
	const livePresence = useDraftStore((state) => state.presence);
	const clashes = demo ? (demo.clashes ?? []) : liveClashes;
	const presence = demo ? demo.presence : livePresence;
	// A stuck bar must show at once, and the gutter may hold a half-answered card.
	const stuck = clashes.length > 0;
	const liveApplied = useDraftStore((state) => state.applied);
	const applied = demo ? Boolean(demo.applied) : liveApplied;
	// Only dropped edits are worth a word in the chat; another tab's newer draft just shows.
	const notice = demo
		? demo.drift
		: liveNotice?.dropped?.length
			? liveNotice
			: null;
	const page = usePageStore((state) => state.page);
	const storeOpening = useStoreGuideStore((state) => state.opening);
	useEffect(() => {
		if (!storeOpening || working) return;
		useStoreGuideStore.setState({ opening: false });
		markCalled(STORE_NUDGE);
		insertStoreGuide();
	}, [storeOpening, working]);
	// Only a page about a nudge brings one up; moving to another page clears the card.
	useEffect(() => {
		const path = page?.path;
		if (demo || !path) return;
		const { landedOn, picks } = useNudgeStore.getState();
		useNudgeStore.setState({ landedOn: path });
		if (landedOn === path || working) return;
		const shown = (nudged && picks[nudged.id]) || {};
		const showing = Boolean(shown.inline || shown.placeholder || shown.gutter);
		const guideOpen = Boolean(
			nudged?.parts.some(({ type }) => type === 'data-guide'),
		);
		if (landedOn === undefined) {
			if (nudged && !showing)
				bringUp(pageNudge(page, { guideOpen }), nudged.id);
			return;
		}
		if (usePageStore.getState().byAgent) return;
		// A task is the user's own request, so it outlasts the page.
		if (shown.inline?.type === 'task') return;
		if (showing) dismissInline(nudged.id, ['placeholder', 'gutter']);
		if (nudged) bringUp(pageNudge(page, { guideOpen }), nudged.id);
	}, [page?.path]);
	// The list of unsaved changes, over the conversation; the chat waits while it's open.
	const changesOpen = useShellStore((state) => state.changesOpen);
	const setChangesOpen = useShellStore((state) => state.setChangesOpen);
	const canvasBar = useShellStore((state) => state.canvasBar);
	// What the agent can do, opened by / in an empty chat box or by asking.
	const [commandsOpen, setCommandsOpen] = useState(false);
	const [feedbackOpen, setFeedbackOpen] = useState(false);
	const reportSent = useRef(null);
	// A demo state shows only its own sheets, not ones left open in the live chat.
	const showChanges = demo ? Boolean(demo.changes) : changesOpen;
	const showCommands = demo ? Boolean(demo.commands) : commandsOpen;
	useEffect(() => {
		if (commandsOpen) track('commands-opened');
	}, [commandsOpen]);
	const showFeedback = demo ? Boolean(demo.feedback) : feedbackOpen;
	const reportAfter = useReportStore((state) => state.after);
	const reportNote = useReportStore((state) => state.note);
	const flagged = useReportStore((state) => state.flagged);
	// A tester's ERROR sends the chat at once and asks what went wrong.
	useEffect(() => {
		if (!flagged) return;
		useReportStore.setState({ flagged: null });
		reportIssue();
	}, [flagged]);
	// Offline isn't something for the team to look into.
	useEffect(() => {
		if (!demo && live.error && navigator.onLine) offerReport(live.messages);
	}, [live.error]);
	const opener = useRef(null);
	const feedbackOpener = useRef(null);
	const queue = demo ? { text: demo.queued ?? '' } : liveQueue;
	const planRunning = usePlanStore((state) => Boolean(state.plan));
	useEffect(() => {
		useRunStore.setState({
			working: liveWorking,
			// The site's own toast stands for the whole run that works on the page, from the
			// look for the part to the last edit, and goes once a card waits or the run ends.
			changing:
				liveWorking &&
				!pendingCard(live.messages) &&
				touchesSite(live.messages),
		});
		// A message typed while a plan runs goes once the plan ends, not between its steps.
		if (!liveWorking && !planRunning) {
			sendQueued();
			return;
		}
		// A held message waits for this run instead, since the user started it.
		if (liveWorking)
			useQueueStore.setState({ held: false, closingFirst: false });
	}, [liveWorking, planRunning]);
	// Picked once per reply as its run ends, so a nudge's random weight can't change it later.
	const picks = useNudgeStore((state) => state.picks);
	const liveAsk = useFeedbackStore((state) => state.ask);
	const colorsDone = useNudgeStore((state) => state.colorsDone);
	// A reply waiting on a card resumes once it's answered, with a new trace.
	const liveCard = pendingCard(live.messages)?.toolCallId;
	const liveHold = holdingCard(live.messages)?.toolCallId;
	// A card's save can add another step, so the reply isn't over yet.
	const answeringCard = useRunStore((state) => state.answering);
	const livePlan = usePlanStore((state) => state.plan);
	const gutterOpen = useGutterStore((state) => Boolean(state.card));
	// A demo state shows only its own, not the live chat's.
	const plan = demo ? (demo.plan ?? null) : livePlan;
	const planShown = Boolean(plan);
	const planWaits = !demo && Boolean(liveCard || answeringCard);
	const livePlanning = usePlanStore((state) => state.planning);
	// A question from plan mode takes the card's place until it's answered.
	const planningShown =
		!demo && !livePlan && Boolean(livePlanning) && !planWaits;
	// A run that ends with no plan leaves no card.
	useEffect(() => {
		if (!liveWorking) stopPlanning();
	}, [liveWorking]);
	// A message typed during the plan, or a step sent back, has plan edit rewrite what's left.
	const adjusting =
		!demo &&
		!planWaits &&
		Boolean(livePlan?.sent?.edit || livePlan?.sent?.during);
	// A finished plan's card stays until its closing line starts, or the chat sits empty while it's written.
	const [ended, setEnded] = useState(null);
	const running = useRef(null);
	useEffect(() => {
		if (livePlan) {
			running.current = livePlan;
			setEnded(null);
			return;
		}
		const was = running.current;
		running.current = null;
		if (!was) return;
		const finished = usePlanStore.getState().completed === was.toolCallId;
		const last = live.messages.at(-1);
		setEnded({
			id: was.toolCallId,
			title: finished ? was.titleDone || was.title : was.title,
			steps: was.steps.map((step) =>
				step.state === 'running'
					? { ...step, state: finished ? 'done' : 'canceled' }
					: step,
			),
			at: last?.id,
			said: last ? textOf(last) : '',
		});
	}, [livePlan]);
	const lastNow = live.messages.at(-1);
	const endedShown =
		!demo &&
		Boolean(ended) &&
		lastNow?.id === ended.at &&
		textOf(lastNow) === ended.said;
	// A step's newest added block, else its own; plan edit works on the plan's whole part.
	const stepReply = livePlan && lastNow?.role === 'assistant' ? lastNow : null;
	const madeNow = stepReply
		? [...addsIn(stepReply), ...copiesIn(stepReply).map(({ to }) => to)].at(-1)
		: null;
	usePlanFocus(
		!demo && livePlan
			? (madeNow ??
					(livePlan.sent?.edit
						? idOf(livePlan, livePlan.part)
						: (nextEdit(livePlan)?.part ??
							lastEdit(livePlan)?.part ??
							idOf(livePlan, livePlan.part))))
			: null,
		livePlan?.sent,
	);
	useEffect(() => {
		const ended = live.messages.at(-1);
		if (
			liveWorking ||
			liveCard ||
			liveHold ||
			answeringCard ||
			// A plan wraps up once, after its last step or its Stop.
			livePlan ||
			// A card typed past is answered a moment before the typed message goes.
			skippingCard() ||
			ended?.role !== 'assistant' ||
			// A reload cut the run off, so nothing ended to wrap up or follow.
			interruptedIn(live.messages) ||
			ended.id in picks ||
			colorsOpen(ended)
		) {
			return;
		}
		// Opening the agent brings up its own nudge from the list, once the page is known.
		if (restored(ended)) {
			showNudge(ended.id, null);
			return;
		}
		const asked = live.messages.findLast(({ role }) => role === 'user');
		const passed = asked?.metadata?.nudge;
		if (passed && !passed.taken && !judged.current.has(asked.id)) {
			judged.current.add(asked.id);
			(ended.metadata?.nudgeTaken ? markCalled : markInteracted)(passed.id);
		}
		const {
			workflow,
			traceId,
			nudges = [],
			tasks,
			followUps,
		} = ended.metadata ?? {};
		// A message on its way goes past this run's tasks and cards, though the run still counts.
		if (sending()) {
			if (workflow && (endedWell() || nudgesSent(ended))) countWorkflow();
			showNudge(ended.id, null);
			return;
		}
		const linedUp =
			endedWell() && linesUpTasks(ended) && lineUpTasks(ended.id, tasks);
		// Only the user's own first part starts unasked, unless a message they queued goes first.
		if (linedUp && tasks[0].start) {
			showNudge(ended.id, null);
			if (!useQueueStore.getState().text) sendTask();
			return;
		}
		// Not sent like tasks: the user may mean only the part just changed.
		if (endedWell() && offersFollowUps(ended)) lineUpTasks(ended.id, followUps);
		const menuTask =
			endedWell() &&
			menuLinkTask(renamedBy(ended), siteFrame()?.contentDocument);
		if (menuTask) lineUpTasks(ended.id, [menuTask]);
		// A task's line waits for a card that asks first, like the publish it was asked after.
		if (useTasksStore.getState().tasks.length && asksFirst(ended)) return;
		const sent = nudgesSent(ended);
		// A failed wrap-up still leaves the run's change, so its nudge shows.
		const well = endedWell() || Boolean(sent);
		const listed = ended.parts.some(
			(part) => getToolName(part) === 'what-can-i-do',
		);
		// A form holds every message for its workflow, which a nudge's request or tool would get past.
		const free = well && !formsStillOpen(live.messages).length;
		if (free && !sent) startCooldowns(nudges);
		const context = {
			history: readHistory(),
			changed: {
				...useChangedStore.getState(),
				// Saving the profile counts as reviewing its site description.
				about: (useProfileStore.getState().updatedAt ?? 0) * 1000,
			},
			facts: siteFacts(),
			// This run counts as a turn, though it's only counted once picked.
			workflows: finishedWorkflows() + 1,
			now: Date.now(),
		};
		const lined = useTasksStore.getState();
		const task = free && lined.tasks.length ? taskNudge(lined) : null;
		// One list from every source; the shop page only adds weight to the reply's own store nudge.
		const held = free && !sent ? takeHeld() : [];
		const available = !free
			? []
			: (sent ??
				rankNudges(
					[
						...weighed(nudges, WEIGHT.reply),
						...(task ? [{ nudge: task, weight: WEIGHT.task }] : []),
						...afterPhone(),
						...held,
						...onPage(page).map(({ nudge, weight }) => ({
							id: nudge.id,
							weight,
						})),
					],
					{
						suggestions: allSuggestions({
							page: pageForMenu(live.messages),
							post: lastMadePost(live.messages),
							recolored: recolored(live.messages, ended.id),
							store: storeGuideDue(),
							largeImage: held.some(({ nudge }) => nudge.id === 'large-image'),
						}),
						context,
					},
				));
		const replan = replanIn(ended);
		if (free && replan && sendReplan(ended, replan)) return;
		// The pick waits for the agent's closing line, which a queued task always gets.
		if (
			free &&
			(wrapsUp(ended) || (task && owesLine(ended))) &&
			sendWrapUp(ended, {
				offered: available,
				named: namedNudges(available),
			})
		) {
			return;
		}
		if (useQueueStore.getState().closingFirst) {
			useQueueStore.setState({ closingFirst: false });
			sendQueued();
		}
		if (well && workflow) countWorkflow();
		// Every tenth set of changes left unsaved asks to save, in place of the feedback ask.
		const asksToSave = free && askToSaveDue();
		const offered =
			agentOffer(ended) ??
			task ??
			(sent
				? chosenNudge(ended, sent)
				: (available.find(keepsToChatBox) ?? null));
		// The ask to save takes the place of a nudge's card.
		const nudge =
			asksToSave && offered?.inline ? null : withWritten(offered, ended);
		if (!asksToSave && free && traceId && feedbackDue()) {
			useFeedbackStore.setState({ ask: { at: ended.id, traceId } });
		}
		if (asksToSave) askToSave();
		if (nudge) markNudgeShown(nudge);
		const asksPick = well && asksToPick(ended);
		if (asksPick) pickAfterRun();
		if (asksPick && useShellStore.getState().phone) track('describe-asked');
		showNudge(ended.id, nudge, {
			at: 'end',
			placeholder: asksPick ? null : (nudge?.placeholder ?? null),
		});
		if (listed) setCommandsOpen(true);
	}, [
		liveWorking,
		liveCard,
		liveHold,
		answeringCard,
		livePlan,
		colorsDone,
		gutterOpen,
	]);
	const stopRunningPlan = () => {
		markPlanEnded(livePlan.toolCallId, 'canceled', livePlan.steps, livePlan);
		stopPlan();
		if (liveWorking) stopStep();
		box.current?.focus();
	};
	// Each edit goes once the reply before it ended, and only its own reply moves the plan on.
	useEffect(() => {
		// A step's card in the gutter holds the plan until it's answered.
		if (demo || !livePlan || liveWorking || liveCard || answeringCard) return;
		const { toolCallId, sent, later } = livePlan;
		// A message the user chose to send once the plan ends goes then, already in the chat.
		const ending = (how) => {
			// One the user chose to send after the plan takes the closing line's turn.
			if (later) useQueueStore.setState({ text: later, again: true });
			else if (useQueueStore.getState().text) {
				useQueueStore.setState({ closingFirst: true });
			}
			markPlanEnded(toolCallId, how, livePlan.steps, livePlan);
			({ completed: completePlan, canceled: stopPlan, undone: endPlanUndone })[
				how
			]();
		};
		const stop = () => ending('canceled');
		const end = () => ending('undone');
		const gaveUp = () => {
			offerReport(live.messages);
			end();
		};
		if (sent?.during) {
			const at = live.messages.findLastIndex(
				({ role, metadata }) =>
					role === 'user' &&
					metadata?.duringPlan?.plan === toolCallId &&
					metadata.duringPlan.round === livePlan.typed,
			);
			if (at === -1) return;
			const reply = live.messages
				.slice(at + 1)
				.find(({ role }) => role === 'assistant');
			if (!reply || live.error) return end();
			const { planAsk, planChoice } = reply.metadata ?? {};
			if (planAsk && !planChoice) return;
			if (planChoice === 'undo') {
				coverWhile(() => undoTo(livePlan.startVersion)).finally(stop);
				return;
			}
			if (planChoice === 'finish') {
				return markLater(textOf(live.messages[at]));
			}
			// A change to the plan came back as a rewrite, which cleared sent, so this is a stop.
			return stop();
		}
		if (sent) {
			const at = live.messages.findLastIndex(({ role, metadata }) =>
				sent.edit
					? role === 'user' &&
						metadata?.planEdit?.plan === toolCallId &&
						metadata.planEdit.round === livePlan.backs
					: role === 'user' &&
						metadata?.planStep?.plan === toolCallId &&
						metadata.planStep.id === sent.step &&
						(metadata.planStep.part ?? null) === sent.part &&
						(metadata.planStep.send ?? null) === (sent.send ?? null),
			);
			if (at === -1) return;
			const reply = live.messages
				.slice(at + 1)
				.find(({ role }) => role === 'assistant');
			// A failed request leaves its step unanswered, and the steps after it lean on it.
			// A rewrite that landed already cleared sent, so one still waiting found none.
			if (!reply || live.error) return end();
			// Plan edit found no way on, like a rewrite asking again for what failed.
			if (sent.edit) {
				if (sent.added) return resumePlan();
				// Tried another way and found none, so only that step ends not done.
				const notDone = reply.metadata?.planEdit?.notDone;
				if (notDone) return markBackNotDone(notDone);
				return reply.metadata?.planEdit?.stopped ? gaveUp() : end();
			}
			const step = reply.metadata?.planStep ?? {};
			if (step.stopped) return gaveUp();
			if (step.skipped) return markSkipped();
			if (step.notDone) return markNotDone(step.notDone);
			if (step.kept) return markEdited({ already: step.already });
			remapParts(movesIn(reply));
			addCopies(copiesIn(reply), blockName);
			// A new block that isn't a copy has plan edit look again at the steps left.
			const replanFor = (added) => {
				const plan = usePlanStore.getState().plan;
				if (
					!added.length ||
					!plan?.steps.some(({ state }) => state === 'pending')
				) {
					return;
				}
				markSentBack({ added: true });
				sendPlanEdit({ plan, why: ADDED, added, round: plan.backs + 1 });
			};
			if (Array.isArray(step.done) && changedIn(reply)) {
				markMade(step.done);
				return replanFor(addsIn(reply));
			}
			if (!('back' in step)) {
				if (changedIn(reply)) {
					markEdited();
					return replanFor(addsIn(reply));
				}
				// A step that answered only in words, like a question, ends the plan there for the user to answer.
				return textOf(reply).trim() ? end() : markSkipped();
			}
			if (livePlan.backs - livePlan.adds >= MOST_BACKS) return gaveUp();
			markSentBack();
			sendPlanEdit({
				plan: livePlan,
				why: step.back,
				round: livePlan.backs + 1,
			});
			return;
		}
		const next = nextEdit(livePlan);
		// With no step left, a typed message goes after the plan's closing line instead.
		if (useQueueStore.getState().text && next) {
			markDuring();
			sendDuringPlan(livePlan, livePlan.typed + 1);
			return;
		}
		if (!next?.step.prompt) return ending(endOf(livePlan, next));
		if (next.step.gone) {
			if (livePlan.backs - livePlan.adds >= MOST_BACKS) return gaveUp();
			markSentBack();
			sendPlanEdit({
				plan: livePlan,
				why: GONE,
				round: livePlan.backs + 1,
			});
			return;
		}
		const batch = batchOf(livePlan);
		const last =
			(batch.length > 1 && batch.at(-1).id === livePlan.steps.at(-1).id) ||
			(next.step === livePlan.steps.at(-1) &&
				next.step.done + 1 >= editsOf(next.step));
		markSent({ step: next.step.id, part: next.part });
		sendPlanStep({
			plan: toolCallId,
			step: next.step,
			part: next.part,
			send: usePlanStore.getState().plan?.sent?.send,
			last,
			batch,
			around: idOf(livePlan, livePlan.part),
			...(next.step.move && {
				move: {
					...next.step.move,
					next: idOf(livePlan, next.step.move.next),
				},
			}),
			...(next.step.wrap && { wrap: wrapOf(livePlan, next.step) }),
			...(next.step.order && { order: orderOf(livePlan, next.step) }),
			...(next.step.adds && { adds: true }),
			...(next.step.items && { items: true }),
			...(next.step.copies && { copies: true }),
			...(next.step.form && { form: next.step.form }),
			...(next.step.fix && { fix: next.step.fix }),
			...(next.step.piece && { piece: true }),
			...(next.step.stack && { stack: true }),
			...(next.step.styleFrom && { styleFrom: next.step.styleFrom }),
			...(next.step.styleOnly && { styleOnly: next.step.styleOnly }),
		});
		// A fast reply can start and end between renders, so the new messages wake it too.
	}, [livePlan, liveWorking, liveCard, answeringCard, live.messages.length]);
	// The queued message leaves, and focus would fall to the page.
	const thenFocusBox = (action) => () => {
		action();
		box.current?.focus();
	};
	const { question, options } =
		(!working && last?.role === 'assistant' && last.metadata) || {};
	// A demo's plugin may not be on this site, and only the site's abilities count as cards.
	const pending = !working && (demo?.card ?? pendingCard(messages));
	// A form shows from the forms store, which keeps it open past a sent message.
	const pendingForm = pending && formOf(pending);
	const card = !pendingForm && pending;
	const liveForms = useFormsStore((state) => state.forms);
	const liveGutterCard = useGutterStore((state) => state.card);
	// A demo state shows only its own, not what the live chat left open.
	const forms = demo
		? (demo.forms ?? (pendingForm ? [pendingForm] : []))
		: liveForms;
	const gutterCard = demo ? (demo.gutter ?? null) : liveGutterCard;
	const cardView = card && CARDS[getToolName(card)]?.(card);
	const Gutter = card && gutterOf(getToolName(card));
	const asksInChat =
		Boolean(card) &&
		((Boolean(cardView) && !cardView.single) ||
			ASKS_IN_CHAT.includes(getToolName(card)));
	// A gutter tool marks itself dirty while a message sent would cut it off, like mid-upload.
	const [dirty, setDirty] = useState(false);
	const [replyTyping, setReplyTyping] = useState(false);
	const [tooLong, setTooLong] = useState(false);
	// Closed, a choice stays gone until the next reply brings its own.
	const [closedChoice, setClosedChoice] = useState(null);
	// An option names one of these; one this build doesn't know is left out.
	const actions = {
		'start-workflow': ({ workflow }) =>
			regenerate({ messageId: last.id, body: { workflow } }),
		'add-to-chat': ({ message }) => sendText(message),
	};
	const offered =
		closedChoice === last?.id
			? null
			: options?.filter(({ action }) => actions[action]);
	// The forms wait under a card that needs an answer, so one thing asks at a time.
	const covered = Boolean(
		cardView?.single || (Gutter && !asksInChat) || gutterCard,
	);
	const picked =
		(demo ? demo.nudges : !working && nudged && picks[nudged.id]) || {};
	// Not while a card waits, or Tab would skip the card for a new request.
	const waiting =
		covered || asksInChat || Boolean(offered?.length) || Boolean(pendingForm);
	// A nudge after a reply still typing out would show before the words it follows.
	const nudgesWait = waiting || replyTyping;
	// An empty chat opens on the welcome-back guide, its first request waiting for Tab.
	const welcome =
		messages.length || working
			? null
			: demo
				? (demo.welcome ?? null)
				: welcomeBackItems(page);
	const suggested = nudgesWait
		? null
		: (picked.placeholder ?? welcome?.[0] ?? null);
	const gutterNudge = nudgesWait ? null : picked.gutter;
	// Asked only while nothing newer was sent, and in place of the ask for a rating.
	// Asked only while nothing newer was sent, in the error card's place and instead of the ask for a rating.
	const reportView = demo
		? (demo.report ?? null)
		: working
			? null
			: reportNote
				? 'note'
				: !nudgesWait &&
						reportAfter !== null &&
						reportAfter === lastAsked(messages)
					? 'ask'
					: null;
	const ask = demo
		? (demo.rating ?? null)
		: !working && liveAsk?.at === nudged?.id
			? liveAsk
			: null;
	// The rating waits while any card is above the chat box, like a confirm to delete.
	const cardAbove = Boolean(gutterNudge || covered || error || cut || notice);
	const feedback = nudgesWait || reportView || cardAbove ? null : ask;
	const askedFor = useRef(null);
	useEffect(() => {
		if (demo || !feedback || askedFor.current === feedback.traceId) return;
		askedFor.current = feedback.traceId;
		markFeedbackShown();
	}, [feedback?.traceId]);
	// A sheet or form the plugin draws opens with nothing sent.
	const request = ({ text, details }, nudge) => {
		if (details.fill) {
			return fillChatBox(`${text} `, { workflow: details.workflow });
		}
		if (details.task) return sendTask(nudge);
		if (details.sheet === 'commands') return setCommandsOpen(true);
		if (details.form) return showForm(details.form);
		if (details.storeGuide) {
			markCalled(STORE_NUDGE);
			return startStoreGuide(text, nudge);
		}
		return submit(text, {
			workflow: details.workflow,
			context: details.context,
			nudge,
		});
	};
	// Mid-run the card would cut the run off, so the request queues for its workflow instead.
	const takeSuggestion = (text, details, nudge, about) => {
		if (details.tool && !useRunStore.getState().working) {
			return showCard(text, {
				...details,
				runs: nudge?.runs ?? details.runs,
				nudge: about,
			});
		}
		return request({ text, details }, about);
	};
	const shownNudgeCard = () => {
		const pick = nudged && picks[nudged.id];
		const card = pick?.inline;
		const live =
			Boolean(card) &&
			!card.answered &&
			!(needsLine(card, pick.nudge) && !endsInWords(nudged));
		return live ? card : gutterNudge;
	};
	// Typed past, a card closes and the words go alone, saying which card the agent may read them against.
	const typePast = () => {
		const card = shownNudgeCard();
		if (!card) return undefined;
		const pick = picks[nudged.id];
		dismissInline(nudged.id, ['gutter']);
		return aboutNudge(pick.nudge?.id ?? card.id, card, clickSends(card), {
			taken: false,
		});
	};
	const sendFromBox = (text) => {
		if (offered?.length) {
			setClosedChoice(last.id);
			return answerChoice(text, { question, options: offered });
		}
		if (text.trim() !== suggested?.text) {
			const nudge = typePast();
			return submit(text, { ...routeOfFilled(text), ...(nudge && { nudge }) });
		}
		const id = picked.nudge?.id ?? suggested.id;
		markCalled(id);
		return takeSuggestion(
			suggested.text,
			suggested.details,
			picked.nudge,
			aboutNudge(id, shownNudgeCard() ?? suggested, suggested.text, {
				workflow: suggested.details.workflow,
			}),
		);
	};
	// The card's request goes as the user's, run here when the plugin can, else to the agent.
	const runAction = (pick, suggestion, messageId) => {
		const id = pick?.nudge?.id ?? suggestion.id;
		markCalled(id);
		clearParts(messageId, 'inline', 'placeholder');
		if (suggestion.details.url) {
			window.open(suggestion.details.url, '_blank', 'noopener');
			return;
		}
		const about = aboutNudge(id, suggestion, suggestion.text);
		if (suggestion.details.tool && !useRunStore.getState().working) {
			return showCard(suggestion.text, {
				...suggestion.details,
				...(suggestion.id === ADJUST_COLORS && {
					input: colorTargetsOf(live.messages, messageId),
				}),
				runs: pick?.nudge?.runs,
				nudge: about,
			});
		}
		request(suggestion, about);
		box.current?.focus();
	};
	const actOn = (nudge, messageId = nudged.id) => {
		markCalled(nudge.id);
		clearParts(messageId, nudge.slot);
		if (nudge.type !== 'request' && nudge.type !== 'task') return;
		const id = picks[messageId]?.nudge?.id ?? nudge.id;
		request(nudge, aboutNudge(id, nudge, nudge.text));
		box.current?.focus();
	};
	// Either answer counts as reviewing it, so its next cooldown starts.
	const keepRefresh = (nudge, _suggestion, messageId) => {
		markInteracted(nudge.id);
		restartCooldown(nudge);
		markAnswered(messageId);
		box.current?.focus();
	};
	const updateRefresh = (nudge, suggestion, messageId) => {
		markCalled(nudge.id);
		const profile = PROFILE_REFRESHES.includes(nudge.id);
		restartCooldown(nudge, {
			alongWith: profile
				? PROFILE_REFRESHES.filter((id) => id !== nudge.id)
				: [],
		});
		if (profile) answerInline(PROFILE_REFRESHES);
		else markAnswered(messageId);
		const text = suggestion.details.request;
		request(
			{ text, details: suggestion.details },
			aboutNudge(nudge.id, suggestion, text),
		);
		box.current?.focus();
	};
	// A stray click on the X would lose everything typed in the form.
	const askClose = (form) => {
		const close = () => closeForm(form).then(() => box.current?.focus());
		if (!Object.keys(form.edits).length) return close();
		useGutterStore.setState({
			card: {
				...discarding(form.title),
				onPress: () => {
					closeGutter();
					close();
				},
				onDismiss: () => {
					closeGutter();
					restoreForm(form.id);
				},
			},
		});
	};
	// Turned down, a card tells the agent nothing; its request stays in the chat box.
	const dismissNudge = (nudge, messageId = nudged.id) => {
		markInteracted(nudge.id);
		dismissInline(messageId);
		box.current?.focus();
	};
	// Taking the card above the chat box takes the same request out of the chat box too.
	const takeGutter = (suggestion) => {
		const id = picked.nudge?.id ?? suggestion.id;
		markCalled(id);
		clearParts(nudged.id, 'gutter', 'placeholder');
		if (suggestion.details.url) {
			window.open(suggestion.details.url, '_blank', 'noopener');
			return;
		}
		takeSuggestion(
			suggestion.text,
			suggestion.details,
			picked.nudge,
			aboutNudge(id, suggestion, suggestion.text),
		);
		box.current?.focus();
	};
	const dismissGutter = (suggestion) => {
		markInteracted(picked.nudge?.id ?? suggestion.id);
		clearParts(nudged.id, 'gutter');
		box.current?.focus();
	};
	const dismissAction = (pick, messageId) =>
		dismissNudge({ id: pick.nudge?.id ?? pick.inline.id }, messageId);
	// The tasks after it go too, since the user turned the next one down.
	const skipTask = (task, messageId) => {
		clearTasks();
		dismissNudge(task, messageId);
	};
	const dismissProactive = (messageId, data) => {
		markInteracted(data.id);
		answerProactive(messageId);
		box.current?.focus();
	};
	const actOnProactive = (messageId, data) => {
		markCalled(data.id);
		answerProactive(messageId);
		const install = proactiveInstall(data);
		if (!install) return;
		takeSuggestion(install.text, install.details);
		box.current?.focus();
	};
	const skipSetup = (nudge, _suggestion, messageId) =>
		dismissNudge(nudge, messageId);
	// The item's own workflow takes it, never the Site Guide.
	const addSetup = (nudge, suggestion, messageId) => {
		markCalled(nudge.id);
		markAnswered(messageId);
		// Its button is a link out, which opens on its own.
		if (suggestion.details.url) return;
		const text = clickSends(suggestion);
		takeSuggestion(
			text,
			suggestion.details,
			nudge,
			aboutNudge(nudge.id, suggestion, text),
		);
		box.current?.focus();
	};
	const inlineFor = (message) => {
		const proactive = message.parts.find(
			({ type }) => type === 'data-proactive',
		);
		if (proactive) {
			return (
				<ProactiveCard
					key={message.id}
					data={proactive.data}
					// Only the newest message's card can be answered, so an older one keeps its words alone.
					answered={
						Boolean(proactive.data?.answered) || message.id !== last?.id
					}
					onDismiss={() =>
						!demo && dismissProactive(message.id, proactive.data)
					}
					onAct={() => !demo && actOnProactive(message.id, proactive.data)}
				/>
			);
		}
		const pick = demo
			? message.id === last?.id
				? demo.nudges
				: null
			: picks[message.id];
		const suggestion = pick?.inline ?? pick?.asked;
		// A card goes once acted on, so none is left behind without its buttons.
		if (!suggestion || suggestion.answered) return null;
		// Without the agent's line, nothing says why the card is offered.
		if (needsLine(suggestion, pick.nudge) && !endsInWords(message)) return null;
		// Turned down, typed past, or left on another page, a card stays as its asked line.
		if (!pick.inline || message.id !== nudged?.id) {
			return (
				<AskedLine key={`asked-${message.id}`} text={askedLine(suggestion)} />
			);
		}
		if (suggestion?.type === 'refresh' || suggestion?.type === 'setup') {
			const nudge = pick.nudge ?? { id: suggestion.id };
			const [dismiss, act] =
				suggestion.type === 'setup'
					? [skipSetup, addSetup]
					: [keepRefresh, updateRefresh];
			return (
				<RefreshCard
					key={suggestion.id}
					suggestion={suggestion}
					onDismiss={() => !demo && dismiss(nudge, suggestion, message.id)}
					onAct={() => !demo && act(nudge, suggestion, message.id)}
				/>
			);
		}
		if (suggestion?.type === 'action') {
			return (
				<ActionCard
					key={suggestion.id}
					suggestion={suggestion}
					onAct={() => !demo && runAction(pick, suggestion, message.id)}
					onDismiss={() => !demo && dismissAction(pick, message.id)}
				/>
			);
		}
		if (suggestion?.type === 'task') {
			// A publish card answers its own call, so the run ends before the user publishes.
			if (gutterCard) return null;
			return (
				<TaskCard
					key={suggestion.id}
					task={suggestion}
					onAct={() => !demo && actOn(suggestion, message.id)}
					onDismiss={() =>
						!demo &&
						// Only a lined-up task takes the queue with it; the agent's own card goes alone.
						(suggestion.details?.task ? skipTask : dismissNudge)(
							suggestion,
							message.id,
						)
					}
				/>
			);
		}
		if (suggestion?.type !== 'link') return null;
		return (
			<Nudge
				key={suggestion.id}
				nudge={suggestion}
				onAct={() => !demo && actOn(suggestion, message.id)}
				onDismiss={() => !demo && dismissNudge(suggestion, message.id)}
			/>
		);
	};
	const dismissReport = () => {
		dropReport();
		box.current?.focus();
	};
	// The chat goes at once, and what the user writes after joins the same report.
	const reportIssue = () => {
		reportSent.current = sendReport();
		openNote();
	};
	const sendReportNote = (comment) => {
		sendReportComment(reportSent.current, comment);
		flushSync(dropReport);
		box.current?.focus();
	};
	const dismissFeedback = () => {
		markFeedbackAnswered();
		useFeedbackStore.setState({ ask: null });
		box.current?.focus();
	};
	const rate = (rating) => {
		markFeedbackAnswered();
		sendFeedback({ traceId: feedback.traceId, rating });
		useFeedbackStore.setState({ ask: { ...feedback, rated: true, rating } });
	};
	// The chat box is disabled until the sheet's gone.
	// The comment's post rewrites the rating's score, so it carries the rating again.
	const sendComment = (comment) => {
		sendFeedback({
			traceId: feedback.traceId,
			rating: feedback.rating,
			comment,
		});
		flushSync(() => {
			setFeedbackOpen(false);
			useFeedbackStore.setState({ ask: null });
		});
		box.current?.focus();
	};
	// The bar for unsaved changes and anything in the gutter take turns: one leaves before the other shows.
	// A gutter nudge shows with the bar rather than in its place, so Save never goes.
	const inGutter = Boolean(
		error ||
			reportView ||
			cut ||
			cardView?.single ||
			(Gutter && !asksInChat) ||
			gutterCard ||
			notice,
	);
	const [barOnScreen, setBarOnScreen] = useState(false);
	const [gutterOnScreen, setGutterOnScreen] = useState(false);
	const held = stuck || applied;
	// The canvas bar holds undo, redo and save, so this one shows only what that bar can't.
	const showBar =
		((!canvasBar && (unsaved || staged)) ||
			demo?.unsaved ||
			demo?.changes ||
			held) &&
		(held || (!inGutter && !gutterOnScreen));
	const showGutter = inGutter && (held || !barOnScreen);
	useLayoutEffect(() => {
		if (showBar) setBarOnScreen(true);
	}, [showBar]);
	useLayoutEffect(() => {
		if (showGutter) setGutterOnScreen(true);
	}, [showGutter]);
	const boxDisabled =
		(demo ? Boolean(update || pluginUpdate) : locked) ||
		dirty ||
		showChanges ||
		showCommands ||
		showFeedback;
	const siteInert = useShellStore((state) => Boolean(state.canvasTool));
	const picker = useBlockPicker({
		off: Boolean(demo) || liveWorking || siteInert || boxDisabled,
		onPicked: () => {
			box.current?.focus();
			if (!useSelectionStore.getState().asked) return;
			// Sent at once, so the part flies onto the picked icon of this message.
			submit(
				// translators: Sent for the user in the AI Agent's chat once they click a part of the website the agent asked them to pick.
				__("I've selected the block", 'extendify-local'),
			);
		},
	});
	// A chip removed under the pointer gets no pointerleave, so its outline would stay on the page.
	useEffect(() => hidePart, [picker.selected?.id]);
	// Sheets, menus and a recalled message claim Escape first by preventing its default.
	const escapeKeys = (event) => {
		if (
			event.key !== 'Escape' ||
			event.defaultPrevented ||
			event.nativeEvent.isComposing
		) {
			return;
		}
		if (event.target !== box.current) {
			event.preventDefault();
			box.current?.focus();
			return;
		}
		// Select mode takes this Escape to end itself.
		if (picker.selecting) return;
		if (enterSite()) event.preventDefault();
	};

	const chatChoices = (
		<>
			{offered?.length > 0 && (
				<SimpleMultipleChoice
					question={question}
					options={offered}
					onChoose={(option) => actions[option.action](option)}
					onTyped={(text) => {
						if (demo) return;
						setClosedChoice(last.id);
						answerChoice(text, { question, options: offered });
					}}
					onClose={() => {
						if (demo) return;
						setClosedChoice(last.id);
						box.current?.focus();
					}}
					demo={Boolean(demo)}
				/>
			)}
		</>
	);
	const chatCard = (
		<>
			{asksInChat && cardView && !cardView.single && (
				<QuestionCard
					key={card.toolCallId}
					{...cardView}
					chat={root}
					demo={Boolean(demo)}
					// The card leaves once answered, and focus would fall to the page.
					onAnswer={(value) =>
						answerCard(card, () => cardView.answer(value)).then(() =>
							box.current?.focus(),
						)
					}
					onClose={() =>
						demo
							? null
							: answerCard(card, async () => ({
									skipped: true,
								})).then(() => box.current?.focus())
					}
				/>
			)}
			{Gutter && asksInChat && (
				<Gutter
					// Demo states share one call, and each needs a fresh component.
					key={`${card.toolCallId}-${demo?.label ?? ''}`}
					part={card}
					floating={floating}
					plan={plan}
					formTitle={formsOfCard(card.toolCallId).at(-1)?.title}
					onDirty={setDirty}
					chat={root}
					// The drop zone leaves once its image is saved, and focus would fall to the page.
					onAnswer={(save) =>
						demo
							? Promise.resolve()
							: answerCard(card, save)
									// The chat box takes focus only once it's enabled again.
									.then(() => flushSync(() => setDirty(false)))
									.then(() => box.current?.focus())
					}
					// Closed with nothing chosen, it counts as skipped, and no reply is asked for.
					onClose={() =>
						demo
							? null
							: answerCard(card, async () => ({
									skipped: true,
								})).then(() => box.current?.focus())
					}
					onTyped={(text) => (demo ? null : answerTyped(card, text))}
				/>
			)}
		</>
	);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Escape bubbles up from the chat's own controls; this takes no focus.
		<div
			ref={root}
			onKeyDown={escapeKeys}
			onClickCapture={demo ? blockClicks : undefined}
			// wp-admin's floating window is short, so its parts sit closer.
			className={`flex h-full min-h-0 flex-col ${compact ? 'gap-2' : 'gap-3'}`}
		>
			{/* A sheet over the chat covers the conversation and the gutter, which stays mounted under it. */}
			<div className="relative flex min-h-0 flex-1 flex-col">
				{/* The log hangs 12px past this on its scrollbar side, which scrolls the whole chat sideways. */}
				<div className="relative flex min-h-0 flex-1 flex-col overflow-x-clip">
					{welcome && (
						<WelcomeBack
							back={demo ? true : Boolean(window.extAgentXData?.welcomeBack)}
							items={welcome}
							onPick={(item) => {
								request(item);
								box.current?.focus();
							}}
						/>
					)}
					<Messages
						key={`log-${demo?.label}`}
						messages={forLog(messages, endedShown ? ended.id : null)}
						working={working}
						failed={Boolean(error)}
						status={demo?.statusText}
						demo={Boolean(demo)}
						floating={floating}
						chat={root}
						inlineFor={inlineFor}
						onOutput={demo ? undefined : markOutput}
						onAnswer={demo ? undefined : finishCall}
						waitingCard={
							asksInChat ? { id: card.toolCallId, element: chatCard } : null
						}
						choices={offered?.length > 0 ? chatChoices : null}
						onTyping={setReplyTyping}
						planCard={Boolean(plan) || endedShown || planningShown}
						footer={
							(planShown || planningShown || endedShown || queue.text) && (
								<>
									{endedShown && (
										<PlanPanel
											title={ended.title}
											steps={
												working
													? [...ended.steps, confirmingStep()]
													: ended.steps
											}
										/>
									)}
									{planningShown && (
										<PlanPanel
											title={livePlanning.title}
											steps={draftSteps(livePlanning.steps)}
											doing={livePlanning.doing}
										/>
									)}
									{planShown && (
										<PlanPanel
											title={plan.title}
											steps={plan.steps}
											adjusting={adjusting}
											onStop={() => !demo && stopRunningPlan()}
										/>
									)}
									{queue.text && (
										<QueuedMessage
											text={queue.text}
											// Sending it would skip a gutter tool that's mid-pick.
											disabled={dirty}
											onSend={thenFocusBox(sendNow)}
											onDelete={deleteQueued}
											onLeave={() => box.current?.focus()}
										/>
									)}
								</>
							)
						}
					/>
					{/* Floats over the conversation's bottom, so a card showing, resizing or leaving never moves it. */}
					<div
						ref={floating}
						className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3"
					>
						{tooLong && <TooLong />}
						{/* Hidden, not removed, so a card comes back as it was, typing and all. */}
						<div className={tooLong ? 'hidden' : 'contents'}>
							<AnimatePresence
								initial={false}
								onExitComplete={() => setBarOnScreen(false)}
							>
								{showBar && (
									<DraftBar
										key="draft"
										ref={opener}
										clashes={clashes}
										failed={demo?.failed}
										applied={demo?.applied}
										confirm={demo?.confirm}
										presence={presence}
										open={showChanges}
										onOpen={() => setChangesOpen(true)}
										onDone={() => box.current?.focus()}
									/>
								)}
							</AnimatePresence>
							<AnimatePresence>
								{['link', 'request'].includes(gutterNudge?.type) && (
									<GutterItem
										key={gutterNudge.id}
										onLeave={() => box.current?.focus()}
									>
										<Nudge
											nudge={gutterNudge}
											onAct={() => !demo && actOn(gutterNudge)}
											onDismiss={() => !demo && dismissGutter(gutterNudge)}
										/>
									</GutterItem>
								)}
								{gutterNudge?.type === 'action' && (
									<GutterItem
										key={gutterNudge.id}
										onLeave={() => box.current?.focus()}
									>
										<ActionCard
											suggestion={gutterNudge}
											onAct={() => !demo && takeGutter(gutterNudge)}
											onDismiss={() => !demo && dismissGutter(gutterNudge)}
										/>
									</GutterItem>
								)}
							</AnimatePresence>
							<AnimatePresence>
								{feedback && (
									<GutterItem
										key="feedback"
										onLeave={() => box.current?.focus()}
									>
										<Feedback
											rated={feedback.rated}
											openerRef={feedbackOpener}
											onRate={(rating) => !demo && rate(rating)}
											onOpen={() => !demo && setFeedbackOpen(true)}
											onDismiss={() => !demo && dismissFeedback()}
										/>
									</GutterItem>
								)}
							</AnimatePresence>
							<AnimatePresence
								initial={false}
								onExitComplete={() => setGutterOnScreen(false)}
							>
								{showGutter && (
									<GutterItem key="gutter" onLeave={() => box.current?.focus()}>
										{notice && (
											<ChangedElsewhere
												onDismiss={() => {
													useDraftStore.getState().dismiss();
													box.current?.focus();
												}}
												demo={Boolean(demo)}
											/>
										)}
										{cut && (
											<OneButtonCard
												text={
													cut.plan
														? // translators: Shown in the AI Agent's chat when it opens after the page was reloaded or closed while the agent was partway through a plan of several changes.
															__('Plan interrupted.', 'extendify-local')
														: // translators: Shown in the AI Agent's chat when it opens after the page was reloaded or closed before the agent finished replying to the user's last message.
															__('Reply interrupted.', 'extendify-local')
												}
												button={
													// translators: Button under the AI Agent's note that its work was interrupted: it undoes what the interrupted work changed and sends the user's last message again.
													__('Try again', 'extendify-local')
												}
												onPress={() => {
													setUndoing(true);
													tryAgain().finally(() => setUndoing(false));
												}}
												dismiss={
													// translators: Button under the AI Agent's note that its work was interrupted: it takes the note away and keeps whatever the interrupted work changed.
													__('Dismiss', 'extendify-local')
												}
												onDismiss={dropInterrupted}
												busy={undoing}
												demo={Boolean(demo)}
											/>
										)}
										{reportView === 'ask' && (
											<OneButtonCard
												// translators: Screen reader name for the card in the AI Agent's chat that offers to send the conversation for review after something went wrong.
												label={__('Report an issue', 'extendify-local')}
												text={
													// translators: Shown on a card in the AI Agent's chat after a reply failed or the agent stopped partway, asking whether the user wants to report it.
													__(
														'Did something unexpected happen?',
														'extendify-local',
													)
												}
												button={
													// translators: Button on the AI Agent's card that sends this conversation for review, so what went wrong can be looked into.
													__('Report issue', 'extendify-local')
												}
												onPress={() => !demo && reportIssue()}
												onClose={() => !demo && dismissReport()}
												demo={Boolean(demo)}
											/>
										)}
										{reportView === 'note' && (
											<ReportNote
												demo={Boolean(demo)}
												onSend={(comment) => !demo && sendReportNote(comment)}
												onClose={() => !demo && dismissReport()}
											/>
										)}
										{error && !reportView && (
											<ChatError
												error={error}
												offline={
													demo ? Boolean(demo.offline) : !navigator.onLine
												}
												onRetry={() => {
													dropReport();
													retry();
												}}
												demo={Boolean(demo)}
											/>
										)}
										{cardView?.single && (
											<OneButtonCard
												key={card.toolCallId}
												{...cardView.single}
												demo={Boolean(demo)}
												onPress={() =>
													demo
														? null
														: answerCard(card, () =>
																cardView.answer(cardView.single.option),
															).then(() => box.current?.focus())
												}
												onDismiss={() =>
													demo
														? null
														: answerCard(card, async () => ({
																skipped: true,
															})).then(() => box.current?.focus())
												}
											/>
										)}
										{Gutter && !asksInChat && (
											<Gutter
												// Demo states share one call, and each needs a fresh component.
												key={`${card.toolCallId}-${demo?.label ?? ''}`}
												part={card}
												floating={floating}
												plan={plan}
												formTitle={formsOfCard(card.toolCallId).at(-1)?.title}
												onDirty={setDirty}
												chat={root}
												// The drop zone leaves once its image is saved, and focus would fall to the page.
												onAnswer={(save) =>
													demo
														? Promise.resolve()
														: answerCard(card, save)
																// The chat box takes focus only once it's enabled again.
																.then(() => flushSync(() => setDirty(false)))
																.then(() => box.current?.focus())
												}
												// Closed with nothing chosen, it counts as skipped, and no reply is asked for.
												onClose={() =>
													demo
														? null
														: answerCard(card, async () => ({
																skipped: true,
															})).then(() => box.current?.focus())
												}
												onTyped={(text) =>
													demo ? null : answerTyped(card, text)
												}
											/>
										)}
										{gutterCard && (
											<OneButtonCard
												// A retry after a confirm is a new card, so it takes focus again.
												key={gutterCard.text}
												{...gutterCard}
												demo={Boolean(demo)}
												onPress={() => !demo && gutterCard.onPress()}
												onDismiss={
													gutterCard.onDismiss &&
													(() => !demo && gutterCard.onDismiss())
												}
											/>
										)}
									</GutterItem>
								)}
							</AnimatePresence>
							{/* Outside the gutter's turns with the unsaved changes bar, since a form can stay open for a while. */}
							{forms.length > 0 && (
								<div
									hidden={covered || asksInChat}
									data-agentx-pushes={!(covered || asksInChat) || undefined}
									className="flex flex-col gap-3"
								>
									{forms.map((form) => (
										<FormCard
											key={form.id}
											title={form.title}
											fields={form.fields}
											submitLabel={form.submitLabel}
											edits={form.edits}
											minimized={form.minimized}
											chat={root}
											floating={floating}
											demo={Boolean(demo)}
											onEdit={(name, value) =>
												!demo && editForm(form.id, name, value)
											}
											onMinimize={() => !demo && minimizeForm(form.id)}
											onRestore={() => !demo && restoreForm(form.id)}
											// The form leaves once sent or closed, and focus would fall to the page.
											onAnswer={(values) =>
												demo
													? Promise.resolve()
													: sendForm(form, values).then(() =>
															box.current?.focus(),
														)
											}
											onClose={() => !demo && askClose(form)}
										/>
									))}
								</div>
							)}
							{canvasBar && <DraftNotices />}
						</div>
					</div>
					<AnimatePresence>
						{showChanges && (
							<ChangesSheet
								key="changes"
								changes={demo?.changes}
								// The chat box is disabled until the sheet's gone, and the bar may have left meanwhile.
								onClose={() => {
									flushSync(() => setChangesOpen(false));
									const { changesFrom } = useShellStore.getState();
									(changesFrom?.isConnected
										? changesFrom
										: (opener.current ?? box.current)
									)?.focus();
								}}
							/>
						)}
					</AnimatePresence>
					<AnimatePresence>
						{guideSheet && !demo && (
							<GuideImageSheet
								key={`guide-${guideSheet.which}`}
								chat={root}
								anchor={floating}
							/>
						)}
					</AnimatePresence>
				</div>
				<AnimatePresence>
					{showFeedback && (
						<FeedbackSheet
							key="feedback"
							demo={Boolean(demo?.feedback)}
							onSend={(comment) => !demo && sendComment(comment)}
							onClose={() => {
								flushSync(() => setFeedbackOpen(false));
								(feedbackOpener.current ?? box.current)?.focus();
							}}
						/>
					)}
				</AnimatePresence>
				<AnimatePresence>
					{showCommands && (
						<CommandsSheet
							key="commands"
							demo={Boolean(demo?.commands)}
							filter={demo?.commands?.filter}
							onPick={(card) => {
								flushSync(() => setCommandsOpen(false));
								markCalled(card.id);
								request(card);
								box.current?.focus();
							}}
							onClose={() => {
								flushSync(() => setCommandsOpen(false));
								box.current?.focus();
							}}
						/>
					)}
				</AnimatePresence>
			</div>
			{/* The question card sits outside the log, so screen readers hear it here. */}
			<div aria-live="polite" className="sr-only">
				{covered || asksInChat
					? cardView?.question
					: forms.findLast(({ minimized }) => !minimized)?.title}
			</div>
			{/* The log reads out the queued message; this says why it waits. */}
			<div aria-live="polite" className="sr-only">
				{queue.text &&
					(working
						? // translators: Read out by screen readers when the user's message waits for the AI Agent to finish its work.
							__(
								'Message queued. It sends when the agent is done.',
								'extendify-local',
							)
						: // translators: Read out by screen readers when the user's queued message was kept because they stopped the AI Agent, its reply failed, or it asks them to pick something first.
							__('Message not sent yet.', 'extendify-local'))}
			</div>
			{update && <UpdateNotice {...update} />}
			{pluginUpdate && (
				<PluginUpdate update={pluginUpdate} url={pluginUpdateUrl} />
			)}
			<ChatBox
				key={demo?.label}
				draft={demo?.draft}
				disabled={boxDisabled}
				busy={working}
				queued={queue.text}
				history={sentTexts(live.messages)}
				returned={demo ? null : queue.returned}
				onTakenBack={takenBack}
				onSend={(text) => !demo && sendFromBox(text)}
				// The plan's card has its own Stop.
				onStop={planShown ? undefined : stopRun}
				suggestion={suggested?.text}
				onCommands={() => !demo && setCommandsOpen(true)}
				onTooLong={setTooLong}
				// Typing past the ask to report answers it.
				onType={(text) =>
					text.trim() && (reportAfter !== null || reportNote) && dropReport()
				}
				inputRef={box}
				selected={demo ? (demo.selected ?? null) : picker.selected}
				picking={!demo && picker.picking}
				landing={!demo && picker.landing}
				// A demo's clicks are blocked, so its Select only needs to look live.
				canPick={Boolean(demo) || picker.canPick}
				onSelect={picker.available ? picker.toggle : undefined}
				onClearSelected={() => {
					picker.clear();
					// The chip's X leaves, and focus would fall to the page.
					box.current?.focus();
				}}
				onShowSelected={() => picker.selected && showPart(picker.selected.id)}
				onHideSelected={hidePart}
				onFlashSelected={() => picker.selected && flashPart(picker.selected.id)}
				tools={canvasBar ? <ChatRail /> : undefined}
			/>
			<p className="m-0 text-center text-agentx-caption text-agentx-disclaimer-ink">
				{__(
					'AI Agent can make mistakes. Check changes before saving.',
					'extendify-local',
				)}
			</p>
		</div>
	);
};
