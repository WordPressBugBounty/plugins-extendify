import { HeaderStyleConfirm } from '@agent/workflows/theme/components/HeaderStyleConfirm';
import { isExtendableHeader } from '@agent/workflows/theme/tools/update-header-style';

const { abilities } = window.extAgentData;

export default {
	available: () => abilities?.canEditThemes && isExtendableHeader(),
	id: 'change-header-style',
	whenFinished: { component: HeaderStyleConfirm },
};
