import { useShellStore } from '@agentx/state/shell';

const StandIn = () => (
	<section
		aria-label="Stand-in tool"
		className="flex h-150 max-h-full w-md max-w-full flex-col items-center justify-center gap-2 rounded-agentx bg-agentx-site p-8 text-center text-agentx-ink shadow-(--agentx-site-shadow)"
	>
		<h2 className="m-0 text-lg font-medium">Stand-in tool</h2>
		<p className="m-0 max-w-sm text-sm">
			A tool like a logo maker or page manager works here, while the site waits
			in the corner.
		</p>
	</section>
);

export const CanvasTools = () => {
	const { canvasTool, setCanvasTool } = useShellStore();
	const open = canvasTool === StandIn;

	return (
		<section aria-label="Canvas tools" className="flex flex-col gap-1">
			<button
				type="button"
				aria-pressed={open}
				onClick={() => setCanvasTool(open ? null : StandIn)}
				className="agentx-focus rounded-agentx-control border-0 bg-transparent px-3 py-2 text-start text-sm text-agentx-ink hover:bg-agentx-hover aria-pressed:bg-agentx-panel aria-pressed:font-medium"
			>
				Toggle minimize site
			</button>
		</section>
	);
};
