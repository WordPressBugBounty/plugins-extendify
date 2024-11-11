import { usePagesSelectionStore } from '@launch/state/pages-selections';
import { useUserSelectionStore } from '@launch/state/user-selections';

export const useCanLaunch = () => {
	// The user can launch if they have a complete selection
	const { style } = usePagesSelectionStore();
	const { siteType } = useUserSelectionStore();

	return (
		Object.keys(siteType ?? {})?.length > 0 &&
		Object.keys(style ?? {})?.length > 0
	);
};
