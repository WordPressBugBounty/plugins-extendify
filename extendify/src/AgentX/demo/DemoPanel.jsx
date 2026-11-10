import { Demo } from '@agentx/demo/Demo';
import { useShellStore } from '@agentx/state/shell';
import { closeSmall, Icon } from '@wordpress/icons';

// Internal and English only.
export const DemoPanel = ({ showsSite }) => (
	<aside
		aria-label="AgentX demo"
		// Fixed, so the phone sheet's overflow can't clip it.
		className="fixed end-4 top-16 z-99999 flex max-h-[calc(100vh-5rem)] w-80 flex-col overflow-hidden rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-xl max-md:top-auto max-md:bottom-16"
	>
		<div className="flex shrink-0 items-center justify-between border-b border-gray-300 py-1 ps-3 pe-1">
			<h2 className="m-0 text-sm font-semibold">Demo</h2>
			<button
				type="button"
				aria-label="Close Demo"
				onClick={() => {
					useShellStore.getState().setDevToolView(null);
					// The panel opened from More, so focus goes back there.
					document.querySelector('[data-agentx-more]')?.focus();
				}}
				className="inline-flex size-8 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-gray-700 hover:bg-gray-100"
			>
				<Icon icon={closeSmall} size={24} className="fill-current" />
			</button>
		</div>
		<div className="flex min-h-0 flex-1 flex-col p-3">
			{showsSite ? (
				<Demo />
			) : (
				<p className="m-0 text-xs text-gray-700">
					The demo needs the site, which shows only over HTTPS.
				</p>
			)}
		</div>
	</aside>
);
