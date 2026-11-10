import { changeLabel, opLabel } from '@agentx/lib/changes';
import { revert } from '@agentx/lib/draft';
import { showDraft } from '@agentx/lib/show-draft';
import { useDraftStore } from '@agentx/state/draft';

const { variations = [] } = window.extAgentXData ?? {};

// A refusal is the tool's answer, for the agent to explain; any other failure throws and reaches it as an error.
export const revertChange = async ({ version, keys = [] } = {}) => {
	try {
		const result = await showDraft(() => revert(version, keys));
		const { versions, current } = useDraftStore.getState();
		const made = versions.find(({ id }) => id === current);
		const done = result.changed?.length
			? opLabel(result.changed[0])
			: made && changeLabel(made, versions, variations);
		return { done: done ? [done] : [], kept: result.kept ?? [] };
	} catch (error) {
		if (!(error?.data?.status >= 400 && error.data.status < 500)) throw error;
		return { done: [], refused: error.message, code: error.code };
	}
};
