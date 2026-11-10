import { ImageGrid } from '@agentx/chat/ImageGrid';
import { LoadMore, useLibrary } from '@agentx/chat/LibraryImages';
import { SHEET_PRIMARY } from '@agentx/chat/styles';
import { refreshCredits } from '@agentx/lib/generation';
import { useImageGenerationStore } from '@shared/state/generate-images';
import { useEffect, useId } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

export const GeneratedImages = ({
	which,
	generation,
	pickedId,
	onPick,
	demo,
}) => {
	const { prompt, setPrompt, made, working, problem, generate } = generation;
	const { remaining, total } = useImageGenerationStore(
		(state) => state.imageCredits,
	);
	const id = useId();
	const blocked = !prompt.trim() || working || remaining <= 0;
	// Draft, Quick Edit and the agent tag what they import, so earlier generations show too.
	const before = useLibrary({ generated: true, demo });

	// The local count is a guess between generations, so the server is asked on open.
	useEffect(() => {
		if (!demo) refreshCredits();
	}, [demo]);

	const start = () => !blocked && !demo && generate();

	return (
		<div className="flex flex-col gap-3">
			<label className="flex flex-col gap-1 text-agentx-body">
				<span className="font-agentx-button">
					{
						// translators: Names the field where the user describes the image the AI Agent should generate.
						__('Describe the image', 'extendify-local')
					}
				</span>
				<textarea
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					onKeyDown={(event) => {
						if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey))
							return;
						event.preventDefault();
						start();
					}}
					rows={3}
					placeholder={
						{
							// translators: Example description in the AI Agent's field for generating a site icon.
							icon: __('A coffee cup, simple and bold', 'extendify-local'),
							// translators: Example description in the AI Agent's field for generating a logo.
							logo: __(
								'A steaming coffee cup, minimal and flat',
								'extendify-local',
							),
							// translators: Example description in the AI Agent's field for generating a photo for the user's web page.
							block: __(
								'A sunny café table with coffee and a slice of pie',
								'extendify-local',
							),
						}[which]
					}
					className="agentx-focus-inset resize-none rounded-agentx-control border border-agentx-sheet-field-border bg-agentx-sheet-field px-3 py-2 text-agentx-body text-agentx-sheet-field-ink"
				/>
			</label>
			<div className="flex items-center justify-between gap-3">
				<span className="text-agentx-caption text-agentx-sheet-muted">
					{sprintf(
						// translators: %1$d is how many image generations the site has left today, %2$d how many it gets a day. Shown in the AI Agent's image sheet.
						__('Image credits left today: %1$d of %2$d', 'extendify-local'),
						remaining,
						total,
					)}
				</span>
				{/* Stays focusable while it works, so focus doesn't fall out of the sheet. */}
				<button
					type="button"
					onClick={start}
					aria-disabled={blocked}
					className={SHEET_PRIMARY}
				>
					{working
						? // translators: Shown on the AI Agent's Generate button while an image is being made.
							__('Generating…', 'extendify-local')
						: // translators: Button in the AI Agent's image sheet that makes an image from the description.
							__('Generate', 'extendify-local')}
				</button>
			</div>
			{problem && (
				<p role="alert" className="m-0 text-agentx-body text-agentx-alert">
					{problem}
				</p>
			)}
			<output className="sr-only">
				{working
					? // translators: Read out by screen readers while the AI Agent generates an image.
						__('Generating image…', 'extendify-local')
					: made[0] &&
						made[0].id === pickedId &&
						// translators: Read out by screen readers when a generated image is ready; it's picked for Use image.
						__('Image ready and picked.', 'extendify-local')}
			</output>
			{(made.length > 0 || working) && (
				<ImageGrid
					images={made}
					pending={working ? 1 : 0}
					pickedId={pickedId}
					onPick={onPick}
				/>
			)}
			{before.shown.images?.length > 0 && (
				<section
					aria-labelledby={`${id}-before`}
					className="flex flex-col gap-2"
				>
					<h3
						id={`${id}-before`}
						className="m-0 text-agentx-caption font-medium text-agentx-sheet-muted"
					>
						{
							// translators: Heading over the AI-generated images already in the site's media library, in the AI Agent's image sheet.
							__('Previously generated', 'extendify-local')
						}
					</h3>
					<ImageGrid
						images={before.shown.images}
						pickedId={pickedId}
						focusAt={before.focusAt}
						onPick={onPick}
					/>
					{before.shown.more && (
						<LoadMore loading={before.loading} onClick={before.more} />
					)}
				</section>
			)}
		</div>
	);
};
