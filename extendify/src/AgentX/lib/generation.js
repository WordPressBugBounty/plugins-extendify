import { generateImage } from '@agentx/lib/image-sources';
import { fetchImageCredits } from '@shared/api/DataApi';
import { useImageGenerationStore } from '@shared/state/generate-images';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// A generated image's signed URL expires after 30 minutes, so an older one can't be imported.
const FRESH_FOR = 25 * 60 * 1000;

export const refreshCredits = () =>
	fetchImageCredits().then(
		useImageGenerationStore.getState().updateImageCredits,
		() => {},
	);

// Lives with the drop zone, so switching tabs or closing the sheet never throws away a paid image.
export const useGeneration = ({ samples, onMade }) => {
	const [prompt, setPrompt] = useState('');
	const [made, setMade] = useState(samples);
	const [working, setWorking] = useState(false);
	const [problem, setProblem] = useState('');
	const request = useRef(null);

	useEffect(() => () => request.current?.abort(), []);

	// A button handing over its click event still generates from the box.
	const generate = async (text = prompt) => {
		const description = (typeof text === 'string' ? text : prompt).trim();
		const { imageCredits, subtractOneCredit, updateImageCredits } =
			useImageGenerationStore.getState();
		if (!description || working) return;
		if (imageCredits.remaining <= 0)
			return setProblem(
				// translators: Shown in the AI Agent's image sheet when the site has used all of today's image generations.
				__("You're out of image credits for today.", 'extendify-local'),
			);
		setWorking(true);
		setProblem('');
		subtractOneCredit();
		request.current = new AbortController();
		try {
			const { image, credits } = await generateImage(
				description,
				request.current.signal,
			);
			updateImageCredits(credits);
			const fresh = { ...image, generated: true, madeAt: Date.now() };
			setMade((was) => [fresh, ...was]);
			onMade(fresh);
		} catch (error) {
			// Only a failure the server answered carries its count and a message meant for the user.
			if (error?.credits?.remaining != null) updateImageCredits(error.credits);
			else refreshCredits();
			if (error?.name !== 'AbortError')
				setProblem(
					error?.credits
						? error.message
						: // translators: Shown in the AI Agent's image sheet when generating an image failed.
							__('Image generation failed', 'extendify-local'),
				);
		}
		setWorking(false);
	};

	return {
		prompt,
		setPrompt,
		made: made.filter(
			({ madeAt }) => !madeAt || Date.now() - madeAt < FRESH_FOR,
		),
		working,
		problem,
		generate,
	};
};
