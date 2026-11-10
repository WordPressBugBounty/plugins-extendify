import {
	ImageSheet,
	SHEET_SOURCES,
	SOURCE_ICONS,
	sourceLabel,
} from '@agentx/chat/ImageSheet';
import { PRESS } from '@agentx/chat/styles';
import { useGeneration } from '@agentx/lib/generation';
import { countPick } from '@agentx/lib/image-sources';
import { attachmentFor, uploadImage } from '@agentx/lib/site-images';
import { Tooltip } from '@agentx/Tooltip';
import { createPortal, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, Icon } from '@wordpress/icons';
import { AnimatePresence } from 'motion/react';

const SOURCE_BUTTON = `agentx-focus flex size-9 shrink-0 items-center justify-center rounded-agentx-control border border-solid border-agentx-field-border bg-agentx-field p-0 text-agentx-ink ${PRESS} enabled:hover:bg-agentx-hover disabled:opacity-[var(--agentx-disabled-opacity,60%)]`;

const REMOVE = `agentx-focus flex size-9 shrink-0 items-center justify-center rounded-agentx-control border-0 bg-transparent p-0 text-agentx-notice-close ${PRESS} enabled:hover:bg-agentx-hover enabled:hover:text-agentx-notice-ink`;

// The url rides along so a folded and reopened form still draws the thumbnail; submit drops it.
const chosen = (image) => [
	{
		id: image.id,
		...(image.name && { alt: image.name }),
		url: image.thumb ?? image.url,
	},
];

export const FormImage = ({ value, onChange, chat, anchor, demo }) => {
	const [sheet, setSheet] = useState(null);
	const [opening, setOpening] = useState(0);
	const [picked, setPicked] = useState(null);
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState('');
	const generation = useGeneration({
		samples: [],
		onMade: (image) => setPicked({ source: 'generate', image }),
	});
	const layer = anchor?.current?.parentElement ?? null;
	const shown = Array.isArray(value) ? value[0] : null;
	// translators: Button on the AI Agent's product form that takes the picked picture back off the product.
	const removeLabel = __('Remove image', 'extendify-local');

	const save = async (attach) => {
		setBusy(true);
		setProblem('');
		try {
			onChange(chosen(await attach()));
			setPicked(null);
			setSheet(null);
		} catch {
			setProblem(
				// translators: Shown on the AI Agent's product form when the image the user picked couldn't be added to the media library.
				__("Couldn't add that image. Please try again.", 'extendify-local'),
			);
		} finally {
			setBusy(false);
		}
	};

	const open = (source) => {
		setProblem('');
		setPicked(null);
		setOpening((was) => was + 1);
		setSheet(source);
	};

	return (
		<div className="flex flex-wrap items-center gap-2">
			{shown?.url && (
				<img
					src={shown.url}
					alt=""
					className="m-0 size-12 shrink-0 rounded-agentx-control border border-solid border-agentx-field-border object-cover"
				/>
			)}
			{SHEET_SOURCES.map((source) => (
				<Tooltip key={source} text={sourceLabel(source)}>
					<button
						type="button"
						aria-label={sourceLabel(source)}
						onClick={() => open(source)}
						className={SOURCE_BUTTON}
					>
						<Icon
							icon={SOURCE_ICONS[source]}
							size={20}
							className="fill-current"
						/>
					</button>
				</Tooltip>
			))}
			{shown && (
				<Tooltip text={removeLabel}>
					<button
						type="button"
						aria-label={removeLabel}
						onClick={() => onChange([])}
						className={REMOVE}
					>
						<Icon icon={closeSmall} size={24} className="fill-current" />
					</button>
				</Tooltip>
			)}
			{problem && !sheet && (
				<p
					role="alert"
					className="m-0 w-full text-agentx-body text-agentx-alert"
				>
					{problem}
				</p>
			)}
			{layer &&
				createPortal(
					<AnimatePresence>
						{sheet && (
							<ImageSheet
								key={`product-image-${opening}`}
								which="block"
								sources={SHEET_SOURCES}
								tab={sheet}
								onTab={setSheet}
								current={shown?.id ? { id: shown.id, url: shown.url } : null}
								generation={generation}
								picked={picked}
								onPick={setPicked}
								busy={busy}
								problem={problem}
								onUse={(choice) =>
									save(async () => {
										const image = await attachmentFor('product', choice.image);
										countPick(choice);
										return image;
									})
								}
								onFile={(file) => file && save(() => uploadImage(file))}
								onClose={() => !busy && setSheet(null)}
								chat={chat}
								anchor={anchor}
								demo={demo}
							/>
						)}
					</AnimatePresence>,
					layer,
				)}
		</div>
	);
};
