import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

let recaptchaReady;
const loadRecaptcha = () => {
	recaptchaReady ??= new Promise((resolve, reject) => {
		const ready = () => window.grecaptcha.enterprise.ready(resolve);
		if (window.grecaptcha?.enterprise) {
			ready();
			return;
		}

		const existing = document.querySelector(
			'script[src*="recaptcha/enterprise"]',
		);
		if (existing) {
			existing.addEventListener('load', ready);
			return;
		}

		const script = document.createElement('script');
		script.src =
			'https://www.google.com/recaptcha/enterprise.js?render=explicit';
		script.async = true;
		script.onload = ready;
		script.onerror = () => {
			// A cached rejection would block every retry.
			recaptchaReady = undefined;
			reject(new Error('Failed to load the reCAPTCHA script'));
		};
		document.head.appendChild(script);
	});
	return recaptchaReady;
};

// enterprise.js can't load twice, and execute() needs a rendered site key —
// one widget per key.
const recaptchaWidgets = new Map();
const getRecaptchaToken = async (action, siteKey, timings = {}) => {
	if (!siteKey) {
		throw new Error(`No reCAPTCHA site key for the ${action} action`);
	}

	const start = Date.now();

	try {
		await loadRecaptcha();

		if (!recaptchaWidgets.has(siteKey)) {
			const container = document.createElement('div');
			document.body.appendChild(container);
			recaptchaWidgets.set(
				siteKey,
				window.grecaptcha.enterprise.render(container, {
					sitekey: siteKey,
					size: 'invisible',
				}),
			);
		}

		// Without await, finally runs before execute settles and records ~0ms.
		return await window.grecaptcha.enterprise.execute(
			recaptchaWidgets.get(siteKey),
			{ action },
		);
	} finally {
		timings.captchaTimeInMs = Date.now() - start;
	}
};

// api-fetch throws the parsed body and drops the Response, so parse:false is the only way to keep the status.
const post = async (options) => {
	try {
		await apiFetch({ ...options, method: 'POST', parse: false });
	} catch (error) {
		if (typeof error?.json !== 'function') throw error;

		const body = await error.json().catch(() => ({ code: 'invalid_json' }));
		throw { ...body, httpStatus: error.status };
	}
};

const createAccount = ({
	slug,
	email,
	marketingConsent,
	termsAgreed,
	signal,
	scriptData,
}) =>
	post({
		path: `extendify/v1/${slug}/create-account`,
		data: {
			email,
			marketingConsent,
			termsAgreed,
			...scriptData,
		},
		signal,
	});

/*
 * Plugin entries shape:
 *   createAccountCallback: (data) => Promise<void> — performs the account creation request
 *   idempotent: boolean (default true)             — false skips retries; an aborted fetch does not stop the PHP call, so a retry creates a second account
 *   data.timings: out-param                        — write captchaTimeInMs here; it survives a throw
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
			timings,
		}) => {
			const captchaToken = await getRecaptchaToken(
				scriptData?.recaptchaAction,
				scriptData?.recaptchaSiteKey,
				timings,
			);

			// Hit the endpoint via ?rest_route= so the request URL contains "simplybook" —
			// SimplyBook only registers its onboarding routes when it does, else they 404.
			const url = addQueryArgs(`${window.extSharedData.homeUrl}/`, {
				rest_route: '/extendify/v1/simplybook/create-account',
			});

			await post({
				url,
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
		idempotent: false,
		createAccountCallback: (data) =>
			createAccount({ slug: 'translatepress-multilingual', ...data }),
	},
	imagify: {
		idempotent: false,
		createAccountCallback: (data) =>
			createAccount({ slug: 'imagify', ...data }),
	},
	metricool: {
		idempotent: false,
		createAccountCallback: async ({
			scriptData,
			email,
			marketingConsent,
			termsAgreed,
			signal,
			timings,
		}) => {
			const captchaToken = await getRecaptchaToken(
				scriptData?.recaptchaAction,
				scriptData?.recaptchaSiteKey,
				timings,
			);

			// The "/v1" segment is what makes Metricool register its logout route.
			await post({
				path: 'extendify/v1/metricool/v1/create-account',
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
};
