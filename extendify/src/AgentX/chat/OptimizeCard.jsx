import { PLUGIN_LOGOS } from '@agentx/chat/CardBadge';
import { InlineCard } from '@agentx/chat/InlineCard';
import { StatusLine } from '@agentx/chat/StatusLine';
import { runAbility } from '@agentx/lib/abilities';
import { showSaved } from '@agentx/lib/settings';
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { image as imageIcon } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';

export const STATUS = 'imagify/get-media-status';
const POLL_MS = 2000;
const GIVE_UP_MS = 60000;

// A remount would watch again and reload the site a second time.
const settled = new Map();

// get-media-status refuses any key but these.
export const mediaOf = ({ media_id, media_filename, media_url }) =>
	Object.fromEntries(
		Object.entries({ media_id, media_filename, media_url }).filter(
			([, value]) => value,
		),
	);

// Imagify refuses an image already at the level asked for, and charges nothing.
export const alreadyOptimized = (status, input) =>
	status?.status === 'success' &&
	Boolean(status.optimized_size) &&
	(input.optimization_level == null ||
		input.optimization_level === status.optimization_level);

// Imagify answers once the job is queued, so a size here means it already finished.
const outcomeOf = (output) => {
	if (output.status !== 'success') {
		return {
			state: 'failed',
			reason: output.error_message || output.message,
		};
	}
	if (!output.optimized_size) return { state: 'optimizing' };
	return {
		state: 'optimized',
		before: output.original_size,
		after: output.optimized_size,
		already: Boolean(output.already),
	};
};

const useOutcome = (part) => {
	const [outcome, setOutcome] = useState(
		() =>
			settled.get(part.toolCallId) ??
			(part.demoState === 'background'
				? { state: 'background' }
				: outcomeOf(part.output)),
	);

	useEffect(() => {
		if (part.demoState || part.output?.status !== 'error') return;
		let live = true;
		runAbility(STATUS, mediaOf(part.input))
			.then((status) => {
				if (!live || !alreadyOptimized(status, part.input)) return;
				const next = outcomeOf({ ...status, already: true });
				settled.set(part.toolCallId, next);
				setOutcome(next);
			})
			.catch(() => {});
		return () => {
			live = false;
		};
	}, []);

	useEffect(() => {
		if (part.demoState || outcome.state !== 'optimizing') return;
		let live = true;
		let timer;
		// Imagify keeps an earlier failure until the queued job replaces it.
		let replaced = false;
		const started = Date.now();
		const settle = (next) => {
			settled.set(part.toolCallId, next);
			if (live) setOutcome(next);
		};
		const check = async () => {
			const status = await runAbility(STATUS, mediaOf(part.input)).catch(
				() => null,
			);
			if (!live) return;
			const expired = Date.now() - started >= GIVE_UP_MS;
			if (status?.status === 'success' && status.optimized_size) {
				showSaved();
				return settle({
					state: 'optimized',
					before: status.original_size ?? part.output.original_size,
					after: status.optimized_size,
				});
			}
			if (status?.status === 'error' && (replaced || expired)) {
				return settle({ state: 'failed', reason: status.error_message });
			}
			if (status?.status && status.status !== 'error') replaced = true;
			if (expired) return settle({ state: 'background' });
			timer = setTimeout(check, POLL_MS);
		};
		check();
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, []);

	return outcome;
};

// The model may name the image by id, address or file name, like Imagify does.
const useImage = (input) => {
	const [url, setUrl] = useState(input.media_url ?? null);

	useEffect(() => {
		if (url) return;
		const path = input.media_id
			? `/wp/v2/media/${input.media_id}`
			: input.media_filename &&
				addQueryArgs('/wp/v2/media', {
					search: input.media_filename,
					per_page: 1,
				});
		if (!path) return;
		apiFetch({ path })
			.then((found) => {
				const media = Array.isArray(found) ? found[0] : found;
				if (media?.source_url) setUrl(media.source_url);
			})
			.catch(() => {});
	}, []);

	return url;
};

const fileOf = (url) => {
	try {
		return decodeURIComponent(
			new URL(url, window.location.origin).pathname.split('/').pop(),
		);
	} catch {
		return '';
	}
};

const summary = (outcome) => {
	if (outcome.state === 'optimizing') {
		return (
			<StatusLine
				as="span"
				className=""
				text={
					// translators: Shown on the AI Agent's card for an image while Imagify makes its file smaller.
					__('Optimizing…', 'extendify-local')
				}
			/>
		);
	}
	if (outcome.state === 'optimized') {
		const saved = Math.round(
			((outcome.before - outcome.after) / outcome.before) * 100,
		);
		const percent = `${Number.isFinite(saved) ? Math.max(saved, 0) : 0}%`;
		return outcome.already
			? sprintf(
					// translators: %s is how much smaller Imagify had already made an image's file, like 42%. Shown on the AI Agent's card for that image when it was optimized before.
					__('Already optimized, %s smaller', 'extendify-local'),
					percent,
				)
			: sprintf(
					// translators: %s is how much smaller Imagify made an image's file, like 42%. Shown on the AI Agent's card for that image.
					__('%s smaller', 'extendify-local'),
					percent,
				);
	}
	if (outcome.state === 'background') {
		// translators: Shown on the AI Agent's card for an image when Imagify hasn't finished making its file smaller after a minute.
		return __('Still optimizing in the background', 'extendify-local');
	}
	return (
		<span className="text-agentx-alert">
			{outcome.reason ||
				// translators: Shown on the AI Agent's card for an image when Imagify couldn't make its file smaller and gave no reason.
				__("Couldn't optimize the image", 'extendify-local')}
		</span>
	);
};

const Optimizing = ({ part, takesFocus }) => {
	const outcome = useOutcome(part);
	const url = useImage(part.input ?? {});

	return (
		<InlineCard
			latest
			takesFocus={takesFocus}
			icon={imageIcon}
			logo={PLUGIN_LOGOS.imagify}
			title={
				part.input?.media_filename ||
				(url && fileOf(url)) ||
				// translators: Names an image on the AI Agent's card for it, when the image's file name isn't known yet.
				__('Image', 'extendify-local')
			}
			subtitle={summary(outcome)}
		>
			<div className="m-0 size-24 overflow-hidden rounded-agentx-control border border-solid border-agentx-card-border">
				{url && (
					<img
						src={url}
						alt=""
						className={`m-0 size-full object-cover transition-[filter] duration-500 motion-reduce:transition-none ${
							outcome.state === 'optimizing' ? 'blur-sm' : ''
						}`}
					/>
				)}
			</div>
		</InlineCard>
	);
};

export const OptimizeCard = ({ part, takesFocus }) =>
	part.state === 'output-available' ? (
		<Optimizing part={part} takesFocus={takesFocus} />
	) : null;
