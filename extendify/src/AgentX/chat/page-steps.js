import { __, sprintf } from '@wordpress/i18n';
import { create } from 'zustand';

// The steps a page being made has started, by its call, in order.
export const usePageStepsStore = create(() => ({}));

export const startPageStep = (call, step) =>
	usePageStepsStore.setState((all) => ({
		...all,
		[call]: [...(all[call] ?? []), step],
	}));

export const pageStepsOf = (call) => usePageStepsStore.getState()[call] ?? [];

const LABELS = {
	profile: () => [
		// translators: A step in the AI Agent's chat while it works out what a new page should hold.
		__('Planning the page', 'extendify-local'),
		// translators: A finished step in the AI Agent's chat: it worked out what a new page should hold.
		__('Planned the page', 'extendify-local'),
	],
	images: () => [
		// translators: A step in the AI Agent's chat while it finds photos for a new page.
		__('Finding photos', 'extendify-local'),
		// translators: A finished step in the AI Agent's chat: it found photos for a new page.
		__('Found photos', 'extendify-local'),
	],
	layout: () => [
		// translators: A step in the AI Agent's chat while it picks the sections of a new page.
		__('Choosing a layout', 'extendify-local'),
		// translators: A finished step in the AI Agent's chat: it picked the sections of a new page.
		__('Chose a layout', 'extendify-local'),
	],
	copy: () => [
		// translators: A step in the AI Agent's chat while it writes the words of a new page.
		__('Writing the page', 'extendify-local'),
		// translators: A finished step in the AI Agent's chat: it wrote the words of a new page.
		__('Wrote the page', 'extendify-local'),
	],
	page: (title) => [
		// translators: A step in the AI Agent's chat while it saves a new page as a draft.
		__('Making the page', 'extendify-local'),
		title
			? sprintf(
					// translators: %s is the title of a page the AI Agent just made as a draft. A finished step in its chat.
					__('Made the “%s” page', 'extendify-local'),
					title,
				)
			: // translators: A finished step in the AI Agent's chat: it made a new page as a draft.
				__('Made the page', 'extendify-local'),
	],
	open: () => [
		// translators: A step in the AI Agent's chat while it shows a page it just made on the site beside the chat.
		__('Opening the page', 'extendify-local'),
		// translators: A finished step in the AI Agent's chat: it showed a page it just made on the site beside the chat.
		__('Opened the page', 'extendify-local'),
	],
};

const POST_LABELS = {
	photo: () => [
		// translators: A step in the AI Agent's chat while it finds a featured photo for a blog post it wrote.
		__('Finding a photo', 'extendify-local'),
		// translators: A finished step in the AI Agent's chat: it found a featured photo for a blog post it wrote.
		__('Found a photo', 'extendify-local'),
	],
	post: (title) => [
		// translators: A step in the AI Agent's chat while it saves a blog post it wrote as a draft.
		__('Saving the post as a draft', 'extendify-local'),
		title
			? sprintf(
					// translators: %s is the title of a blog post the AI Agent just saved as a draft. A finished step in its chat.
					__('Saved “%s” as a draft', 'extendify-local'),
					title,
				)
			: // translators: A finished step in the AI Agent's chat: it saved a blog post it wrote as a draft.
				__('Saved the post as a draft', 'extendify-local'),
	],
	open: () => [
		// translators: A step in the AI Agent's chat while it shows a blog post it just wrote on the site beside the chat.
		__('Opening the post', 'extendify-local'),
		// translators: A finished step in the AI Agent's chat: it showed a blog post it just wrote on the site beside the chat.
		__('Opened the post', 'extendify-local'),
	],
};

const labelsOf = ({ type }) =>
	type === 'tool-create-post' ? POST_LABELS : LABELS;

// The work that leads to the page folds once it is made, like a read before a change.
const LEADING = ['profile', 'images', 'layout', 'copy', 'photo'];

const lineOf = (part, step, done) => {
	const [working, finished] = labelsOf(part)[step](
		part.output?.title ?? part.input?.title,
	);
	return {
		type: part.type,
		toolCallId: `${part.toolCallId}:${step}`,
		state: done ? 'output-available' : 'input-available',
		title: working,
		...(done && { output: { done: finished } }),
		...(LEADING.includes(step) && { leads: true }),
	};
};

// Making a page takes a while, so each of its steps is a line of its own; a failure ends on the tool's own line.
export const pageLines = (part) => {
	if (part.type !== 'tool-create-page' && part.type !== 'tool-create-post') {
		return [part];
	}
	const steps = (part.output?.steps ?? pageStepsOf(part.toolCallId)).filter(
		(step) => labelsOf(part)[step],
	);
	if (!steps.length) return [part];
	if (part.state === 'output-error') {
		return [
			...steps.slice(0, -1).map((step) => lineOf(part, step, true)),
			part,
		];
	}
	const ended = part.state === 'output-available';
	// Once made, the page's own line names it; opening it shows only while it happens.
	return steps
		.filter((step) => !ended || step !== 'open' || steps.length === 1)
		.map((step, at) => lineOf(part, step, ended || at < steps.length - 1));
};
