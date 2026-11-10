import { blockName } from '@agentx/lib/versions';
import { useDraftStore } from '@agentx/state/draft';

const ago = (at) => {
	const minutes = Math.floor((Date.now() / 1000 - at) / 60);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes} min ago`;
	if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;
	return new Date(at * 1000).toLocaleDateString();
};

const WHY = {
	changed: 'its block was edited or deleted outside the agent',
	unsure: 'more than one block now looks like its block',
	built: 'it changed a block that a dropped change made',
	gone: 'its page is gone',
};

const changedOutside = ({ title, theme, by, mine, at }) => {
	if (theme) return `“${title}” changed with a theme update.`;
	const who = mine ? ', by you, in another tab' : by ? `, by ${by}` : '';
	return `“${title}” changed outside the agent${who}, ${ago(at)}.`;
};

const editing = ({ title, by, mine }) =>
	mine
		? `You have “${title}” open in the editor in another tab.`
		: `${by} has “${title}” open in the editor.`;

export const DraftNotice = () => {
	const { notice, locks, versions, dismiss } = useDraftStore();
	if (!notice && !locks.length) return null;
	const dropped = versions.filter(({ id }) => notice?.dropped.includes(id));

	return (
		<output
			aria-label="Draft changes"
			className="flex flex-col items-start gap-1 rounded-agentx-control bg-agentx-panel px-3 py-2 text-sm text-agentx-ink"
		>
			{locks.map((lock) => (
				<span key={lock.source}>{editing(lock)}</span>
			))}
			{notice?.tab && <span>The draft changed in another tab.</span>}
			{notice?.sources.map((source) => (
				<span key={source.source}>{changedOutside(source)}</span>
			))}
			{dropped.map(({ id, changed: [block], dropped: why }) => (
				<span key={id}>
					Dropped {blockName(block.type)} in “{block.title}”: {WHY[why]}.
				</span>
			))}
			{notice?.sources.length > 0 && !dropped.length && (
				<span>Your changes were kept.</span>
			)}
			{notice && (
				<button
					type="button"
					onClick={dismiss}
					className="agentx-focus rounded-agentx-control border-0 bg-transparent p-0 text-xs text-agentx-ink underline"
				>
					Dismiss
				</button>
			)}
		</output>
	);
};
