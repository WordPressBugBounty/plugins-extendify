import { PHONE_WIDTH, scaleSite } from '@agentx/lib/fit-site';
import { followSite } from '@agentx/lib/follow-site';
import { watchPage } from '@agentx/lib/page-in-view';
import { prefetchOnHover } from '@agentx/lib/prefetch';
import { watchPresence } from '@agentx/lib/presence';
import { watchDraft } from '@agentx/lib/show-draft';
import {
	afterSite,
	enterSite,
	loopTab,
	SITE_STOP,
	scrollSite,
	scrollSiteKeys,
	stopSiteKeys,
} from '@agentx/lib/site-focus';
import { coverSlowPages } from '@agentx/lib/switch-site';
import { Spinner } from '@agentx/spinner/Spinner';
import { usePlanStore } from '@agentx/state/plan';
import { useRunStore } from '@agentx/state/run';
import { useShellStore } from '@agentx/state/shell';
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Stops frame-busting scripts, which would reload the shell in a loop.
const SANDBOX =
	'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox ' +
	'allow-modals allow-downloads allow-top-navigation-by-user-activation';

// A fresh URL keeps any cache from serving a stored frame.
const pageSrc = (dropParams) => {
	const url = new URL(window.location.href);
	for (const param of dropParams) url.searchParams.delete(param);
	url.searchParams.set('extendify-frame', Math.random().toString(36).slice(2));
	return url.href;
};

const viewWidth = () =>
	useShellStore.getState().siteView === 'phone'
		? PHONE_WIDTH
		: window.innerWidth;

export const SiteFrame = ({ data, inert }) => {
	const ref = useRef(null);
	const stop = useRef(null);
	const hint = useId();
	const [src] = useState(() => pageSrc(data.dropParams));
	const run = useRunStore((state) => state.working || state.blurred);
	const planning = usePlanStore((state) => Boolean(state.plan));
	const locked = run || planning;

	// A click or a scroll mid-run could leave or move the page the agent is changing.
	useEffect(() => {
		ref.current.style.pointerEvents = locked ? 'none' : '';
	}, [locked]);

	useEffect(() => {
		followSite(ref.current, data);
		prefetchOnHover(ref.current, data);
		const stopWatching = watchDraft();
		const stopPresence = watchPresence(ref.current);
		const stopPage = watchPage(ref.current);
		const stopScaling = scaleSite(ref.current, viewWidth);
		const stopCovering = coverSlowPages(ref.current);
		return () => {
			stopWatching();
			stopPresence();
			stopPage();
			stopScaling();
			stopCovering();
		};
	}, [data]);

	useEffect(() => {
		document.addEventListener('keydown', loopTab);
		document.addEventListener('keydown', scrollSiteKeys);
		document.addEventListener('keyup', stopSiteKeys);
		// Focus leaving the window swallows the keyup that ends a glide.
		window.addEventListener('blur', stopSiteKeys);
		return () => {
			document.removeEventListener('keydown', loopTab);
			document.removeEventListener('keydown', scrollSiteKeys);
			document.removeEventListener('keyup', stopSiteKeys);
			window.removeEventListener('blur', stopSiteKeys);
			stopSiteKeys();
		};
	}, []);

	// React 18 drops a boolean inert, and React 19 drops an empty one.
	useEffect(() => {
		stop.current.inert = inert;
	}, [inert]);

	// Without one stop, Tab walks every site link before the agent's controls.
	return (
		<section
			ref={stop}
			id={SITE_STOP}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: an interactive role would hide the site inside it from screen readers.
			tabIndex={0}
			// translators: Screen reader name for the user's website, shown beside the AI Agent's chat.
			aria-label={__('Your site', 'extendify-local')}
			aria-describedby={hint}
			onKeyDown={(event) => {
				if (event.target !== event.currentTarget || event.key !== 'Enter') {
					return;
				}
				event.preventDefault();
				enterSite();
			}}
			className="group absolute inset-0 rounded-[inherit] outline-none"
		>
			<span id={hint} hidden>
				{
					// translators: Read by screen readers on the AI Agent's frame that shows the user's website.
					__('Press Enter to browse your site.', 'extendify-local')
				}
			</span>
			<iframe
				ref={ref}
				id="extendify-agentx-site"
				className="absolute start-0 top-0 size-full origin-top-left border-0 rtl:origin-top-right"
				allow="payment"
				sandbox={SANDBOX}
				src={src}
				title={
					// translators: Screen reader name for the frame that shows the user's own website.
					__('Your site', 'extendify-local')
				}
			/>
			{locked && (
				<div
					id="extendify-agentx-site-lock"
					aria-hidden="true"
					className="absolute inset-0"
				/>
			)}
			<SiteCover onWheel={scrollSite} />
			<SiteEdge />
			<SiteWorking />
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 hidden rounded-[inherit] outline-(length:--agentx-focus-width) -outline-offset-(--agentx-focus-width) outline-agentx-focus keys:group-focus-visible:block"
			/>
			{/* Tab past the site's last link comes back to the agent, not to the browser. */}
			{/* biome-ignore lint/a11y/noNoninteractiveTabindex: a focus guard, never focused for long. */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: its focus only passes on to the agent. */}
			<span tabIndex={0} onFocus={() => afterSite()?.focus()} />
		</section>
	);
};

// Only while a change to the page is landing, not for a turn that answers a question.
export const SiteWorking = () => {
	const changing = useRunStore((state) => state.changing);
	if (!changing) return null;
	return (
		<>
			<div
				aria-hidden="true"
				className="extendify-agentx-working-glow absolute inset-x-0 bottom-0"
			/>
			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-3 pb-6">
				<span className="extendify-agentx-working-shine">
					<output className="m-0 flex items-center gap-1.5 rounded-full border border-solid border-agentx-card-border bg-agentx-card px-4 py-2 text-agentx-caption text-agentx-card-ink shadow-(--agentx-card-shadow)">
						<Spinner />
						<span>
							{
								// translators: Shown over the user's own website in the AI Agent while the agent is making a change the user asked for.
								__('Working on your page…', 'extendify-local')
							}
						</span>
					</output>
				</span>
			</div>
		</>
	);
};

// The veil and spinner a switch fades in over the site, found by id.
// The frame covers the box's edge and its stop, so both are drawn over it.
export const SiteEdge = () => (
	<div
		aria-hidden="true"
		className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-agentx-site-border"
	/>
);

export const SiteCover = ({ onWheel }) => (
	<>
		<div
			id="extendify-agentx-site-cover"
			onWheel={onWheel}
			className="absolute inset-0 bg-agentx-veil"
			// The bundle's classes are !important, so the toggled styles stay inline.
			style={{ pointerEvents: 'none', opacity: 0 }}
		/>
		<div
			id="extendify-agentx-site-spinner"
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 flex items-center justify-center"
			style={{ opacity: 0 }}
		>
			{/* Its white end shows on dark pages, and its dark end on light ones. */}
			<span className="size-7 animate-spin rounded-full bg-[conic-gradient(transparent_0_20%,var(--color-agentx-switch-spinner-mid)_45%,var(--color-agentx-switch-spinner)_100%)] mask-[radial-gradient(farthest-side,transparent_calc(100%-4px),#000_calc(100%-3px))]" />
		</div>
	</>
);

export const HttpWarning = () => (
	<p
		id="extendify-agentx-http-warning"
		className="mx-auto mt-24 max-w-md px-4 text-center text-base"
	>
		{
			// translators: Shown in place of the website when the AI Agent is opened on a site without HTTPS.
			__(
				'Your site can only show here over a secure HTTPS connection.',
				'extendify-local',
			)
		}
	</p>
);
