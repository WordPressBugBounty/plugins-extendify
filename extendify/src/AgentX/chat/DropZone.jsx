import { SOURCE_ICONS, sourceLabel } from '@agentx/chat/ImageSheet';
import { ImageThumb } from '@agentx/chat/ImageThumb';
import { PRESS } from '@agentx/chat/styles';
import { useLayoutEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { globe, Icon, info } from '@wordpress/icons';

// A wrapped row leaves one button alone under the others, so they go one per line instead.
// Labels differ by language, so it measures the buttons' width instead of a breakpoint.
const useOneLine = (ref) => {
	const [oneLine, setOneLine] = useState(true);
	const needs = useRef(0);
	useLayoutEffect(() => {
		const row = ref.current;
		if (!row) return;
		const measure = () => {
			if (row.scrollWidth > row.clientWidth) needs.current = row.scrollWidth;
			setOneLine(row.clientWidth >= needs.current);
		};
		measure();
		const observer = new ResizeObserver(measure);
		// A label widens as its web font loads while the row keeps its size.
		for (const element of [row, ...row.children]) observer.observe(element);
		return () => observer.disconnect();
	}, []);
	return oneLine;
};

// A site icon at its real size is too small to judge, so it's drawn large.
const IconInTab = ({ image, loading }) => (
	<div className="relative size-30 overflow-hidden rounded-agentx-control border border-solid border-agentx-card-border bg-agentx-card">
		<svg
			viewBox="0 0 100 100"
			aria-hidden="true"
			className="absolute inset-0 size-full"
		>
			<g transform="translate(5 5)">
				<path
					d="M24 130V40Q24 30 34 30H130V130Z"
					className="fill-agentx-card stroke-agentx-ink/25"
				/>
				<path
					d="M24.5 84V40Q24.5 30.5 34 30.5H130V84Z"
					className="fill-agentx-ink/70"
				/>
				<path d="M38 84L52 50H130V84Z" className="fill-agentx-card" />
				<rect
					x="66"
					y="63"
					width="46"
					height="8"
					rx="4"
					className="fill-agentx-ink/15"
				/>
				<g className="fill-agentx-muted">
					<path
						transform="translate(26 86.4)"
						d="M20 11.2H6.8l3.7-3.7-1-1L3.9 12l5.6 5.5 1-1-3.7-3.7H20z"
					/>
					<path
						transform="translate(48 86.4)"
						d="m14.5 6.5-1 1 3.7 3.7H4v1.6h13.2l-3.7 3.7 1 1 5.6-5.5z"
					/>
					<path
						transform="translate(72 86.4)"
						d="M12 4L4 7.9V20h16V7.9L12 4zm6.5 14.5H14V13h-4v5.5H5.5V8.8L12 5.7l6.5 3.1v9.7z"
					/>
				</g>
			</g>
		</svg>
		{image || loading ? (
			<ImageThumb
				image={image}
				loading={loading}
				className="absolute start-4 top-4 size-[66px] ring-2 ring-agentx-card"
				// translators: Names the site's current icon, shown beside the AI Agent's drop zone.
				alt={__('Your icon now', 'extendify-local')}
			/>
		) : (
			// A browser shows a plain globe for a site with no icon.
			<span className="absolute start-4 top-4 flex size-[66px] items-center justify-center rounded-agentx-control border border-dashed border-agentx-ink/25 bg-agentx-card ring-2 ring-agentx-card">
				<Icon icon={globe} size={36} className="fill-agentx-ink/40" />
				<span className="sr-only">
					{
						// translators: Read out by screen readers beside the AI Agent's drop zone when the site has no site icon yet.
						__('No site icon yet', 'extendify-local')
					}
				</span>
			</span>
		)}
	</div>
);

export const DropZone = ({
	which,
	current,
	busy,
	onFile,
	zoneRef,
	sources = [],
	onOpen,
	openerRef,
}) => {
	const file = useRef(null);
	const row = useRef(null);
	const [over, setOver] = useState(false);
	const oneLine = useOneLine(row);
	return (
		<>
			<div className="flex items-stretch gap-3">
				<div
					className={`flex shrink-0 items-center ${which === 'icon' ? 'w-30' : 'w-1/4'}`}
				>
					{which === 'icon' ? (
						<IconInTab image={current} loading={current === undefined} />
					) : (
						<ImageThumb
							image={current}
							loading={current === undefined}
							className="aspect-square w-full"
							alt={
								{
									// translators: Names the site's current logo, shown beside the AI Agent's drop zone.
									logo: __('Your logo now', 'extendify-local'),
									// translators: Names the image the user picked on their page, shown beside the AI Agent's drop zone for replacing it.
									block: __('The image now', 'extendify-local'),
								}[which]
							}
						/>
					)}
				</div>
				<button
					ref={zoneRef}
					type="button"
					disabled={busy}
					onClick={() => file.current?.click()}
					onDragOver={(event) => {
						event.preventDefault();
						setOver(true);
					}}
					onDragLeave={(event) => {
						// Moving onto the zone's own text fires a leave too.
						if (event.currentTarget.contains(event.relatedTarget)) return;
						setOver(false);
					}}
					onDrop={(event) => {
						event.preventDefault();
						setOver(false);
						onFile(event.dataTransfer.files?.[0]);
					}}
					className={`agentx-focus flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-agentx-control border-2 border-dashed bg-transparent p-4 text-center text-agentx-guide-ink transition-colors enabled:hover:bg-agentx-drop-zone-hover enabled:active:border-agentx-drop-zone-active disabled:opacity-[var(--agentx-disabled-opacity,60%)] ${
						over
							? 'border-agentx-drop-zone-active bg-agentx-drop-zone-hover'
							: 'border-agentx-drop-zone-border'
					}`}
				>
					{busy ? (
						// translators: Shown in the AI Agent's small drop zone while the user's logo or icon uploads and saves. Keep it very short.
						__('Uploading…', 'extendify-local')
					) : (
						<>
							<span className="font-agentx-button">
								{
									// translators: Heading inside the AI Agent's small drop zone for a new logo or site icon. Keep it very short.
									__('Drop an image here', 'extendify-local')
								}
							</span>
							<span className="text-agentx-caption text-agentx-guide-muted">
								{
									// translators: Second line inside the AI Agent's small drop zone for a new logo or site icon. Keep it very short.
									__('or click to choose one', 'extendify-local')
								}
							</span>
						</>
					)}
				</button>
				<input
					ref={file}
					type="file"
					accept="image/*"
					aria-label={
						// translators: Screen reader name for the file field behind the AI Agent's logo or icon drop zone.
						__('Image to upload', 'extendify-local')
					}
					onChange={(event) => {
						const picked = event.target.files?.[0];
						// The same file again, after a failed try, would fire no change.
						event.target.value = '';
						onFile(picked);
					}}
					className="sr-only"
					tabIndex={-1}
				/>
			</div>
			{sources.length > 0 && (
				<div ref={row} className={`flex gap-2 ${oneLine ? '' : 'flex-col'}`}>
					{sources.map((source) => (
						<button
							key={source}
							ref={(node) => openerRef?.(source, node)}
							type="button"
							aria-haspopup="dialog"
							disabled={busy}
							onClick={() => onOpen(source)}
							className={`agentx-focus inline-flex items-center gap-1.5 rounded-agentx-control border border-agentx-button-border bg-agentx-button py-[5px] ps-2 pe-3 text-start font-agentx-button text-agentx-button-ink ${PRESS} enabled:hover:bg-agentx-button-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)] ${oneLine ? 'shrink-0 whitespace-nowrap' : ''}`}
						>
							<Icon
								icon={SOURCE_ICONS[source]}
								size={16}
								className="shrink-0 fill-current"
							/>
							{sourceLabel(source)}
						</button>
					))}
				</div>
			)}
			{which === 'icon' && (
				<p className="m-0 flex items-center gap-1.5 text-agentx-caption text-agentx-guide-muted">
					<Icon icon={info} size={16} className="shrink-0 fill-current" />
					{
						// translators: A note under the AI Agent's drop zone for a site icon; an image that isn't square is cropped to its center. Keep it very short.
						__('Site icons must be square', 'extendify-local')
					}
				</p>
			)}
		</>
	);
};
