import { DropZone } from '@agentx/chat/DropZone';
import { markDone } from '@agentx/lib/guide';
import { showTitle, useHeaderLogo } from '@agentx/lib/logo-title';
import {
	currentImage,
	saveImage,
	squared,
	uploadImage,
} from '@agentx/lib/site-images';
import { useGuideStore } from '@agentx/state/guide';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const OPENERS = ['library', 'stock', 'generate'];

const TitleToggle = () => {
	const logo = useHeaderLogo();
	const [wanted, setWanted] = useState(null);
	if (!logo) return null;

	const toggle = async (shown) => {
		setWanted(shown);
		await showTitle(logo.id, shown).catch(() => null);
		setWanted(null);
	};

	return (
		<label className="flex cursor-pointer items-center gap-2 font-agentx-button">
			<input
				type="checkbox"
				checked={wanted ?? logo.shown}
				disabled={wanted !== null}
				onChange={(event) => toggle(event.target.checked)}
				className="agentx-focus m-0 size-4 shrink-0 accent-agentx-checkbox"
			/>
			{
				// translators: A checkbox in the AI Agent's Site Guide step for adding a logo; unticked, the site's name no longer shows beside the logo in the header.
				__('Show site title next to logo', 'extendify-local')
			}
		</label>
	);
};

export const ImageStep = ({ which }) => {
	const [current, setCurrent] = useState();
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState(false);

	useEffect(() => {
		currentImage(which).then(setCurrent, () => setCurrent(null));
	}, [which]);

	// The step stays open on the new image; only Next moves on.
	const saved = (image) => {
		setCurrent(image);
		markDone(which);
	};

	const take = async (picked) => {
		if (!picked) return;
		setProblem(false);
		if (!picked.type.startsWith('image/')) return setProblem(true);
		setBusy(true);
		try {
			const image = await uploadImage(
				which === 'icon' ? await squared(picked) : picked,
			);
			await saveImage(which, image);
			saved(image);
		} catch {
			setProblem(true);
		}
		setBusy(false);
	};

	return (
		<div className="flex flex-col gap-2 text-sm">
			<DropZone
				which={which}
				current={current}
				busy={busy}
				onFile={take}
				sources={OPENERS}
				onOpen={(source) =>
					useGuideStore.setState({
						sheet: { which, tab: source, onDone: saved },
					})
				}
			/>
			{which === 'logo' && <TitleToggle />}
			{problem && (
				<p role="alert" className="m-0 text-agentx-alert">
					{
						// translators: Shown in the AI Agent's Site Guide when uploading or saving the user's logo or site icon failed.
						__("Couldn't save that image. Please try again.", 'extendify-local')
					}
				</p>
			)}
		</div>
	);
};
