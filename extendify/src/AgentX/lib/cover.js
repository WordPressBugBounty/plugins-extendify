import { __ } from '@wordpress/i18n';

// People call a cover by what fills it; one with only a color stays a cover.
export const coverMedia = (element) => {
	if (element?.getAttribute?.('data-extendify-block-type') !== 'core/cover') {
		return null;
	}
	for (const child of element.children) {
		if (child.classList.contains('wp-block-cover__video-background')) {
			return 'video';
		}
		if (child.classList.contains('wp-block-cover__image-background')) {
			return 'image';
		}
	}
	return null;
};

export const coverLabel = (media) => {
	if (media === 'video') {
		// translators: Name of a section on the user's website with a video as its background, on the chip of the AI Agent's chat box when it's picked.
		return __('Cover video', 'extendify-local');
	}
	if (media === 'image') {
		// translators: Name of a section on the user's website with an image as its background, on the chip of the AI Agent's chat box when it's picked.
		return __('Cover image', 'extendify-local');
	}
	return null;
};
