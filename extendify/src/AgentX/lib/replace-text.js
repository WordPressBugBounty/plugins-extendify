import { opLabel } from '@agentx/lib/changes';
import { replaceText as replace } from '@agentx/lib/draft';
import { showDraft } from '@agentx/lib/show-draft';

// A refusal is the tool's answer, for the agent to explain; any other failure throws and reaches it as an error.
export const replaceText = async ({
	pairs = [],
	block = '',
	keep,
	turn,
} = {}) => {
	try {
		const {
			changed = [],
			profile = false,
			others = [],
		} = await showDraft(() => replace(pairs, { block, keep, turn }));
		// Words found nowhere are refused, so the agent never reports them changed.
		if (pairs.length && !changed.length && !profile && !others.length) {
			return {
				done: [],
				refused: 'None of those words are on the site.',
				code: 'no_match',
			};
		}
		return {
			done: [...new Set(changed.map(opLabel))],
			pages: [...new Set(changed.map(({ title }) => title).filter(Boolean))],
			profile,
			...(others.length && { others }),
		};
	} catch (error) {
		if (!(error?.data?.status >= 400 && error.data.status < 500)) throw error;
		return { done: [], refused: error.message, code: error.code };
	}
};
