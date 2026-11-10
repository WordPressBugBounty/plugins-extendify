import { GeneratedImages } from '@agentx/chat/GeneratedImages';
import { LibraryImages } from '@agentx/chat/LibraryImages';
import { StockImages } from '@agentx/chat/StockImages';
import { OUTLINED, SHEET_CLOSE, SHEET_PRIMARY } from '@agentx/chat/styles';
import { sheetKeys, tabKeys } from '@agentx/lib/keyboard';
import { showLogo } from '@agentx/lib/site-images';
import { Tooltip } from '@agentx/Tooltip';
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon, media, search, upload } from '@wordpress/icons';
import { Path, SVG } from '@wordpress/primitives';
import { motion, useDragControls, useReducedMotion } from 'motion/react';

const sparkle = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zm6 11l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14z" />
	</SVG>
);

export const SHEET_SOURCES = ['upload', 'library', 'stock', 'generate'];

export const SOURCE_ICONS = {
	upload,
	library: media,
	stock: search,
	generate: sparkle,
};

export const sourceLabel = (source) =>
	({
		// translators: Opens the AI Agent's upload tab, for picking an image from the user's own computer.
		upload: __('Upload', 'extendify-local'),
		// translators: Opens the AI Agent's media library tab, for picking a logo or site icon the site already has.
		library: __('Media library', 'extendify-local'),
		// translators: Opens the AI Agent's stock photos tab, for picking a logo or site icon from free photos.
		stock: __('Stock photos', 'extendify-local'),
		// translators: Opens the AI Agent's tab for generating a logo or site icon with AI.
		generate: __('Generate', 'extendify-local'),
	})[source];

const UploadImage = ({ onFile, busy }) => {
	const file = useRef(null);
	const [over, setOver] = useState(false);
	return (
		<section
			aria-label={
				// translators: Screen reader name for the AI Agent's upload tab, where the user drops or chooses an image from their computer.
				__('Upload an image', 'extendify-local')
			}
			onDragOver={(event) => {
				event.preventDefault();
				setOver(true);
			}}
			onDragLeave={(event) => {
				if (event.currentTarget.contains(event.relatedTarget)) return;
				setOver(false);
			}}
			onDrop={(event) => {
				event.preventDefault();
				setOver(false);
				onFile(event.dataTransfer.files?.[0]);
			}}
			className={`flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-agentx-control border-2 border-dashed p-6 text-center text-agentx-body text-agentx-sheet-upload-ink ${over ? 'border-agentx-sheet-upload-active' : 'border-agentx-sheet-upload-border'}`}
		>
			<Icon icon={upload} size={24} className="fill-current" />
			<p className="m-0">
				{busy
					? // translators: Shown on the AI Agent's upload tab while the image the user chose uploads.
						__('Uploading…', 'extendify-local')
					: // translators: On the AI Agent's upload tab, where the user drops an image from their computer.
						__('Drop an image here', 'extendify-local')}
			</p>
			<button
				type="button"
				disabled={busy}
				onClick={() => file.current?.click()}
				className={OUTLINED}
			>
				{
					// translators: Button on the AI Agent's upload tab that opens the file picker on the user's computer.
					__('Choose a file', 'extendify-local')
				}
			</button>
			<input
				ref={file}
				type="file"
				accept="image/*"
				aria-label={
					// translators: Screen reader name for the file field on the AI Agent's upload tab.
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
		</section>
	);
};

const PANELS = {
	upload: UploadImage,
	library: LibraryImages,
	stock: StockImages,
	generate: GeneratedImages,
};

const SLIDE = { type: 'spring', stiffness: 420, damping: 40 };

// Three quarters of the chat, but never past its top; a click above it closes it.
// Measured after the commit, since a sheet open from the start mounts before its parents' refs are set.
const useRoom = (chat, anchor) => {
	const [room, setRoom] = useState(0);
	useEffect(() => {
		// Inside the image card there's no sheet to fit.
		if (!chat?.current || !anchor?.current) return;
		const measure = () =>
			setRoom(
				anchor.current.getBoundingClientRect().bottom -
					chat.current.getBoundingClientRect().top,
			);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(chat.current);
		return () => observer.disconnect();
	}, [chat, anchor]);
	return {
		room,
		height: Math.min((chat?.current?.clientHeight ?? 0) * 0.75, room - 8),
	};
};

export const ImageSheet = ({
	which,
	sources,
	tab,
	onTab,
	current,
	generation,
	picked,
	onPick,
	busy,
	problem,
	onUse,
	onFile,
	onClose,
	chat,
	anchor,
	seed,
	demo,
	inline = false,
}) => {
	const id = useId();
	const sheet = useRef(null);
	const tabs = useRef({});
	const { room, height } = useRoom(chat, anchor);
	// A pick only counts on its own tab, so Use image never saves one out of sight.
	const ready = picked?.source === tab && !busy;
	const reduceMotion = useReducedMotion();
	const drag = useDragControls();
	const Panel = PANELS[tab];
	const title = {
		// translators: Heading of the AI Agent's sheet for picking a new site icon.
		icon: __('Choose a site icon', 'extendify-local'),
		// translators: Heading of the AI Agent's sheet for picking a new logo.
		logo: __('Choose a logo', 'extendify-local'),
		// translators: Heading of the AI Agent's sheet for picking an image to replace one on the user's web page.
		block: __('Choose an image', 'extendify-local'),
	}[which];

	useEffect(() => {
		// A demo state leaves focus on the dev tool, where the arrow keys step through the states.
		if (demo) return;
		// The sheet starts below its clip, which a plain focus would scroll into view.
		tabs.current[tab]?.focus({ preventScroll: true });
		// A plan's card sticks to the log's foot and would cover the sheet's end.
		const log = inline && sheet.current?.closest('[role="log"]');
		if (log) log.scrollTop = log.scrollHeight;
	}, []);

	// The site wears the picked logo while the sheet is open, so they see it where it goes.
	const showing = useRef(false);
	const used = useRef(false);
	useEffect(() => {
		if (which !== 'logo' || !picked || demo) return;
		showing.current = true;
		showLogo(picked.image);
	}, [which, picked, demo]);
	// Gone without Use image, the site shows its own logo again: the instant repaint
	// reads as the change having happened, and closing leaves it on the site.
	// On unmount, so a sheet closed any way at all puts it back, not only the close button's.
	useEffect(
		() => () => {
			if (showing.current && !used.current) showLogo(null);
		},
		[],
	);
	// A failed save leaves the sheet open, so the preview is still only a preview.
	useEffect(() => {
		if (problem) used.current = false;
	}, [problem]);

	const close = () => !busy && onClose();

	const onKeyDown = (event) => sheetKeys(event, sheet.current, close);

	// Inside the image card in the chat, which draws its frame: no scrim, drag or focus trap.
	if (inline) {
		return (
			<section
				ref={sheet}
				aria-label={title}
				tabIndex={-1}
				onKeyDown={(event) => event.key === 'Escape' && close()}
				className="flex h-[26rem] max-h-[70vh] shrink-0 flex-col pt-3 outline-none"
			>
				<div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2">
					<h2 className="m-0 text-agentx-sheet-title font-agentx-sheet-title text-agentx-sheet-title-ink">
						{title}
					</h2>
					<Tooltip text={__('Close', 'extendify-local')} className="-me-3">
						<button
							type="button"
							onClick={close}
							disabled={busy}
							aria-label={
								// translators: Closes the AI Agent's sheet for picking a logo or site icon, without picking one.
								__('Close', 'extendify-local')
							}
							className={SHEET_CLOSE}
						>
							<Icon icon={closeSmall} size={24} className="fill-current" />
						</button>
					</Tooltip>
				</div>
				<div
					role="tablist"
					aria-label={title}
					onKeyDown={(event) =>
						tabKeys(event, sources, tab, onTab, tabs.current)
					}
					className="flex shrink-0 gap-1 border-b border-agentx-sheet-line px-4"
				>
					{sources.map((source) => (
						<button
							key={source}
							ref={(node) => {
								tabs.current[source] = node;
							}}
							type="button"
							role="tab"
							id={`${id}-${source}`}
							aria-selected={source === tab}
							aria-controls={`${id}-panel`}
							tabIndex={source === tab ? 0 : -1}
							onClick={() => onTab(source)}
							className={`agentx-focus-inset -mb-px flex-1 rounded-t-agentx-control border-0 border-b-2 border-solid bg-transparent px-1 py-2 text-agentx-body font-agentx-button whitespace-nowrap transition-colors hover:bg-agentx-sheet-tab-hover active:bg-agentx-sheet-tab-hover ${
								source === tab
									? 'border-agentx-sheet-tab-indicator text-agentx-sheet-tab-selected-ink'
									: 'border-transparent text-agentx-sheet-tab-ink hover:text-agentx-sheet-tab-selected-ink'
							}`}
						>
							{sourceLabel(source)}
						</button>
					))}
				</div>
				<div
					role="tabpanel"
					id={`${id}-panel`}
					aria-labelledby={`${id}-${tab}`}
					className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
				>
					<Panel
						which={which}
						current={current}
						generation={generation}
						pickedId={picked?.source === tab ? picked.image.id : null}
						onPick={(image) => onPick({ source: tab, image })}
						onFile={onFile}
						seed={seed}
						busy={busy}
						demo={demo}
					/>
				</div>
				{/* An upload saves as it lands, so its tab has nothing to use and shows only a failure. */}
				{(tab !== 'upload' || problem) && (
					<div className="flex shrink-0 items-center gap-3 border-t border-agentx-sheet-line px-4 py-3">
						<p
							role="alert"
							className="m-0 flex-1 text-agentx-body text-agentx-alert"
						>
							{problem}
						</p>
						{which === 'logo' && picked && !problem && (
							<p className="m-0 flex-1 text-agentx-caption text-agentx-muted">
								{
									// translators: Under the AI Agent's logo picker, where the site already shows the logo they picked. Says it is only a preview until they press Use image.
									__(
										'Showing on your site as a preview, until you use it.',
										'extendify-local',
									)
								}
							</p>
						)}
						{/* Stays focusable while it saves, so a failed save leaves focus in the sheet. */}
						{tab !== 'upload' && (
							<button
								type="button"
								aria-disabled={!ready}
								onClick={() => {
									if (!ready) return;
									used.current = true;
									onUse(picked);
								}}
								className={SHEET_PRIMARY}
							>
								{busy
									? // translators: Shown on the AI Agent's Use image button while the picked logo or icon saves.
										__('Saving…', 'extendify-local')
									: // translators: Button in the AI Agent's image sheet that saves the picked image as the logo or site icon.
										__('Use image', 'extendify-local')}
							</button>
						)}
					</div>
				)}
			</section>
		);
	}

	return (
		<>
			<div
				aria-hidden="true"
				onClick={close}
				style={{ height: room }}
				className="absolute inset-x-0 bottom-0 z-10 bg-agentx-sheet-scrim"
			/>
			{/* Clips only the bottom edge, so the sheet slides up out of the drop zone with its shadow showing. */}
			<div
				style={{ height }}
				className="absolute inset-x-0 bottom-0 z-20 [clip-path:inset(-3rem_-3rem_0_-3rem)]"
			>
				<motion.div
					ref={sheet}
					role="dialog"
					aria-modal="true"
					aria-label={title}
					// A click on its heading or empty space keeps focus, and with it Escape, in the sheet.
					tabIndex={-1}
					onKeyDown={onKeyDown}
					initial={{ y: '100%' }}
					animate={{ y: 0 }}
					exit={{ y: '100%' }}
					transition={reduceMotion ? { duration: 0 } : SLIDE}
					drag={busy ? false : 'y'}
					dragControls={drag}
					dragListener={false}
					dragConstraints={{ top: 0, bottom: 0 }}
					dragElastic={{ top: 0, bottom: 0.8 }}
					onDragEnd={(_, { offset, velocity }) =>
						(offset.y > 80 || velocity.y > 500) && close()
					}
					className="flex h-full flex-col rounded-t-agentx-sheet bg-agentx-sheet text-agentx-sheet-ink shadow-(--agentx-sheet-shadow) ring-1 ring-inset ring-agentx-sheet-border outline-none"
				>
					<div
						aria-hidden="true"
						onPointerDown={(event) => drag.start(event)}
						className="group flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 active:cursor-grabbing"
					>
						<span className="h-1 w-9 rounded-full bg-agentx-sheet-handle transition-colors group-hover:bg-agentx-sheet-handle-hover" />
					</div>
					<div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2">
						<h2 className="m-0 text-agentx-sheet-title font-agentx-sheet-title text-agentx-sheet-title-ink">
							{title}
						</h2>
						<Tooltip text={__('Close', 'extendify-local')} className="-me-3">
							<button
								type="button"
								onClick={close}
								disabled={busy}
								aria-label={
									// translators: Closes the AI Agent's sheet for picking a logo or site icon, without picking one.
									__('Close', 'extendify-local')
								}
								className={SHEET_CLOSE}
							>
								<Icon icon={closeSmall} size={24} className="fill-current" />
							</button>
						</Tooltip>
					</div>
					<div
						role="tablist"
						aria-label={title}
						onKeyDown={(event) =>
							tabKeys(event, sources, tab, onTab, tabs.current)
						}
						className="flex shrink-0 gap-1 border-b border-agentx-sheet-line px-4"
					>
						{sources.map((source) => (
							<button
								key={source}
								ref={(node) => {
									tabs.current[source] = node;
								}}
								type="button"
								role="tab"
								id={`${id}-${source}`}
								aria-selected={source === tab}
								aria-controls={`${id}-panel`}
								tabIndex={source === tab ? 0 : -1}
								onClick={() => onTab(source)}
								className={`agentx-focus-inset -mb-px flex-1 rounded-t-agentx-control border-0 border-b-2 border-solid bg-transparent px-1 py-2 text-agentx-body font-agentx-button whitespace-nowrap transition-colors hover:bg-agentx-sheet-tab-hover active:bg-agentx-sheet-tab-hover ${
									source === tab
										? 'border-agentx-sheet-tab-indicator text-agentx-sheet-tab-selected-ink'
										: 'border-transparent text-agentx-sheet-tab-ink hover:text-agentx-sheet-tab-selected-ink'
								}`}
							>
								{sourceLabel(source)}
							</button>
						))}
					</div>
					<div
						role="tabpanel"
						id={`${id}-panel`}
						aria-labelledby={`${id}-${tab}`}
						className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
					>
						<Panel
							which={which}
							current={current}
							generation={generation}
							pickedId={picked?.source === tab ? picked.image.id : null}
							onPick={(image) => onPick({ source: tab, image })}
							onFile={onFile}
							seed={seed}
							busy={busy}
							demo={demo}
						/>
					</div>
					{/* An upload saves as it lands, so its tab has nothing to use and shows only a failure. */}
					{(tab !== 'upload' || problem) && (
						<div className="flex shrink-0 items-center gap-3 border-t border-agentx-sheet-line px-4 py-3">
							<p
								role="alert"
								className="m-0 flex-1 text-agentx-body text-agentx-alert"
							>
								{problem}
							</p>
							{which === 'logo' && picked && !problem && (
								<p className="m-0 flex-1 text-agentx-caption text-agentx-muted">
									{
										// translators: Under the AI Agent's logo picker, where the site already shows the logo they picked. Says it is only a preview until they press Use image.
										__(
											'Showing on your site as a preview, until you use it.',
											'extendify-local',
										)
									}
								</p>
							)}
							{/* Stays focusable while it saves, so a failed save leaves focus in the sheet. */}
							{tab !== 'upload' && (
								<button
									type="button"
									aria-disabled={!ready}
									onClick={() => {
										if (!ready) return;
										used.current = true;
										onUse(picked);
									}}
									className={SHEET_PRIMARY}
								>
									{busy
										? // translators: Shown on the AI Agent's Use image button while the picked logo or icon saves.
											__('Saving…', 'extendify-local')
										: // translators: Button in the AI Agent's image sheet that saves the picked image as the logo or site icon.
											__('Use image', 'extendify-local')}
								</button>
							)}
						</div>
					)}
				</motion.div>
			</div>
		</>
	);
};
