import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

const getRecaptchaToken = (action, siteKey) =>
	new Promise((resolve, reject) => {
		const existing = document.querySelector(
			`script[src*="recaptcha/enterprise"]`,
		);
		const load = () =>
			window.grecaptcha.enterprise.ready(async () => {
				try {
					resolve(
						await window.grecaptcha.enterprise.execute(siteKey, { action }),
					);
				} catch (error) {
					reject(error);
				}
			});

		if (existing) {
			load();
			return;
		}

		const script = document.createElement('script');
		script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`;
		script.async = true;
		script.onload = load;
		document.head.appendChild(script);
	});

const createAccount = async ({
	slug,
	email,
	marketingConsent,
	termsAgreed,
	signal,
	scriptData,
}) => {
	await apiFetch({
		path: `extendify/v1/${slug}/create-account`,
		method: 'POST',
		data: {
			email,
			marketingConsent,
			termsAgreed,
			...scriptData,
		},
		signal,
	});
};

/*
 * Plugin entries shape:
 *   createAccountCallback: (data) => Promise<void> — performs the account creation request
 *   idempotent: boolean (default true)             — false skips retries; use when re-sending the same request could cause errors
 */
export const pluginsActivation = {
	simplybook: {
		idempotent: false,
		createAccountCallback: async ({
			scriptData,
			email,
			marketingConsent,
			termsAgreed,
			signal,
		}) => {
			const captchaToken = await getRecaptchaToken(
				scriptData?.recaptchaAction,
				scriptData?.recaptchaSiteKey,
			);

			// Hit the endpoint via ?rest_route= so the request URL contains "simplybook" —
			// SimplyBook only registers its onboarding routes when it does, else they 404.
			const url = addQueryArgs(`${window.extSharedData.homeUrl}/`, {
				rest_route: '/extendify/v1/simplybook/create-account',
			});

			await apiFetch({
				url,
				method: 'POST',
				data: {
					email,
					marketingConsent,
					termsAgreed,
					captcha_token: captchaToken,
				},
				signal,
			});
		},
	},
	'translatepress-multilingual': {
		createAccountCallback: (data) =>
			createAccount({ slug: 'translatepress-multilingual', ...data }),
	},
	imagify: {
		createAccountCallback: (data) =>
			createAccount({ slug: 'imagify', ...data }),
	},
};
