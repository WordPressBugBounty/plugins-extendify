const DAY_MS = 24 * 60 * 60 * 1000;

// A seeded site writes its launch time without a zone; AutoLaunch writes UTC with one.
export const launchedAt = () => {
	const { launchCompletedAt, siteCreatedAt } = window.extSharedData ?? {};
	const at = launchCompletedAt || siteCreatedAt;
	if (!at) return null;
	const time = Date.parse(
		/[zZ]$|[+-]\d\d:?\d\d$/.test(at) ? at : `${at.replace(' ', 'T')}Z`,
	);
	return Number.isNaN(time) ? null : time;
};

const UNITS = [
	['year', 365],
	['month', 30],
	['week', 7],
	['day', 1],
];

const format = (locale) => {
	try {
		return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	} catch {
		return new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
	}
};

// "3 months ago" or "yesterday" in the site's language; a locale like de_DE_formal isn't a language tag.
export const ago = (at, now = Date.now()) => {
	const days = Math.max(0, Math.floor((now - at) / DAY_MS));
	const [unit, size] = UNITS.find(([, each]) => days >= each) ?? ['day', 1];
	const locale = (window.extSharedData?.wpLanguage ?? 'en_US')
		.split('_')
		.slice(0, 2)
		.join('-');
	return format(locale).format(-Math.floor(days / size), unit);
};
