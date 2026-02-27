import { SelectAnimation } from '@agent/workflows/theme/components/SelectAnimation';

const { abilities } = window.extAgentData;

export default {
	available: () => abilities?.canEditSettings && window.ExtendableAnimations,
	id: 'change-animation',
	whenFinished: { component: SelectAnimation },
};
