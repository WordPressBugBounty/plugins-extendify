import { recordLive } from '@agentx/lib/draft';
import { editBlocks } from '@agentx/lib/edit-blocks';
import { blockById } from '@agentx/lib/pick-block';
import { showSaved } from '@agentx/lib/settings';
import { showCurrent } from '@agentx/lib/show-draft';
import { markChanged } from '@agentx/state/changed';
import { useImagesStore } from '@agentx/state/images';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';
import { addQueryArgs } from '@wordpress/url';

const IMAGE_SETTING = { logo: 'site_logo', icon: 'site_icon' };

const FIELDS = 'id,source_url,alt_text,title,media_details';

const imageOf = (media) =>
	media
		? {
				id: media.id,
				attachment: true,
				url: media.source_url,
				// A smaller copy to show; the full one is what gets saved.
				thumb: media.media_details?.sizes?.medium?.source_url,
				name: media.alt_text || decodeEntities(media.title?.rendered ?? ''),
				width: media.media_details?.width,
				height: media.media_details?.height,
				// Images uploaded before WordPress 6.0 have no stored size, so they get no tip.
				size: media.media_details?.filesize,
			}
		: null;

const mediaById = async (id) =>
	id
		? imageOf(
				await apiFetch({ path: `/wp/v2/media/${id}?_fields=${FIELDS}` }).catch(
					() => null,
				),
			)
		: null;

export const currentImage = async (which) => {
	const setting = IMAGE_SETTING[which];
	const saved = await apiFetch({ path: `/wp/v2/settings?_fields=${setting}` });
	return mediaById(saved[setting]);
};

// The picture a block shows now, from the site frame, which shows the draft.
export const blockImage = ({ id }) => {
	const doc = document.getElementById('extendify-agentx-site')?.contentDocument;
	const element = doc && blockById(doc, id);
	const img = element?.matches('img') ? element : element?.querySelector('img');
	const attachment = Number(img?.className.match(/\bwp-image-(\d+)\b/)?.[1]);
	if (attachment) return mediaById(attachment);
	return Promise.resolve(
		img ? { url: img.currentSrc || img.src, name: img.alt } : null,
	);
};

// Goes into the draft as one turn, like the agent's own edits; a synced pattern waits for confirmed.
export const replaceBlockImage = async (
	block,
	image,
	{ confirmed = false } = {},
) =>
	editBlocks({
		ops: [
			{
				op: 'replace-image',
				block: block.id,
				type: block.type,
				image: { id: image.id, ...(image.name && { alt: image.name }) },
			},
		],
		confirmed,
	});

// A new picture goes into the draft beside, inside or in place of the block its place names.
export const addBlockImage = (place, image) => {
	const added = {
		type: 'core/image',
		image: { id: image.id, ...(image.name && { alt: image.name }) },
	};
	// One edit, so the page never shows the old block and the picture together.
	if (place.position === 'replace') {
		return editBlocks({
			ops: [
				{
					op: 'add',
					block: place.block,
					type: place.type,
					position: 'before',
					new: added,
				},
				{ op: 'delete', block: place.block, type: place.type },
			],
		});
	}
	const right = place.position === 'right';
	if (!right && place.position !== 'left') {
		return editBlocks({
			ops: [
				{
					op: 'add',
					block: place.block,
					type: place.type,
					position: place.position,
					new: added,
				},
			],
		});
	}
	// Beside a block means columns: the block in one, and the picture in the empty one.
	return editBlocks({
		ops: [
			{
				op: 'wrap',
				block: place.block,
				type: place.type,
				columns: right ? [[place.block], []] : [[], [place.block]],
			},
			{
				op: 'add',
				block: `$0.${right ? 1 : 0}`,
				type: 'core/column',
				position: 'start',
				new: added,
			},
		],
	});
};

export const uploadImage = async (file, { alt, generated } = {}) => {
	const body = new FormData();
	body.append('file', file, file.name);
	if (alt) body.append('alt_text', alt);
	// Draft and Quick Edit mark generated images the same way.
	if (generated) body.append('meta[extendify_ai_generated]', '1');
	return imageOf(
		await apiFetch({ path: '/wp/v2/media', method: 'POST', body }),
	);
};

export const libraryImages = async ({ search, page, generated, signal }) => {
	const response = await apiFetch({
		path: addQueryArgs('/wp/v2/media', {
			media_type: 'image',
			per_page: 24,
			page,
			search: search || undefined,
			extendify_ai_generated: generated ? 1 : undefined,
			_fields: FIELDS,
		}),
		parse: false,
		signal,
	});
	return {
		images: (await response.json()).map(imageOf),
		more: page < Number(response.headers.get('X-WP-TotalPages') ?? 1),
	};
};

const EXTENSIONS = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
};

const fileFrom = async (url, name) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Image ${response.status}`);
	const blob = await response.blob();
	const type = blob.type || 'image/jpeg';
	return new File([blob], `${name}.${EXTENSIONS[type] ?? 'jpg'}`, { type });
};

// Kept in its own format, since a canvas re-encode would turn a transparent logo's background black.
export const attachmentFor = async (which, image) => {
	const square = image.width && image.width === image.height;
	if (image.attachment && (which !== 'icon' || square)) return image;
	const name = { icon: 'site-icon', logo: 'logo' }[which] ?? 'image';
	const file = await fileFrom(
		image.url,
		image.generated ? `${name}-ai-generated` : name,
	);
	return uploadImage(which === 'icon' ? await squared(file) : file, {
		alt: image.name,
		generated: image.generated,
	});
};

// WordPress renders the site with a picked logo, the way it renders a style preview; none shows the saved one.
export const showLogo = (image) =>
	showCurrent(
		image
			? { 'extendify-logo': image.attachment ? String(image.id) : image.url }
			: {},
	);

// Saved live like the title; 0 clears it. The result is the tool's, for the agent.
// The browser tab keeps the icon the page loaded with until it reloads.
const showTabIcon = (url) => {
	const links = [...document.querySelectorAll('link[rel~="icon"]')];
	if (!links.length) {
		const link = document.createElement('link');
		link.rel = 'icon';
		document.head.append(link);
		links.push(link);
	}
	for (const link of links) link.href = url;
};

export const saveImage = async (which, image) => {
	const setting = IMAGE_SETTING[which];
	const { [setting]: before } = await apiFetch({
		path: `/wp/v2/settings?_fields=${setting}`,
	});
	await apiFetch({
		path: '/wp/v2/settings',
		method: 'POST',
		data: { [setting]: image?.id ?? 0 },
	});
	if ((before || 0) !== (image?.id ?? 0)) {
		markChanged(which);
		// Fails quietly: the image is saved, it just can't be undone from the history.
		await recordLive(which, before || 0, image?.id ?? 0).catch(() => {});
	}
	useImagesStore.setState({
		[which]: image && { url: image.thumb ?? image.url, name: image.name },
	});
	if (which === 'icon' && image?.url) showTabIcon(image.url);
	await showSaved();
	const was = await mediaById(before);
	const short = (picked) => picked && { id: picked.id, url: picked.url };
	return { target: which, before: short(was), after: short(image) };
};

// A site icon must be square, so any other image is cut to its centered square first.
export const squared = async (file) => {
	const bitmap = await createImageBitmap(file).catch(() => null);
	if (!bitmap || bitmap.width === bitmap.height) return file;
	const side = Math.min(bitmap.width, bitmap.height);
	const canvas = document.createElement('canvas');
	canvas.width = side;
	canvas.height = side;
	canvas
		.getContext('2d')
		.drawImage(
			bitmap,
			(bitmap.width - side) / 2,
			(bitmap.height - side) / 2,
			side,
			side,
			0,
			0,
			side,
			side,
		);
	const blob = await new Promise((done) => canvas.toBlob(done, 'image/png'));
	if (!blob) return file;
	const name = `${file.name.replace(/\.[^.]+$/, '')}-square.png`;
	return new File([blob], name, { type: 'image/png' });
};
