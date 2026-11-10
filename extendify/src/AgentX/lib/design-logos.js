// A design sets the bar's logos; without one the bar keeps the partner's own and the agent's mark.
export const designLogo = (slot) => {
	const logos = window.extAgentXData?.design?.logos;
	const url = logos?.[slot];
	return typeof url === 'string' && url ? url : '';
};
