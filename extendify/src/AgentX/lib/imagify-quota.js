const QUOTA_PERCENT = 80;

const usedOf = (megabytes) => `${Math.round(megabytes)}MB`;

export const imagifyQuotaNote = () => {
	const quota = window.extAgentXData?.facts?.['imagify-quota'];
	return quota?.free && quota.percent >= QUOTA_PERCENT
		? { used: usedOf(quota.used) }
		: null;
};
