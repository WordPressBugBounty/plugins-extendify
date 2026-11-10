// Import-free so the e2e spec sends the exact request AutoLaunch sends.
export const secondLanguageRequest = (locale) => ({
	path: '/wp-abilities/v1/abilities/translatepress/add-language/run',
	method: 'POST',
	data: { input: { language_code: locale } },
});
