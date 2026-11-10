// A host must end at its TLD: google.com.evil.co is not Google. Same rule as Maps::GOOGLE.
const TLD = String.raw`(?:com|[a-z]{2}|com?\.[a-z]{2})`;

// Addresses a map draws at; a link to the map itself refuses to be framed.
const EMBEDS = [
	new RegExp(
		String.raw`^https://(?:www\.|maps\.)?google\.${TLD}/maps/(?:d/)?embed\b`,
		'i',
	),
	new RegExp(
		String.raw`^https://(?:www\.|maps\.)?google\.${TLD}/maps\?[^\s]*output=embed`,
		'i',
	),
	/^https:\/\/(?:www\.)?(?:openstreetmap|osm)\.org\/export\/embed\.html\b/i,
	/^https:\/\/(?:www\.)?bing\.com\/maps\/embed\b/i,
	/^https:\/\/embed\.apple\.com\/maps\b/i,
	new RegExp(String.raw`^https://yandex\.${TLD}/map-widget\b`, 'i'),
];

// Where a map lives; the site builds the address that draws it.
const MAPS = [
	new RegExp(String.raw`^(?:[a-z0-9-]+\.)*google\.${TLD}/maps\b`, 'i'),
	/^maps\.app\.goo\.gl\//i,
	/^goo\.gl\/maps\b/i,
	/^(?:maps|embed)\.apple\.com\//i,
	/^(?:www\.)?(?:openstreetmap|osm)\.org\//i,
	/^(?:www\.)?bing\.com\/maps\b/i,
	/^(?:www\.)?waze\.com\//i,
	/^(?:[a-z0-9-]+\.)*here\.com\//i,
	new RegExp(String.raw`^(?:www\.)?yandex\.${TLD}/map`, 'i'),
];

const IFRAME = /<iframe\b[^>]*>(?:[\s\S]*?<\/iframe>)?/gi;
// People paste maps.app.goo.gl/x with no scheme, so a domain with a path counts too.
const LINK =
	/\b(?:https?:\/\/[^\s<>"'`]+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>"'`]*)/gi;
const TRAILING = /[.,;:!?)\]}'"]+$/;
const SRC = /\bsrc\s*=\s*(["'])(.*?)\1/i;

const srcOf = (frame) =>
	(frame.match(SRC)?.[2] ?? '').replaceAll('&amp;', '&').trim();

const onAMap = (link) =>
	MAPS.some((site) => site.test(link.replace(/^https?:\/\//i, '')));

// Either an address to frame now, or the one the site has to work out.
export const pastedMap = (said = '') => {
	const frame = (said.match(IFRAME) ?? []).find((each) => onAMap(srcOf(each)));
	if (frame) {
		const src = srcOf(frame);
		const text = said
			.replace(frame, '')
			.replace(/[^\S\n]{2,}/g, ' ')
			.trim();
		return EMBEDS.some((embed) => embed.test(src))
			? { text, map: { src } }
			: { text, map: { embed: frame } };
	}

	const link = (said.match(LINK) ?? [])
		.map((found) => found.replace(TRAILING, ''))
		.find(onAMap);
	return { text: said, map: link ? { link } : null };
};
