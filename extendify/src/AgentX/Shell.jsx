import { Backdrop } from '@agentx/Backdrop';
import { CanvasBar } from '@agentx/CanvasBar';
import { Caught } from '@agentx/Caught';
import { Chat } from '@agentx/chat/Chat';
import { useAutosave } from '@agentx/lib/draft-actions';
import { watchKeyboardMode } from '@agentx/lib/keyboard';
import { track } from '@agentx/lib/track';
import { openedFrom, watchStores } from '@agentx/lib/track-stores';
import { PartnerLogo } from '@agentx/PartnerLogo';
import { QuickEdit } from '@agentx/QuickEdit';
import { HttpWarning, SiteFrame } from '@agentx/SiteFrame';
import {
	SlotModal,
	SlotNotification,
	useSlotNotification,
} from '@agentx/SlotNotification';
import { useShellStore } from '@agentx/state/shell';
import {
	AgentMark,
	ChatToggle,
	NotificationBell,
	Toolbar,
} from '@agentx/Toolbar';
import { headerFor, templateFor } from '@agentx/templates';
import { Phone } from '@agentx/templates/Phone';
import {
	lazy,
	Suspense,
	useEffect,
	useLayoutEffect,
	useState,
} from '@wordpress/element';

const DemoPanel = lazy(() =>
	import('@agentx/demo/DemoPanel').then(({ DemoPanel }) => ({
		default: DemoPanel,
	})),
);

const Autosave = () => {
	useAutosave();
	return null;
};

// WordPress's mobile breakpoint.
const PHONE = '(max-width: 782px)';
// Touch screens point coarse; asking for hover instead would hide Quick Edit from headless browsers.
const TOUCH = '(pointer: coarse)';

const useMedia = (media) => {
	const [matches, setMatches] = useState(
		() => window.matchMedia(media).matches,
	);
	useEffect(() => {
		const query = window.matchMedia(media);
		const update = () => setMatches(query.matches);
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	}, [media]);
	return matches;
};

export const Shell = ({ data }) => {
	const template = useShellStore((state) => state.template);
	const header = useShellStore((state) => state.header);
	const bar = useShellStore((state) => state.bar);
	const actions = useShellStore((state) => state.actions);
	const CanvasTool = useShellStore((state) => state.canvasTool);
	const devToolView = useShellStore((state) => state.devToolView);
	const minimized = useShellStore((state) => state.minimized);
	const notifications = useShellStore((state) => state.notifications);
	const hasSlotNotification = useSlotNotification();
	const backdrop = useShellStore((state) => state.backdrop);
	const setSiteView = useShellStore((state) => state.setSiteView);
	const phone = useMedia(PHONE);
	const touch = useMedia(TOUCH);
	// The phone layout fits the site to the window, so a phone view would only zoom it.
	useEffect(() => {
		if (phone) setSiteView('desktop');
	}, [phone, setSiteView]);
	// Before paint, so the chat never shows Select on a phone for a frame.
	useLayoutEffect(() => {
		useShellStore.setState({ phone });
	}, [phone]);
	useEffect(() => watchKeyboardMode(), []);
	useEffect(() => {
		track('agent-opened', { from: openedFrom() });
		return watchStores();
	}, []);
	// Read once: the address bar drops the param when the site loads.
	const [chatOpen] = useState(
		() =>
			new URLSearchParams(window.location.search).get(
				'extendify-agent-chat',
			) === 'open',
	);
	const Template = phone ? Phone : templateFor(template);
	// The phone layout has no room for a tool, so its site stays live.
	const tool = CanvasTool && !phone ? <CanvasTool /> : null;
	const quickEdit = data.showsSite && !phone && !touch;
	const slotBanner =
		notifications === 'slot' && data.showsSite && hasSlotNotification;

	return (
		<>
			{backdrop && <Backdrop source={backdrop} />}
			<Template
				chat={
					<div id="extendify-agentx-chat" className="h-full">
						{data.showsSite && (
							<Caught where="shell">
								<Chat
									update={data.updateWordPress}
									pluginUpdate={data.updatePlugin}
									pluginUpdateUrl={data.updatePluginUrl}
								/>
							</Caught>
						)}
					</div>
				}
				brand={<PartnerLogo />}
				mark={<AgentMark />}
				bar={bar}
				bell={<NotificationBell />}
				chatToggle={<ChatToggle />}
				header={headerFor(header)}
				toolbar={
					<Toolbar devTool={data.devTool} spread={actions === 'spread'} />
				}
				site={
					data.showsSite ? (
						<SiteFrame data={data} inert={Boolean(tool)} />
					) : (
						<HttpWarning />
					)
				}
				tool={tool}
				siteView={data.showsSite ? <CanvasBar /> : null}
				startOpen={chatOpen}
				minimized={minimized}
				slot={
					slotBanner ? (
						<Caught where="slot" silent>
							<SlotNotification />
						</Caught>
					) : null
				}
			/>
			<SlotModal />
			{data.showsSite && <Autosave />}
			{quickEdit && (
				<Caught where="quick-edit" silent>
					<QuickEdit leaveUrls={data.leaveUrls} />
				</Caught>
			)}
			{data.devTool && devToolView === 'demo' && (
				<Suspense fallback={null}>
					<DemoPanel showsSite={data.showsSite} />
				</Suspense>
			)}
		</>
	);
};
