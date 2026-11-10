import { getLogoShape } from '@auto-launch/fetchers/shape';
import {
	failWithFallback,
	fetchWithTimeout,
	retryTwice,
	setStatus,
} from '@auto-launch/functions/helpers';
import {
	updateOption,
	uploadMedia as uploadFormData,
} from '@auto-launch/functions/wp';
import { launchStrings } from '@auto-launch/strings';
import { AI_HOST } from '@constants';
import { digest } from '@shared/api/digest';
import { reqDataBasics } from '@shared/lib/data';
import { uploadMedia } from '@wordpress/media-utils';

const { showAILogo } = window.extSharedData;
const fallback = {
	logoUrl:
		'https://images.extendify-cdn.com/demo-content/logos/ext-custom-logo-default.webp',
};
const url = `${AI_HOST}/api/site-profile/generate-logo`;
const method = 'POST';
const headers = { 'Content-Type': 'application/json' };

export const handleSiteLogo = async ({ siteProfile }) => {
	if (!showAILogo) return fallback;

	// translators: this is for a action log UI. Keep it short
	setStatus(launchStrings().statusLogo);

	const { logoObjectName: objectName } = siteProfile;
	const body = JSON.stringify({ ...reqDataBasics, objectName });
	const response = await retryTwice(() =>
		fetchWithTimeout(url, { method, headers, body }),
	).catch((error) => {
		return { ok: false, statusText: error.message, status: 0 };
	});

	if (!response?.ok) {
		digest({
			error: {
				message: response.statusText,
				name: 'FetchError',
				status: response.status,
			},
			details: { source: 'auto-launch', caller: 'handleSiteLogo', objectName },
		});
		return fallback;
	}

	const logoUrl = await failWithFallback(
		async () => {
			const { logoUrl } = getLogoShape.parse(await response.json());
			return logoUrl;
		},
		fallback.logoUrl,
		{ caller: 'handleSiteLogo' },
	);

	// If this errors we just move on.
	await uploadLogo(logoUrl);

	return getLogoShape.parse({ logoUrl });
};

// The backend serves the real brand logo from a `logos-custom/` path; other
// logos keep the duotone-prefixed upload name.
export const isExternalLogo = (url) => url?.includes('logos-custom/') ?? false;

export const uploadLogo = async (
	url,
	{ external = false, title = '' } = {},
) => {
	const blob = await (await fetch(url)).blob();
	const type = blob.type;
	const fileExtension = type.replace('image/', '');
	const prefix = external ? 'ext-logo-' : 'ext-custom-logo-';
	const logoName = `${prefix}${Date.now()}`;
	const image = new File([blob], `${logoName}.${fileExtension}`, { type });

	await uploadMedia({
		filesList: [image],
		onFileChange: async ([fileObj]) => {
			if (!fileObj?.id) return;
			await updateOption('site_logo', fileObj.id);
			if (!external) return await uploadSiteIcon(() => makeSiteIcon(blob));
			// A wordmark is unreadable at tab size.
			await uploadLetterIcon(title);
		},
		onError: (err) => {
			console.error('Error uploading logo:', err);
			digest({
				error: err,
				details: { source: 'auto-launch', caller: 'uploadLogo' },
			});
		},
	});
};

const ICON_SIZE = 512;
const LOGO_SIZE = ICON_SIZE * 0.84;
// Neutral backgrounds keep the icon visible on light and dark tab bars.
const LIGHT_BG = '#f3f4f6';
const DARK_BG = '#1f2937';

const drawIcon = async (draw) => {
	const canvas = document.createElement('canvas');
	canvas.width = ICON_SIZE;
	canvas.height = ICON_SIZE;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D context unavailable.');
	draw(ctx);
	const png = await new Promise((resolve, reject) =>
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error('Canvas gave no blob.'))),
			'image/png',
		),
	);
	return new File([png], `ext-site-icon-${Date.now()}.png`, {
		type: 'image/png',
	});
};

const fillBackground = (ctx, color) => {
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
};

// Finds the visible pixels' bounds and alpha-weighted luminance (0-1).
export const analyzeLogo = (image) => {
	const { naturalWidth: w, naturalHeight: h } = image;
	const full = { x: 0, y: 0, w, h };
	const scale = Math.min(1, 256 / Math.max(w, h));
	const sw = Math.max(1, Math.round(w * scale));
	const sh = Math.max(1, Math.round(h * scale));
	const canvas = document.createElement('canvas');
	canvas.width = sw;
	canvas.height = sh;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) return { luminance: 0, box: full };
	ctx.drawImage(image, 0, 0, sw, sh);
	const { data } = ctx.getImageData(0, 0, sw, sh);
	let [minX, minY, maxX, maxY] = [sw, sh, -1, -1];
	let sum = 0;
	let weight = 0;
	for (let i = 0; i < data.length; i += 4) {
		const alpha = data[i + 3] / 255;
		if (alpha < 0.1) continue;
		const x = (i / 4) % sw;
		const y = Math.floor(i / 4 / sw);
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
		sum +=
			alpha * (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
		weight += alpha;
	}
	if (!weight) return { luminance: 0, box: full };
	return {
		luminance: sum / weight / 255,
		box: {
			x: minX / scale,
			y: minY / scale,
			w: (maxX - minX + 1) / scale,
			h: (maxY - minY + 1) / scale,
		},
	};
};

export const makeSiteIcon = async (blob) => {
	const src = URL.createObjectURL(blob);
	try {
		const image = new Image();
		image.src = src;
		await image.decode();
		const { luminance, box } = analyzeLogo(image);
		const scale = LOGO_SIZE / Math.max(box.w, box.h);
		const background = luminance > 0.5 ? DARK_BG : LIGHT_BG;
		return await drawIcon((ctx) => {
			fillBackground(ctx, background);
			ctx.drawImage(
				image,
				box.x,
				box.y,
				box.w,
				box.h,
				(ICON_SIZE - box.w * scale) / 2,
				(ICON_SIZE - box.h * scale) / 2,
				box.w * scale,
				box.h * scale,
			);
		});
	} finally {
		URL.revokeObjectURL(src);
	}
};

export const makeLetterIcon = (title) => {
	const letter = Array.from(title.trim())[0].toLocaleUpperCase();
	return drawIcon((ctx) => {
		fillBackground(ctx, LIGHT_BG);
		ctx.fillStyle = DARK_BG;
		ctx.font = `600 ${ICON_SIZE * 0.75}px system-ui, sans-serif`;
		ctx.textAlign = 'center';
		const { actualBoundingBoxAscent: up, actualBoundingBoxDescent: down } =
			ctx.measureText(letter);
		ctx.fillText(letter, ICON_SIZE / 2, (ICON_SIZE + up - down) / 2);
	});
};

const uploadLetterIcon = async (title) => {
	if (!title?.trim()) return;
	await uploadSiteIcon(() => makeLetterIcon(title));
};

// The default logo is never uploaded, so nothing else sets an icon.
export const handleFallbackSiteIcon = async ({ siteProfile, designBuild }) => {
	if (showAILogo || designBuild?.logoUrl) return;
	await uploadLetterIcon(siteProfile?.title);
};

const uploadSiteIcon = async (makeIcon) => {
	try {
		const formData = new FormData();
		formData.append('file', await makeIcon());
		const { id } = await uploadFormData(formData);
		await updateOption('site_icon', id);
	} catch (error) {
		digest({
			error,
			details: { source: 'auto-launch', caller: 'uploadSiteIcon' },
		});
	}
};
