const describeError = (error, signal) => ({
	message: error?.message,
	code: error?.code,
	data: error?.data,
	httpStatus: error?.httpStatus,
	// api-fetch collapses our AbortSignal.timeout into a generic fetch_error.
	timedOut: signal.aborted,
});

export async function createAccount(plugin, data) {
	if (!plugin?.idempotent) {
		const signal = AbortSignal.timeout(15000);
		const timings = {};
		const attemptStart = Date.now();

		try {
			await plugin.createAccountCallback({ ...data, signal, timings });

			return {
				requestTimeInMs: [Date.now() - attemptStart],
				captchaTimeInMs: timings.captchaTimeInMs,
				retries: 0,
				errors: [],
			};
		} catch (error) {
			const err = new Error('Single attempt failed');

			err.requestTimeInMs = [Date.now() - attemptStart];
			err.captchaTimeInMs = timings.captchaTimeInMs;
			err.retries = 0;
			err.errors = [describeError(error, signal)];

			throw err;
		}
	}

	return createAccountWithRetry(plugin, data);
}

async function createAccountWithRetry(
	plugin,
	{ email, marketingConsent, termsAgreed, scriptData },
) {
	const windowMs = 10000;
	const perAttemptMs = 5000;
	const backoffMs = 2500;
	const maxRetries = 5;

	const windowStart = Date.now();
	const requestTimeInMs = [];
	const errors = [];
	let retries = 0;

	while (Date.now() - windowStart < windowMs && retries < maxRetries) {
		const attemptStart = Date.now();
		const signal = AbortSignal.timeout(perAttemptMs);

		try {
			await plugin.createAccountCallback({
				email,
				marketingConsent,
				termsAgreed,
				scriptData,
				signal,
			});
			requestTimeInMs.push(Date.now() - attemptStart);
			return { requestTimeInMs, retries, errors };
		} catch (error) {
			requestTimeInMs.push(Date.now() - attemptStart);

			errors.push(describeError(error, signal));

			const remainingMs = windowMs - (Date.now() - windowStart);

			if (remainingMs <= 0) break;

			retries++;

			if (!signal.aborted && remainingMs >= backoffMs) {
				await new Promise((resolve) => setTimeout(resolve, backoffMs));
			}
		}
	}

	const err = new Error(`Retry window of ${windowMs}ms exceeded`);
	err.requestTimeInMs = requestTimeInMs;
	err.retries = retries;
	err.errors = errors;
	throw err;
}
