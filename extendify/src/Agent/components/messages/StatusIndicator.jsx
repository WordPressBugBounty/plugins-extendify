import { AnimateChunks } from '@agent/components/messages/AnimateChunks';
import { useStatusStore } from '@agent/state/status';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import classNames from 'classnames';

const canAnimateTypes = ['calling-agent', 'agent-working', 'tool-started'];

export const StatusIndicator = () => {
	const status = useStatusStore((s) => s.statuses.at(-1));
	const { type, label } = status ?? {};
	const [index, setIndex] = useState(0);
	const statusContent = useMemo(
		() => ({
			'calling-agent': __('Thinking...', 'extendify-local'),
			'agent-working': [
				__('Working on it...', 'extendify-local'),
				__('Interpreting message...', 'extendify-local'),
				__('Formulating a response...', 'extendify-local'),
				__('Reviewing logic...', 'extendify-local'),
			],
			'workflow-tool-processing': __('Processing...', 'extendify-local'),
			'tool-started': label || __('Gathering data...', 'extendify-local'),
			'tool-completed': label || __('Analyzing...', 'extendify-local'),
			'credits-exhausted': __('Usage limit reached', 'extendify-local'),
			'credits-restored': __('Usage limit restored', 'extendify-local'),
		}),
		[label],
	);
	const content = statusContent[type];
	const isList = Array.isArray(content);

	useEffect(() => setIndex(0), [type]);

	useEffect(() => {
		if (!isList) return;
		// Cycle verbs on a randomized 3-5s beat so it never looks stuck.
		const timer = setTimeout(
			() => setIndex((i) => (i + 1) % content.length),
			3000 + Math.random() * 2000,
		);
		return () => clearTimeout(timer);
	}, [isList, content, index]);

	if (!type || !content) return null;
	const text = isList ? content[index] : content;

	return (
		<div
			className={classNames('p-2 text-center text-xs italic text-gray-700', {
				'status-animation': canAnimateTypes.includes(type),
			})}
		>
			<AnimateChunks
				key={`${type}-${index}`}
				words={decodeEntities(text).split('')}
				delay={0.02}
			/>
		</div>
	);
};
