import { reqDataBasics } from '@auto-launch/functions/helpers';
import { AI_HOST } from '@constants';

const generatePatterns = async (page, data) => {
	const { siteProfile } = data;
	const response = await fetch(`${AI_HOST}/api/patterns`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...reqDataBasics, siteProfile, page }),
	});
	return await response.json();
};

export const generatePageContent = async (pages, data) => {
	const result = await Promise.allSettled(
		pages.map(
			(page) =>
				generatePatterns(page, data)
					.then((response) => response)
					.catch(() => page), // safe fallback
		),
	);

	return result?.map((page, i) => page.value || pages[i]);
};
