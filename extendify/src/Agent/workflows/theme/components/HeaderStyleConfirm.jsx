import {
	currentHeaderState,
	HEADER_STATES,
	headerBlockEl,
	nextClasses,
} from '@agent/workflows/theme/tools/update-header-style';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const OWNED = [...new Set(Object.values(HEADER_STATES).flat())];

const applyClasses = (el, classes) => {
	for (const cls of OWNED) el.classList.toggle(cls, classes.includes(cls));
};

export const HeaderStyleConfirm = ({ inputs, onConfirm, onCancel }) => {
	const previewed = useRef(null);
	const confirmed = useRef(false);
	const [noChange, setNoChange] = useState(false);

	// Without this the confirm asks about a change nothing on the page shows.
	useEffect(() => {
		if (previewed.current) return;
		const el = headerBlockEl();
		if (!el) return;
		const classes = [...el.classList];
		previewed.current = { el, classes };
		if (inputs?.state === currentHeaderState()) return setNoChange(true);
		applyClasses(el, nextClasses(classes, inputs?.state));
	}, [inputs]);

	useEffect(
		() => () => {
			const { el, classes } = previewed.current ?? {};
			if (!el || confirmed.current) return;
			applyClasses(el, classes);
		},
		[],
	);

	const handleConfirm = useCallback(() => {
		confirmed.current = true;
		onConfirm({ data: inputs });
	}, [inputs, onConfirm]);
	const handleCancel = useCallback(() => onCancel(), [onCancel]);

	return (
		<div className="mb-4 ms-12 me-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="p-3">
					<p className="m-0 p-0 text-sm text-gray-900">
						{noChange
							? __(
									'Your header already looks like that, so there is nothing to change.',
									'extendify-local',
								)
							: __(
									'The agent has changed the header in the browser. Please review and confirm.',
									'extendify-local',
								)}
					</p>
				</div>
			</div>
			<div className="flex flex-wrap justify-start gap-2 p-3">
				<button
					type="button"
					className="flex-1 rounded-sm border border-gray-500 bg-white p-2 text-sm text-gray-900"
					onClick={handleCancel}
				>
					{noChange
						? __('Close', 'extendify-local')
						: __('Cancel', 'extendify-local')}
				</button>
				{!noChange && (
					<button
						type="button"
						className="flex-1 rounded-sm border border-design-main bg-design-main p-2 text-sm text-white"
						onClick={handleConfirm}
					>
						{__('Save', 'extendify-local')}
					</button>
				)}
			</div>
		</div>
	);
};
