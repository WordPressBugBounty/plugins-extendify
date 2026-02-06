import { __ } from '@wordpress/i18n';

export const UpdateSettingConfirm = ({ inputs, onConfirm, onCancel }) => {
	const handleConfirm = () => {
		onConfirm({ data: inputs, shouldRefreshPage: true });
	};

	return (
		<div className="mb-4 ml-10 mr-2 flex flex-col rounded-lg border border-gray-300 bg-gray-50 rtl:ml-2 rtl:mr-10">
			<div className="rounded-lg border-b border-gray-300 bg-white">
				<div className="p-3">
					<p className="m-0 p-0 text-sm text-gray-900">
						{__('Apply this setting change?', 'extendify-local')}
					</p>
				</div>
			</div>
			<div className="flex justify-start gap-2 p-3">
				<button
					type="button"
					className="w-full rounded border border-gray-300 bg-white p-2 text-sm text-gray-700"
					onClick={onCancel}>
					{__('Cancel', 'extendify-local')}
				</button>
				<button
					type="button"
					className="w-full rounded border border-design-main bg-design-main p-2 text-sm text-white"
					onClick={handleConfirm}>
					{__('Confirm', 'extendify-local')}
				</button>
			</div>
		</div>
	);
};
