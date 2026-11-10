import { CARD_ICONS, PLUGIN_LOGOS } from '@agentx/chat/CardBadge';
import { startStoreGuide, submit } from '@agentx/chat/conversation';
import { PLANS } from '@agentx/chat/proactive';
import { CLOSE_BASE, GHOST_SMALL, PRESS } from '@agentx/chat/styles';
import { StorefrontIcon } from '@agentx/guide/icons';
import { shownStoreSteps, storeStepDone } from '@agentx/guide/store/StoreGuide';
import { designLogo } from '@agentx/lib/design-logos';
import { imagifyQuotaNote } from '@agentx/lib/imagify-quota';
import { markCalled, readCleared, setCleared } from '@agentx/lib/nudges';
import { outstandingNudges, storeNotified } from '@agentx/lib/outstanding';
import { postShown } from '@agentx/lib/presence';
import { track } from '@agentx/lib/track';
import { useRunStore } from '@agentx/state/run';
import { forgetMinimized, useShellStore } from '@agentx/state/shell';
import { useStoreGuideStore } from '@agentx/state/store-guide';
import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	bell,
	chevronDown,
	chevronUp,
	close,
	closeSmall,
	code,
	dashboard,
	drawerLeft,
	external,
	Icon,
	moreVertical,
	pencil,
} from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';

const { adminUrl = '' } = window.extSharedData ?? {};

const ITEM =
	'agentx-focus-inset flex w-full items-center gap-3 rounded-agentx-menu-item border-0 bg-transparent px-3 py-2 text-start text-agentx-menu-item text-agentx-menu-ink no-underline hover:bg-agentx-menu-hover focus-visible:bg-agentx-menu-hover';

// The address bar follows the site, so the page to close onto is read on click.
const closeAgent = () => {
	track('agent-closed');
	forgetMinimized();
	const url = new URL(window.location.href);
	url.searchParams.set('extendify-agent', 'close');
	window.location.assign(url);
};

export const AgentIcon = () => (
	<svg
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		aria-hidden="true"
	>
		<path
			d="M17.0909 9.81818L18 7.81818L20 6.90909L18 6L17.0909 4L16.1818 6L14.1818 6.90909L16.1818 7.81818L17.0909 9.81818Z"
			fill="currentColor"
		/>
		<path
			d="M17.0909 14.1818L16.1818 16.1818L14.1818 17.0909L16.1818 18L17.0909 20L18 18L20 17.0909L18 16.1818L17.0909 14.1818Z"
			fill="currentColor"
		/>
		<path
			d="M11.6364 10.1818L9.81818 6.18182L8 10.1818L4 12L8 13.8182L9.81818 17.8182L11.6364 13.8182L15.6364 12L11.6364 10.1818ZM10.5382 12.72L9.81818 14.3055L9.09818 12.72L7.51273 12L9.09818 11.28L9.81818 9.69455L10.5382 11.28L12.1236 12L10.5382 12.72Z"
			fill="currentColor"
		/>
	</svg>
);

export const AgentMark = () => {
	// translators: The AI Agent's name, shown as its logo over the chat.
	const name = __('AI Agent', 'extendify-local');
	const logo = designLogo('secondary');

	if (logo) {
		return (
			<img
				data-agentx-logo
				src={logo}
				alt={name}
				draggable={false}
				className="block h-agentx-logo max-w-agentx-logo-width shrink-0 object-contain"
			/>
		);
	}

	return (
		<span className="flex items-center gap-2 text-agentx-mark-ink">
			<AgentIcon />
			<span className="text-agentx-mark-title font-agentx-mark">{name}</span>
		</span>
	);
};

const TOGGLE = `agentx-focus inline-flex size-8 items-center justify-center rounded-agentx-header-button border-0 bg-agentx-header-button ${PRESS}`;

export const ChatToggle = () => {
	const { minimized, setMinimized } = useShellStore();

	if (!minimized) {
		return (
			<Tooltip
				// translators: Tooltip on the button that hides the AI Agent's chat so the website shows wider.
				text={__('Minimize the agent', 'extendify-local')}
			>
				<button
					type="button"
					aria-expanded="true"
					aria-controls="extendify-agentx-chat"
					onClick={() => setMinimized(true)}
					aria-label={
						// translators: Screen reader label for the button that hides the AI Agent's chat so the website shows wider.
						__('Minimize the agent', 'extendify-local')
					}
					className={`${TOGGLE} text-agentx-chat-toggle-ink hover:bg-agentx-chat-toggle-hover`}
				>
					<Icon icon={drawerLeft} size={24} className="fill-current" />
				</button>
			</Tooltip>
		);
	}

	return (
		<Tooltip
			// translators: Tooltip on the button that brings back the minimized AI Agent's chat.
			text={__('Open the agent', 'extendify-local')}
		>
			<button
				type="button"
				aria-expanded="false"
				aria-controls="extendify-agentx-chat"
				onClick={() => setMinimized(false)}
				aria-label={
					// translators: Screen reader label for the button that brings back the minimized AI Agent's chat.
					__('Open the agent', 'extendify-local')
				}
				className={`${TOGGLE} text-agentx-chat-toggle-ink hover:bg-agentx-chat-toggle-hover`}
			>
				<AgentIcon />
			</button>
		</Tooltip>
	);
};

// Internal and English only, like the dev tool they open.
const DEV_TOOL_VIEWS = [{ view: 'demo', label: 'Demo', icon: code }];

const editorUrl = () => {
	const post = postShown(document.getElementById('extendify-agentx-site'));
	return post
		? addQueryArgs(`${adminUrl}post.php`, { post, action: 'edit' })
		: '';
};

const NewTab = () => (
	<>
		<Icon
			icon={external}
			size={20}
			className="ms-auto shrink-0 fill-agentx-menu-icon"
		/>
		<span className="sr-only">
			{__('(opens in a new tab)', 'extendify-local')}
		</span>
	</>
);

// The button's own window, which the Designer's preview draws inside a frame.
const placeBy = (button) => {
	const view = button.ownerDocument.defaultView;
	const rect = button.getBoundingClientRect();
	const rtl = view.getComputedStyle(button).direction === 'rtl';
	return {
		...(rect.top > view.innerHeight / 2
			? { bottom: view.innerHeight - rect.top + 4 }
			: { top: rect.bottom + 4 }),
		insetInlineEnd: rtl ? rect.left : view.innerWidth - rect.right,
	};
};

// Under the bell, so the left edges meet.
const placeUnder = (button) => {
	const view = button.ownerDocument.defaultView;
	const rect = button.getBoundingClientRect();
	const rtl = view.getComputedStyle(button).direction === 'rtl';
	return {
		top: rect.bottom + 4,
		insetInlineStart: rtl ? view.innerWidth - rect.right : rect.left,
	};
};

const stepFocus = (event, menu) => {
	const all = [...(menu?.querySelectorAll('[role^="menuitem"]') ?? [])];
	const at = all.indexOf(document.activeElement);
	const to = {
		ArrowDown: (at + 1) % all.length,
		ArrowUp: (at - 1 + all.length) % all.length,
		Home: 0,
		End: all.length - 1,
	}[event.key];
	if (to === undefined || !all.length) return false;
	event.preventDefault();
	all[to].focus();
	return true;
};

const STORE_ITEM = 'store-guide';
const QUOTA_ITEM = 'imagify-quota';

const ImagifyLogo = ({ className }) => {
	const [failed, setFailed] = useState(false);
	if (failed) return <CARD_ICONS.image className={className} />;
	return (
		<img
			src={PLUGIN_LOGOS.imagify}
			alt=""
			onError={() => setFailed(true)}
			className={`${className} object-contain`}
		/>
	);
};

// The store guide, when WooCommerce is active and the user can manage it, and the setup still open after the site's first day.

export const NotificationBell = () => {
	const id = useId();
	const store = useStoreGuideStore();
	const working = useRunStore((state) => state.working);
	const [open, setOpen] = useState(false);
	const [place, setPlace] = useState({});
	const [cleared, setClearedIds] = useState(readCleared);
	const [showCleared, setShowCleared] = useState(false);
	const button = useRef(null);
	const menu = useRef(null);
	const fromDemo = useRef(false);
	const steps = store.available ? shownStoreSteps() : [];
	const done = steps.filter(({ id: step }) =>
		storeStepDone(store, step),
	).length;
	const demoBell = useShellStore((state) => state.chatDemo?.bell);
	// A count alone draws the badge without opening the menu, as a listed demo item would.
	const demoWaiting = useShellStore((state) =>
		state.chatDemo?.bell ? 0 : (state.chatDemo?.waiting ?? 0),
	);
	const quota = demoBell?.[QUOTA_ITEM] ?? imagifyQuotaNote();
	const isCleared = (item) => cleared[item] && !demoBell?.[item];
	const storeListed = storeNotified();
	const unread =
		demoWaiting +
		Number(storeListed && !isCleared(STORE_ITEM)) +
		Number(Boolean(quota) && !isCleared(QUOTA_ITEM)) +
		outstandingNudges().filter(({ id: nudge }) => !isCleared(nudge)).length;
	const shop =
		// translators: A request written as the user to the AI Agent, which a task under its bell puts in the chat, followed by the store setup guide.
		__('Help me set up my shop', 'extendify-local');
	const items = open
		? [
				...(quota
					? [
							{
								id: QUOTA_ITEM,
								Icon: ImagifyLogo,
								name: 'Imagify',
								title: 'Imagify',
								message: sprintf(
									// translators: %s is an amount of data, like 20MB. A task under the bell atop the AI Agent when the Imagify plugin has nearly used its free monthly allowance; opens Imagify's prices. Keep it short.
									__(
										"You've used %s of this month's free optimizing. Upgrade to keep going.",
										'extendify-local',
									),
									quota.used,
								),
								go: () => window.open(PLANS, '_blank', 'noopener,noreferrer'),
							},
						]
					: []),
				...outstandingNudges().map(({ id: nudge, details }) => {
					const message = details.bell?.message ?? details.request;
					return {
						id: nudge,
						Icon: CARD_ICONS[details.icon] ?? CARD_ICONS.text,
						name: details.label,
						title: details.label,
						message,
						go: () => {
							markCalled(nudge);
							submit(message, { workflow: details.workflow });
						},
					};
				}),
				...(storeListed
					? [
							{
								id: STORE_ITEM,
								Icon: StorefrontIcon,
								// translators: Names the WooCommerce store setup guide in the AI Agent's tasks, as in the title of its task.
								name: __('WooCommerce Setup', 'extendify-local'),
								title: sprintf(
									// translators: A task under the bell atop the AI Agent for its WooCommerce store setup guide. %1$d is how many of its steps are finished, %2$d how many it has. Keep it short.
									__(
										'WooCommerce Setup (%1$d of %2$d completed)',
										'extendify-local',
									),
									done,
									steps.length,
								),
								message: shop,
								go: () => startStoreGuide(shop),
							},
						]
					: []),
			]
		: [];
	const listed = items.filter((item) => !isCleared(item.id));
	const put = items.filter((item) => isCleared(item.id));

	const shut = ({ refocus } = {}) => {
		setOpen(false);
		setShowCleared(false);
		if (refocus) button.current?.focus();
	};

	const clear = (item, on) => {
		track(on ? 'notification-cleared' : 'notification-restored', {
			notification: item.id,
		});
		setCleared(item.id, on);
		setClearedIds(readCleared());
		// The pressed button's row is gone, so focus would drop out of the menu.
		requestAnimationFrame(() =>
			menu.current?.querySelector('[role="menuitem"]')?.focus(),
		);
	};

	// Opened from Demo, focus stays there so the arrow keys keep stepping through states.
	useEffect(() => {
		if (demoBell) {
			fromDemo.current = true;
			setPlace(placeUnder(button.current));
			setOpen(true);
		} else if (fromDemo.current) {
			fromDemo.current = false;
			shut();
		}
	}, [demoBell]);

	useEffect(() => {
		if (!open) return;
		if (!fromDemo.current) {
			menu.current?.querySelector('[role="menuitem"]')?.focus();
		}
		const away = (event) => {
			if (
				!menu.current?.contains(event.target) &&
				!button.current?.contains(event.target)
			) {
				shut();
			}
		};
		const blurred = () => shut();
		document.addEventListener('pointerdown', away);
		window.addEventListener('blur', blurred);
		return () => {
			document.removeEventListener('pointerdown', away);
			window.removeEventListener('blur', blurred);
		};
	}, [open]);

	return (
		<div>
			<Tooltip
				// translators: Tooltip on the bell button atop the AI Agent, which lists the tasks it has lined up for the user.
				text={__('Tasks', 'extendify-local')}
			>
				<button
					ref={button}
					type="button"
					aria-haspopup="menu"
					aria-expanded={open}
					aria-controls={open ? `${id}-menu` : undefined}
					aria-label={
						// translators: Screen reader label for the bell button atop the AI Agent, which lists the tasks it has lined up for the user.
						__('Tasks', 'extendify-local')
					}
					aria-describedby={unread ? `${id}-count` : undefined}
					onClick={() => {
						if (!open) {
							fromDemo.current = false;
							setPlace(placeUnder(button.current));
							track('bell-opened');
						}
						setOpen(!open);
					}}
					className={`agentx-focus inline-flex h-8 items-center ${unread > 0 ? 'gap-2.5' : 'gap-1'} rounded-agentx-header-button border-0 ps-1 pe-2.5 ${PRESS} ${unread > 0 ? 'bg-agentx-bell-waiting shadow-(--agentx-bell-waiting-shadow)' : 'bg-agentx-bell-rest'} text-agentx-bell-ink hover:bg-agentx-bell-hover aria-expanded:bg-agentx-header-active`}
				>
					<span className="relative flex size-6 shrink-0">
						<Icon icon={bell} size={24} className="fill-current" />
						{unread > 0 && (
							<span
								aria-hidden="true"
								className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-agentx-unread px-1 text-[10px] font-semibold leading-none text-agentx-unread-ink tabular-nums"
							>
								{unread > 9 ? '9+' : unread}
							</span>
						)}
					</span>
					<span className="whitespace-nowrap text-agentx-header-label">
						{
							// translators: The word beside the bell atop the AI Agent, which opens what it has lined up; its count shows on the bell. Keep it short.
							__('Tasks', 'extendify-local')
						}
					</span>
					{unread > 0 && (
						<>
							<span id={`${id}-count`} className="sr-only">
								{sprintf(
									// translators: %d is how many tasks wait under the bell atop the AI Agent. Read by screen readers with the bell button.
									_n('%d new task', '%d new tasks', unread, 'extendify-local'),
									unread,
								)}
							</span>
						</>
					)}
				</button>
			</Tooltip>
			{open && (
				<div
					ref={menu}
					id={`${id}-menu`}
					role="menu"
					// translators: Screen reader name for the menu of tasks under the AI Agent's bell.
					aria-label={__('Tasks', 'extendify-local')}
					onKeyDown={(event) => {
						if (stepFocus(event, menu.current)) return;
						// Placed once when it opened, so it can't follow the bell when it moves.
						if (event.key === 'Tab') {
							shut();
							return;
						}
						if (event.key !== 'Escape') return;
						event.preventDefault();
						shut({ refocus: true });
					}}
					style={place}
					className="fixed z-100000 flex w-80 flex-col rounded-agentx-menu border border-solid border-agentx-menu-border bg-agentx-menu p-1 shadow-(--agentx-menu-shadow)"
				>
					<p
						aria-hidden="true"
						className="m-0 px-3 pt-2 pb-1 text-agentx-caption font-agentx-button tracking-wide text-agentx-menu-muted uppercase"
					>
						{
							// translators: Heading atop the list of tasks under the AI Agent's bell.
							__('Tasks', 'extendify-local')
						}
					</p>
					{listed.map((item, at) => (
						<div
							key={item.id}
							role="none"
							className={`group relative py-1 ${at ? 'border-0 border-t border-solid border-agentx-menu-divider' : ''}`}
						>
							<button
								type="button"
								role="menuitem"
								disabled={working}
								onClick={() => {
									shut();
									track('notification-taken', { notification: item.id });
									// What an item starts lands in the chat, which a minimized agent doesn't show.
									useShellStore.getState().setMinimized(false);
									item.go();
								}}
								className={`agentx-focus-inset flex w-full items-start gap-3 rounded-agentx-menu-item border-0 bg-transparent py-2 ps-3 pe-3 text-start text-agentx-notification-ink ${PRESS} hover:bg-agentx-notification-hover focus-visible:bg-agentx-notification-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)]`}
							>
								<item.Icon className="mt-0.5 size-5 shrink-0 text-agentx-notification-icon" />
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span className="pe-7 text-agentx-caption text-agentx-notification-title-ink">
										{item.title}
									</span>
									<span className="text-agentx-menu-item">{item.message}</span>
								</span>
							</button>
							<Tooltip
								// translators: Tooltip on the button inside a task under the AI Agent's bell that clears it from the list.
								text={__('Dismiss', 'extendify-local')}
								className="absolute end-1 top-1.5"
							>
								<button
									type="button"
									role="menuitem"
									aria-label={sprintf(
										// translators: %s names a task under the AI Agent's bell, like WooCommerce Setup. Screen reader name of the button that clears it from the list.
										__('Dismiss: %s', 'extendify-local'),
										item.name,
									)}
									onClick={() => clear(item, true)}
									// Keyboard focus shows it too, and a touch screen has no hover to show it with.
									className={`${CLOSE_BASE} text-agentx-notification-dismiss enabled:hover:text-agentx-notification-ink opacity-0 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 [@media(hover:none)]:opacity-100`}
								>
									<Icon icon={closeSmall} size={20} className="fill-current" />
								</button>
							</Tooltip>
						</div>
					))}
					{!listed.length && (
						<p className="m-0 px-3 py-2 text-agentx-menu-item text-agentx-menu-muted">
							{
								// translators: Shown under the AI Agent's Tasks bell when there is nothing in it.
								__('Nothing new', 'extendify-local')
							}
						</p>
					)}
					{put.length > 0 && (
						<div
							role="none"
							className="mt-1 flex flex-col border-0 border-t border-solid border-agentx-menu-divider pt-1"
						>
							<button
								type="button"
								role="menuitem"
								aria-expanded={showCleared}
								onClick={() => setShowCleared(!showCleared)}
								className={`${ITEM} text-agentx-menu-muted`}
							>
								<span className="flex-1">
									{sprintf(
										// translators: %d is how many items the user cleared from the AI Agent's Tasks bell. Opens the list of them.
										__('Cleared (%d)', 'extendify-local'),
										put.length,
									)}
								</span>
								<Icon
									icon={showCleared ? chevronUp : chevronDown}
									size={20}
									className="fill-current"
								/>
							</button>
							{showCleared &&
								put.map((item) => (
									<div
										key={item.id}
										role="none"
										className="flex items-center gap-2 py-1 ps-3 pe-1"
									>
										<span className="min-w-0 flex-1 text-agentx-menu-item text-agentx-menu-muted">
											{item.name}
										</span>
										<button
											type="button"
											role="menuitem"
											aria-label={sprintf(
												// translators: %s names a task the user cleared from under the AI Agent's bell, like WooCommerce Setup. Screen reader name of the button that puts it back in the list.
												__('Restore: %s', 'extendify-local'),
												item.name,
											)}
											onClick={() => clear(item, false)}
											className={GHOST_SMALL}
										>
											{
												// translators: Button beside an item the user cleared from the AI Agent's Tasks bell that puts it back in the list.
												__('Restore', 'extendify-local')
											}
										</button>
									</div>
								))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

const MoreMenu = ({ devTool }) => {
	const id = useId();
	const devToolView = useShellStore((state) => state.devToolView);
	const [open, setOpen] = useState(false);
	const [place, setPlace] = useState({});
	const [editor, setEditor] = useState('');
	const button = useRef(null);
	const menu = useRef(null);
	const items = () => [
		...(menu.current?.querySelectorAll('[role^="menuitem"]') ?? []),
	];

	const shut = ({ refocus } = {}) => {
		setOpen(false);
		if (refocus) button.current?.focus();
	};

	useEffect(() => {
		if (!open) return;
		items()[0]?.focus();
		const away = (event) => {
			if (
				!menu.current?.contains(event.target) &&
				!button.current?.contains(event.target)
			) {
				shut();
			}
		};
		const blurred = () => shut();
		document.addEventListener('pointerdown', away);
		window.addEventListener('blur', blurred);
		return () => {
			document.removeEventListener('pointerdown', away);
			window.removeEventListener('blur', blurred);
		};
	}, [open]);

	const onKeyDown = (event) => {
		if (stepFocus(event, menu.current)) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			shut({ refocus: true });
			return;
		}
		if (event.key === 'Tab') shut();
	};

	return (
		<div>
			<button
				ref={button}
				type="button"
				data-agentx-more
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? `${id}-menu` : undefined}
				onClick={() => {
					if (!open) setPlace(placeBy(button.current));
					setEditor(editorUrl());
					setOpen(!open);
				}}
				className={`agentx-focus inline-flex h-9 items-center gap-1 rounded-agentx-header-button border-0 bg-agentx-header-button ps-3 pe-1.5 text-agentx-header-label text-agentx-more-ink ${PRESS} hover:bg-agentx-more-hover aria-expanded:bg-agentx-header-active`}
			>
				<span>
					{
						// translators: Button atop the AI Agent that opens a menu of links, like WP Admin, and Close agent.
						__('More', 'extendify-local')
					}
				</span>
				<Icon icon={moreVertical} size={24} className="fill-current" />
			</button>
			{open && (
				<div
					ref={menu}
					id={`${id}-menu`}
					role="menu"
					// translators: Screen reader name for the menu atop the AI Agent with links to WordPress and Close agent.
					aria-label={__('More', 'extendify-local')}
					onKeyDown={onKeyDown}
					style={place}
					// Above the dev tool panel, which floats under the More button.
					className="fixed z-100000 flex min-w-52 flex-col rounded-agentx-menu border border-solid border-agentx-menu-border bg-agentx-menu p-1 shadow-(--agentx-menu-shadow)"
				>
					{editor && (
						<a
							role="menuitem"
							href={editor}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => shut()}
							className={ITEM}
						>
							<Icon
								icon={pencil}
								size={20}
								className="shrink-0 fill-agentx-menu-icon"
							/>
							<span>
								{
									// translators: Link on the toolbar atop the website that opens this page in the WordPress block editor.
									__('Block Editor', 'extendify-local')
								}
							</span>
							<NewTab />
						</a>
					)}
					<a
						role="menuitem"
						href={adminUrl}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() => shut()}
						className={ITEM}
					>
						<Icon
							icon={dashboard}
							size={20}
							className="shrink-0 fill-agentx-menu-icon"
						/>
						<span>
							{
								// translators: Link on the toolbar atop the website that opens the WordPress dashboard.
								__('WP Admin', 'extendify-local')
							}
						</span>
						<NewTab />
					</a>
					<hr className="my-1 h-px w-full border-0 bg-agentx-menu-divider" />
					<button
						type="button"
						role="menuitem"
						onClick={closeAgent}
						className={ITEM}
					>
						<Icon
							icon={close}
							size={20}
							className="shrink-0 fill-agentx-menu-icon"
						/>
						<span>
							{
								// translators: Menu item that closes the AI Agent and shows the website on its own.
								__('Close agent', 'extendify-local')
							}
						</span>
					</button>
					{devTool && (
						// biome-ignore lint/a11y/useSemanticElements: a menu holds only menu items and groups of them, so no fieldset.
						<div
							role="group"
							aria-labelledby={`${id}-dev`}
							className="flex flex-col"
						>
							<hr className="my-1 h-px w-full border-0 bg-agentx-menu-divider" />
							<p
								id={`${id}-dev`}
								className="m-0 px-3 pt-1 pb-0.5 text-agentx-caption font-agentx-button text-agentx-menu-muted"
							>
								Dev
							</p>
							{DEV_TOOL_VIEWS.map(({ view, label, icon }) => (
								<button
									key={view}
									type="button"
									role="menuitemcheckbox"
									aria-checked={devToolView === view}
									onClick={() => {
										shut({ refocus: true });
										useShellStore
											.getState()
											.setDevToolView(devToolView === view ? null : view);
									}}
									className={`${ITEM} aria-checked:bg-agentx-menu-hover`}
								>
									<Icon
										icon={icon}
										size={20}
										className="shrink-0 fill-agentx-menu-icon"
									/>
									<span>{label}</span>
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

const BAR_LINK = `agentx-focus inline-flex h-9 items-center gap-1.5 rounded-agentx-header-button border-0 bg-agentx-header-button px-2.5 text-agentx-header-label text-agentx-header-link-ink no-underline ${PRESS} hover:bg-agentx-header-link-hover`;

// The site frame changes page on its own, so the editor link is read as the pointer or focus nears it.
const EditorLink = () => {
	const [href, setHref] = useState('');
	const refresh = () => setHref(editorUrl());
	return (
		<a
			href={href || adminUrl}
			target="_blank"
			rel="noopener noreferrer"
			onPointerEnter={refresh}
			onFocus={refresh}
			onClick={(event) => {
				const url = editorUrl();
				if (url) event.currentTarget.href = url;
				else event.preventDefault();
			}}
			className={BAR_LINK}
		>
			<Icon icon={pencil} size={20} className="shrink-0 fill-current" />
			<span>{__('Block Editor', 'extendify-local')}</span>
			<span className="sr-only">
				{__('(opens in a new tab)', 'extendify-local')}
			</span>
		</a>
	);
};

// More's links laid out on the bar, with Close as an X.
const SpreadActions = ({ devTool }) => {
	const devToolView = useShellStore((state) => state.devToolView);
	return (
		<div className="flex items-center gap-1">
			{devTool &&
				DEV_TOOL_VIEWS.map(({ view, label, icon }) => (
					<Tooltip key={view} text={label}>
						<button
							type="button"
							aria-label={label}
							aria-pressed={devToolView === view}
							onClick={() =>
								useShellStore
									.getState()
									.setDevToolView(devToolView === view ? null : view)
							}
							className={`${TOGGLE} text-agentx-header-ink hover:bg-agentx-header-hover aria-pressed:bg-agentx-header-active`}
						>
							<Icon icon={icon} size={20} className="fill-current" />
						</button>
					</Tooltip>
				))}
			<EditorLink />
			<a
				href={adminUrl}
				target="_blank"
				rel="noopener noreferrer"
				className={BAR_LINK}
			>
				<Icon icon={dashboard} size={20} className="shrink-0 fill-current" />
				<span>{__('WP Admin', 'extendify-local')}</span>
				<span className="sr-only">
					{__('(opens in a new tab)', 'extendify-local')}
				</span>
			</a>
			<Tooltip text={__('Close agent', 'extendify-local')}>
				<button
					type="button"
					onClick={closeAgent}
					aria-label={__('Close agent', 'extendify-local')}
					className={`${TOGGLE} text-agentx-header-link-ink hover:bg-agentx-header-link-hover`}
				>
					<Icon icon={close} size={24} className="fill-current" />
				</button>
			</Tooltip>
		</div>
	);
};

export const Toolbar = ({ devTool, spread = false }) =>
	spread ? <SpreadActions devTool={devTool} /> : <MoreMenu devTool={devTool} />;
