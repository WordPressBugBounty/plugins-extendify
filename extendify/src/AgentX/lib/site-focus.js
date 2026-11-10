import { usePlanStore } from '@agentx/state/plan';
import { useRunStore } from '@agentx/state/run';

export const SITE_STOP = 'extendify-agentx-site-stop';

const TABBABLE = 'a[href], button, input, select, textarea, iframe, [tabindex]';

// Scoped to the shell, so controls a host adds to the page stay out.
const agentControls = () =>
	[
		...(document
			.getElementById('extendify-agentx-shell')
			?.querySelectorAll(TABBABLE) ?? []),
	].filter(
		(element) =>
			element.tabIndex >= 0 &&
			!element.disabled &&
			!element.closest('[inert]') &&
			!element.closest(`#${SITE_STOP}`) &&
			element.getClientRects().length > 0,
	);

// Controls after the site, like the dev tool's panel, come before wrapping to the top.
export const afterSite = () => {
	const stop = document.getElementById(SITE_STOP);
	const controls = agentControls();
	return (
		controls.find(
			(control) =>
				stop?.compareDocumentPosition(control) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		) ?? controls[0]
	);
};

// A click mid-run is blocked too, since the agent may be changing the page.
// From the message sent to the run's end, through a plan, and while a blur waits on an answer.
export const siteLocked = ({ working, blurred } = useRunStore.getState()) =>
	working || blurred || Boolean(usePlanStore.getState().plan);

export const enterSite = () => {
	const frame = document.getElementById('extendify-agentx-site');
	if (!frame?.contentWindow || frame.closest('[inert]') || siteLocked()) {
		return false;
	}
	frame.contentWindow.focus();
	return true;
};

export const loopTab = (event) => {
	if (event.key !== 'Tab' || event.defaultPrevented) return;
	const stop = document.getElementById(SITE_STOP);
	// A canvas tool makes the site inert, and focus sent to it would go nowhere.
	if (!stop || stop.closest('[inert]')) return;
	const first = agentControls()[0];
	const next = afterSite();
	if (!event.shiftKey && event.target === stop && next) {
		event.preventDefault();
		next.focus();
		return;
	}
	// Shift+Tab would land on the guard after the frame, which sends focus forward.
	if (event.shiftKey && (event.target === first || event.target === next)) {
		event.preventDefault();
		stop.focus();
	}
};

// How far one wheel line moves, for a mouse that scrolls in lines rather than pixels.
const LINE_PX = 40;

// Mid-switch the stand-in is the page on screen, and the frame takes its scroll when it swaps in.
export const scrollSite = ({ deltaMode, deltaX, deltaY }) => {
	const shown =
		document.getElementById('extendify-agentx-site-stand-in') ??
		document.getElementById('extendify-agentx-site');
	const unit = [1, LINE_PX, shown.clientHeight][deltaMode] ?? 1;
	// A theme's smooth scrolling would start an animation per wheel event, each cutting off the last.
	shown.contentWindow.scrollBy({
		left: deltaX * unit,
		top: deltaY * unit,
		behavior: 'instant',
	});
};

// What one arrow key press scrolls a page in Chrome and Safari.
const ARROW_STEP = 40;

// A select's own Alt+Arrow opens its list, whatever option it shows.
const typedIn = (target) =>
	Boolean(
		target?.isContentEditable || target?.value || target?.tagName === 'SELECT',
	);

// Held keys repeat in jumps, so the site glides at the repeats' speed instead.
let glide = null;

const stopGlide = () => {
	if (glide) cancelAnimationFrame(glide.frame);
	glide = null;
};

// Until a second repeat shows the keyboard's rate, a common one.
const REPEAT_MS = 50;

const glideSite = (site, direction, now) => {
	if (glide) {
		glide.interval = Math.max(now - glide.repeated, 16);
		glide.repeated = now;
		return;
	}
	glide = { last: now, repeated: now, interval: REPEAT_MS };
	const move = (time) => {
		if (!glide) return;
		// macOS sends no keyup for an arrow released while Cmd is held.
		if (time - glide.repeated > glide.interval * 3 + 100) {
			stopGlide();
			return;
		}
		site.scrollBy({
			top: (direction * ARROW_STEP * (time - glide.last)) / glide.interval,
			behavior: 'instant',
		});
		glide.last = time;
		glide.frame = requestAnimationFrame(move);
	};
	glide.frame = requestAnimationFrame(move);
};

export const scrollSiteKeys = (event) => {
	if (event.defaultPrevented || typedIn(event.target) || siteLocked()) return;
	const up = event.key === 'ArrowUp';
	if (!up && event.key !== 'ArrowDown') return;
	const step = event.metaKey || event.ctrlKey;
	if (!step && !event.altKey) return;
	const site = document.getElementById('extendify-agentx-site')?.contentWindow;
	if (!site) return;
	event.preventDefault();
	if (step && event.repeat) {
		glideSite(site, up ? -1 : 1, performance.now());
		return;
	}
	stopGlide();
	const distance = step ? ARROW_STEP : 0.9 * site.innerHeight;
	const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	// Instant, not auto: a site's own smooth scroll-behavior would make held repeats lag.
	site.scrollBy({
		top: up ? -distance : distance,
		behavior: smooth && !event.repeat ? 'smooth' : 'instant',
	});
};

export const stopSiteKeys = stopGlide;
