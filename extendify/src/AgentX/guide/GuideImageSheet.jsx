import { ImageSheet } from '@agentx/chat/ImageSheet';
import { useGeneration } from '@agentx/lib/generation';
import { countPick } from '@agentx/lib/image-sources';
import {
	attachmentFor,
	currentImage,
	saveImage,
	uploadImage,
} from '@agentx/lib/site-images';
import { useGuideStore } from '@agentx/state/guide';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const GuideImageSheet = ({ chat, anchor }) => {
	// Kept from the opening, since the store clears it while the sheet slides away.
	const [
		{
			which,
			tab: opened,
			sources = ['library', 'stock', 'generate'],
			current: given,
			opener,
			onImage,
			onDone,
		},
	] = useState(() => useGuideStore.getState().sheet);
	const [tab, setTab] = useState(opened);
	const [current, setCurrent] = useState();
	const [picked, setPicked] = useState(null);
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState('');
	const generation = useGeneration({
		samples: [],
		onMade: (image) => setPicked({ source: 'generate', image }),
	});

	useEffect(() => {
		// No site setting holds a product photo, so the step that opens the sheet passes it.
		if (onImage) return setCurrent(given ?? null);
		currentImage(which).then(setCurrent, () => setCurrent(null));
	}, [which]);

	// The sheet puts the picked logo back itself, whatever closed it.
	const close = (saved) => {
		useGuideStore.setState({ sheet: null });
		if (!saved) opener?.focus();
	};

	const keep = async (attach) => {
		setBusy(true);
		setProblem('');
		try {
			const image = await attach();
			if (onImage) onImage(image);
			else await saveImage(which, image);
			close(true);
			onDone?.(image);
		} catch {
			setProblem(
				// translators: Shown in the AI Agent's image sheet when saving the logo or site icon picked from the Site Guide failed.
				__("Couldn't save it. Please try again.", 'extendify-local'),
			);
			setBusy(false);
		}
	};

	const use = (chosen) =>
		keep(async () => {
			const image = await attachmentFor(which, chosen.image);
			countPick(chosen);
			return image;
		});

	const take = (file) => {
		if (file?.type.startsWith('image/')) return keep(() => uploadImage(file));
		if (file) {
			setProblem(
				// translators: Shown in the AI Agent's image sheet when the file the user chose to upload isn't an image.
				__(
					'That file isn’t an image. Please choose another.',
					'extendify-local',
				),
			);
		}
	};

	return (
		<ImageSheet
			which={which}
			sources={sources}
			tab={tab}
			onTab={setTab}
			current={current}
			generation={generation}
			picked={picked}
			onPick={setPicked}
			busy={busy}
			problem={problem}
			onUse={use}
			onFile={take}
			onClose={() => close(false)}
			chat={chat}
			anchor={anchor}
		/>
	);
};
