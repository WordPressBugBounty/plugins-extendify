import { SHEET_SOURCES } from '@agentx/chat/ImageSheet';
import { sampleImages } from '@agentx/demo/sample-images';
import { noteChange } from '@agentx/lib/card-changes';
import { foundPhotos } from '@agentx/lib/find-photo';
import { useGeneration } from '@agentx/lib/generation';
import { countPick } from '@agentx/lib/image-sources';
import {
	addBlockImage,
	attachmentFor,
	blockImage,
	currentImage,
	replaceBlockImage,
	saveImage,
	squared,
	uploadImage,
} from '@agentx/lib/site-images';
import { useSavedImageStore } from '@agentx/state/saved-image';
import { flushSync, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const failure = (error) => {
	if (error?.reason === 'shared') {
		return __(
			'This image is in a synced pattern, so it changes everywhere the pattern is used. Choose the image again to go ahead.',
			'extendify-local',
		);
	}
	return error?.reason === 'upload'
		? // translators: Shown in the AI Agent's chat when uploading the user's logo or icon failed.
			__("Couldn't upload it. Please try again.", 'extendify-local')
		: // translators: Shown in the AI Agent's chat when saving the user's logo or icon failed.
			__("Couldn't save it. Please try again.", 'extendify-local');
};

const changedText = (which, place) =>
	place?.position === 'replace'
		? // translators: Shown in the AI Agent's chat once the image the user picked took the place of a part of their page, which is gone.
			__('Put the image in its place', 'extendify-local')
		: place
			? // translators: Shown in the AI Agent's chat once a new image the user picked is on their page.
				__('Added the image', 'extendify-local')
			: {
					icon: __('Changed your site icon', 'extendify-local'),
					logo: __('Changed your logo', 'extendify-local'),
					block: __('Replaced the image', 'extendify-local'),
				}[which];

// The step keeps only what its thumbnail needs, since the history goes with every message.
export const shownOf = ({ url, thumb, name }) => ({
	url,
	...(thumb && { thumb }),
	...(name && { name }),
});

// A block's picture goes into the draft; a logo or icon saves live.
const saveTo = async (which, block, image, confirmed, place) => {
	if (place) {
		const result = await addBlockImage(place, image);
		if (result.refused) throw { reason: 'refused' };
		return result;
	}
	if (!block) return saveImage(which, image);
	const result = await replaceBlockImage(block, image, { confirmed });
	if (result.confirm) throw { reason: 'shared' };
	if (result.refused) throw { reason: 'refused' };
	return result;
};

// A card shown again, like after the chat redraws, mustn't make another picture or save the logo twice.
const started = new Set();

export const useImagePick = (part, { floating, onSaved } = {}) => {
	const block = part.input?.target === 'block' ? part.input.block : null;
	// A new picture has a place to go and no image yet.
	const place = part.input?.target === 'new' ? part.input.place : null;
	const which =
		block || place ? 'block' : part.input?.target === 'icon' ? 'icon' : 'logo';
	const tabs = SHEET_SOURCES.filter((source) =>
		part.input?.sources?.includes(source),
	);
	// A drop zone takes uploads itself, so its buttons open the other tabs.
	const sources = tabs.filter((source) => source !== 'upload');
	const demo = Boolean(part.demoState);
	const [current, setCurrent] = useState();
	const [busy, setBusy] = useState(part.demoState === 'processing');
	const [problem, setProblem] = useState('');
	// The user was told the image is in a synced pattern, so the next choice goes ahead.
	const [shared, setShared] = useState(false);
	const [sheet, setSheet] = useState(
		SHEET_SOURCES.includes(part.demoState) ? part.demoState : null,
	);
	// Each opening is a fresh sheet, even one opened while the last slides away.
	const [opening, setOpening] = useState(0);
	const [picked, setPicked] = useState(null);
	// Drawn beside the floating column, so the sheet rises from the chat box like every other.
	const [layer, setLayer] = useState(null);
	const generation = useGeneration({
		samples: part.demoState === 'generate' ? sampleImages('generate', 2) : [],
		onMade: (image) => setPicked({ source: 'generate', image }),
	});
	const zone = useRef(null);
	const openers = useRef({});
	const opener = useRef(null);

	useEffect(() => {
		if (place) {
			setCurrent(null);
			return;
		}
		(block ? blockImage(block) : currentImage(which)).then(setCurrent, () =>
			setCurrent(null),
		);
	}, [which, block?.id]);

	useEffect(() => {
		setLayer(floating?.current?.parentElement ?? null);
	}, [floating]);

	const closeSheet = () => {
		opener.current?.focus();
		setProblem('');
		setPicked(null);
		setSheet(null);
	};

	const save = async (attach) => {
		setBusy(true);
		setProblem('');
		try {
			const image = await attach().catch(() => {
				throw { reason: 'upload' };
			});
			const saved = await saveTo(which, block, image, shared, place);
			setCurrent(image);
			noteChange({
				kind: which,
				done: changedText(which, place),
				image: shownOf(image),
			});
			useSavedImageStore.setState({ image });
			// Its opener is disabled while busy, and a disabled button won't take focus back.
			flushSync(() => setBusy(false));
			if (sheet) closeSheet();
			await onSaved?.(image, saved?.moved);
		} catch (error) {
			if (error?.reason === 'shared') setShared(true);
			setProblem(failure(error));
			setBusy(false);
		}
	};

	const take = (file) => {
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			setProblem(failure({ reason: 'upload' }));
			return;
		}
		return save(async () =>
			uploadImage(which === 'icon' ? await squared(file) : file),
		);
	};

	const use = (chosen) =>
		save(async () => {
			const image = await attachmentFor(which, chosen.image);
			countPick(chosen);
			return image;
		});

	const openSheet = (source) => {
		opener.current = openers.current[source];
		setProblem('');
		setPicked(null);
		setOpening((was) => was + 1);
		setSheet(source);
	};

	// Typed words make a logo or icon with AI, and search the stock photos for a page's picture.
	const [seed, setSeed] = useState('');
	const openWith = (text) => {
		const makes = which !== 'block' && tabs.includes('generate');
		if (makes || !tabs.includes('stock')) {
			generation.setPrompt(text);
			openSheet('generate');
			return;
		}
		setSeed(text);
		openSheet('stock');
	};

	// A page's picture takes the first photo the image library finds; with none, the sheet opens on the words.
	const fromWords = async (text) => {
		if (which !== 'block' || demo) return openWith(text);
		setBusy(true);
		const [url] = await foundPhotos(text, 'agentx-image-card');
		setBusy(false);
		if (!url) return openWith(text);
		return save(() => attachmentFor(which, { url, name: text }));
	};

	useEffect(() => {
		if (problem && !sheet) zone.current?.focus();
	}, [problem, sheet]);

	// What the message already said opens the card, so it isn't asked again.
	useEffect(() => {
		const { tab, search, prompt, make, use: picks } = part.input ?? {};
		const first = !started.has(part.toolCallId);
		started.add(part.toolCallId);
		if (picks === 'logo' && which === 'icon') {
			if (!first || demo) return;
			currentImage('logo').then(
				(logo) => logo?.url && save(() => attachmentFor('icon', logo)),
				() => {},
			);
			return;
		}
		if (tab === 'library' && tabs.includes('library')) {
			openSheet('library');
			return;
		}
		if (tab === 'stock' && tabs.includes('stock')) {
			setSeed(typeof search === 'string' ? search.trim() : '');
			openSheet('stock');
			return;
		}
		if (tab !== 'generate' || !tabs.includes('generate')) return;
		const words = typeof prompt === 'string' ? prompt.trim() : '';
		if (words) generation.setPrompt(words);
		openSheet('generate');
		if (make && words && first && !demo) generation.generate(words);
	}, [part.toolCallId]);

	return {
		which,
		block,
		sources,
		tabs,
		demo,
		current,
		busy,
		problem,
		sheet,
		take,
		openSheet,
		fromWords,
		zone,
		openerRef: (source, node) => {
			openers.current[source] = node;
		},
		layer,
		sheetKey: `sheet-${opening}`,
		sheetProps: {
			which,
			sources: tabs,
			tab: sheet,
			onTab: setSheet,
			current,
			generation,
			picked,
			onPick: setPicked,
			busy,
			problem,
			onUse: use,
			onFile: take,
			onClose: () => closeSheet(),
			anchor: floating,
			seed,
			demo,
		},
	};
};
