import { useGuideStore } from '@agentx/state/guide';
import apiFetch from '@wordpress/api-fetch';
import { decodeEntities } from '@wordpress/html-entities';

export const markDone = async (step, { finishes = false } = {}) => {
	useGuideStore.setState(({ steps }) => ({
		steps: { ...steps, [step]: 'done', ...(finishes && { finished: 'done' }) },
	}));
	try {
		const saved = await apiFetch({
			path: '/extendify/v1/agentx/guide',
			method: 'POST',
			data: { step, ...(finishes && { finishes: true }) },
		});
		useGuideStore.setState({ steps: saved.steps });
	} catch {
		// The step shows done at once; a lost save only shows it undone after a reload.
	}
};

// A partner can give one search page, or one per language as JSON.
export const searchUrl = () => {
	const urls = window.extAgentXData?.domainSearchUrl;
	if (!urls) {
		return window.extSharedData?.devbuild
			? 'https://extendify.com?s={DOMAIN}'
			: '';
	}
	const decoded = decodeEntities(urls);
	try {
		const byLanguage = JSON.parse(decoded);
		return (
			byLanguage?.[window.extSharedData?.wpLanguage] ??
			byLanguage?.default ??
			''
		);
	} catch {
		return decoded;
	}
};

// A look swaps the home page's top section, and a domain needs the host's search page.
// The site setup's rule: the partner turned it on and the site is on a temporary address.
// Its names aren't required here: an empty cache waits on cron, and the step fetches its own.
const domainOffered = () => {
	if (!searchUrl()) return false;
	if (window.extSharedData?.devbuild) return true;
	const { domainTask, stagingSites = [] } = window.extAgentXData ?? {};
	const host = window.location.hostname.toLowerCase();
	const temporary = stagingSites.some((site) =>
		host.includes(String(site).toLowerCase()),
	);
	return (
		Boolean(domainTask) && temporary && Boolean(window.extSharedData?.siteTitle)
	);
};

export const offered = (id) => {
	if (id === 'look') return Boolean(window.extAgentXData?.layouts);
	if (id === 'domain') return domainOffered();
	return true;
};
