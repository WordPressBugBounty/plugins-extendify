export const SlotPanel = ({ children }) => (
	<div
		id="extendify-agentx-slot"
		className="flex min-h-16 shrink-0 overflow-hidden rounded-agentx-slot border border-agentx-panel-border bg-agentx-panel shadow-(--agentx-panel-shadow)"
	>
		{children}
	</div>
);
