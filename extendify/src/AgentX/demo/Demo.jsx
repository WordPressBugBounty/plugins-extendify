import { ChatStates } from '@agentx/demo/ChatStates';
import { DraftNotice } from '@agentx/demo/DraftNotice';
import { EditingAsks } from '@agentx/demo/EditingAsks';
import { useState } from '@wordpress/element';

const TABS = {
	chat: 'Chat',
	editing: 'Editing',
};

// Internal and English only, like the dev tool.
export const Demo = () => {
	const [tab, setTab] = useState('chat');
	const [query, setQuery] = useState('');

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<DraftNotice />
			<input
				type="search"
				aria-label="Search the demo"
				placeholder="Search"
				// biome-ignore lint/a11y/noAutofocus: a dev tool, opened to be searched
				autoFocus
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="w-full rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
			/>
			<div
				role="tablist"
				aria-label="Demo"
				className="grid grid-cols-2 gap-1 rounded-agentx bg-agentx-hover p-1"
			>
				{Object.entries(TABS).map(([name, label]) => (
					<button
						key={name}
						type="button"
						role="tab"
						id={`extendify-agentx-demo-${name}`}
						aria-selected={tab === name}
						aria-controls="extendify-agentx-demo-panel"
						onClick={() => setTab(name)}
						className="agentx-focus rounded-agentx-control border-0 bg-transparent px-2 py-1.5 text-center text-sm text-agentx-ink hover:bg-agentx-hover aria-selected:bg-agentx-site aria-selected:font-medium aria-selected:shadow-sm"
					>
						{label}
					</button>
				))}
			</div>
			<div
				role="tabpanel"
				id="extendify-agentx-demo-panel"
				aria-labelledby={`extendify-agentx-demo-${tab}`}
				className="min-h-0 flex-1 overflow-y-auto border-t border-agentx-ink/10 pt-3"
			>
				{tab === 'chat' && <ChatStates query={query} />}
				{tab === 'editing' && <EditingAsks query={query} />}
			</div>
		</div>
	);
};
