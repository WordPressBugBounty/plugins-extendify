import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { useAIConsentStore } from '@shared/state/ai-consent';
import {
	forwardRef,
	useCallback,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { chevronRight, Icon } from '@wordpress/icons';

export const DescriptionGathering = () => {
	const { setData, descriptionBackup } = useLaunchDataStore();
	const [input, setInput] = useState(descriptionBackup || '');
	const textareaRef = useRef(null);
	const { consentTerms } = useAIConsentStore();
	// resize the height of the textarea based on the content
	const adjustHeight = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		const bottomPadding = 120; // tweak as needed
		// Reset to measure natural height
		el.style.height = 'auto';

		const rect = el.getBoundingClientRect();
		const viewportHeight = window.innerHeight;

		const maxAvailable = Math.max(0, viewportHeight - rect.top - bottomPadding);
		const desired = el.scrollHeight;
		const nextHeight = Math.min(desired, maxAvailable);

		el.style.height = `${nextHeight}px`;
		el.style.overflowY = desired > maxAvailable ? 'auto' : 'hidden';

		// Notify others
		window.dispatchEvent(new Event('launch-textarea-resize'));
	}, []);

	const submitForm = (e) => {
		e.preventDefault();
		setData('description', input.trim());
	};

	useEffect(() => {
		setData('descriptionBackup', input.trim());
	}, [input, setData]);

	useEffect(() => {
		const controller = new AbortController();
		const { signal } = controller;
		const handleResize = () => {
			adjustHeight();
			const c = textareaRef.current;
			c?.scrollTo(0, c.scrollHeight);
		};
		window.addEventListener('resize', handleResize, { signal });
		window.addEventListener('orientationchange', handleResize, { signal });
		adjustHeight();
		return () => controller.abort();
	}, [adjustHeight]);

	return (
		<>
			{/* biome-ignore lint: allow onClick without keyboard */}
			<form
				onSubmit={submitForm}
				onClick={() => textareaRef.current?.focus()}
				className="relative flex w-full flex-col p-6"
			>
				<div className="focus-within:border-design-main focus-within:ring-design-main w-full bg-white rounded-md text-gray-900 shadow-xl">
					<textarea
						ref={textareaRef}
						id="extendify-launch-chat-textarea"
						className="flex min-h-36 w-full resize-none bg-transparent p-4 text-base placeholder:text-gray-700 focus:shadow-none focus:outline-hidden disabled:opacity-50 border-none text-gray-900"
						rows="1"
						// biome-ignore lint: Allow autofocus here
						autoFocus
						value={input}
						onChange={(e) => {
							setInput(e.target.value);
							adjustHeight();
						}}
					/>
					<div className="flex justify-between gap-4 p-2.5">
						<div className="ms-auto flex items-center">
							<SubmitButton disabled={input.trim().length === 0} />
						</div>
					</div>
				</div>
			</form>
			<div
				className="text-pretty px-4 mt-4 text-center text-xss leading-none opacity-70 text-banner-text [&>a]:text-xss [&>a]:text-banner-text [&>a]:underline w-full absolute"
				dangerouslySetInnerHTML={{ __html: consentTerms }}
			/>
			<a
				className="text-sm font-medium underline text-banner-text fixed left-4 bottom-4 opacity-70 hover:opacity-100 transition-opacity"
				href={window.extSharedData.adminUrl}
			>
				{__('Exit to WP-Admin', 'extendify-local')}
			</a>
		</>
	);
};

const SubmitButton = forwardRef((props, ref) => (
	<button
		ref={ref}
		type="submit"
		className="inline-flex h-fit items-center justify-center gap-0.5 whitespace-nowrap border-0 bg-design-main p-2 py-1 text-sm font-medium text-white transition-colors focus-visible:ring-design-main disabled:opacity-20 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-2 group"
		{...props}
	>
		{__('Next', 'extendify-local')}
		<span className="transition-transform group-hover:translate-x-0.5">
			<Icon fill="currentColor" icon={chevronRight} size={24} />
		</span>
	</button>
));
