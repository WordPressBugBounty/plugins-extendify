const given = (value) => (typeof value === 'string' ? value.trim() : '');

// The placeholder is kept to find on the page, never for the agent to write as theirs.
export const businessInfoOf = (siteProfile, { shown = '' } = {}) => {
	const own = given(siteProfile?.phoneNumber);
	const phone = own || given(shown);
	return {
		...Object.fromEntries(
			Object.entries({
				phone,
				email: given(siteProfile?.email),
				address: given(siteProfile?.address),
			}).filter(([, value]) => value),
		),
		...(phone && !own && { sample: ['phone'] }),
	};
};
