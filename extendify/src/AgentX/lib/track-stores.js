import { track } from '@agentx/lib/track';
import { useGuideStore } from '@agentx/state/guide';
import { useSelectionStore } from '@agentx/state/selection';
import { useShellStore } from '@agentx/state/shell';

// Tracked where the state changes, so every control that sets it counts.
export const watchStores = () => {
	const stops = [
		useShellStore.subscribe((now, was) => {
			if (now.minimized !== was.minimized) {
				track(now.minimized ? 'agent-minimized' : 'agent-restored');
			}
			if (now.siteView !== was.siteView) {
				track('view-changed', { to: now.siteView });
			}
			if (now.autosave !== was.autosave) {
				track('autosave-toggled', { on: Boolean(now.autosave) });
			}
			if (now.changesOpen && !was.changesOpen) track('history-opened');
		}),
		useSelectionStore.subscribe((now, was) => {
			if (now.picking && !was.picking) track('select-used');
		}),
		useGuideStore.subscribe((now, was) => {
			for (const [step, status] of Object.entries(now.steps ?? {})) {
				if (was.steps?.[step] !== status) {
					track('guide-step', { step, status: String(status) });
				}
			}
		}),
	];
	return () => {
		for (const stop of stops) stop();
	};
};

// The open link redirects its param away, so the redirect is what marks it.
export const openedFrom = (
	search = window.location.search,
	nav = performance.getEntriesByType?.('navigation')?.[0],
) => {
	const query = new URLSearchParams(search);
	if (
		query.has('extendify-launch-success') ||
		query.has('extendify-open-agent')
	) {
		return 'launch';
	}
	if (nav?.type === 'reload') return 'reload';
	return nav?.redirectCount ? 'link' : 'page';
};
