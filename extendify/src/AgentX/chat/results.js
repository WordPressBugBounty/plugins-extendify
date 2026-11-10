import { AnswerResult } from '@agentx/chat/AnswerResult';
import { ChangeResult } from '@agentx/chat/ChangeResult';
import { MapResult } from '@agentx/chat/MapResult';
import { SettingResult } from '@agentx/chat/SettingResult';
import { SETTING_TOOLS } from '@agentx/lib/settings';
import { getToolName } from 'ai';

// A tool with no view here gets a step that doesn't expand.
const VIEWS = {
	...Object.fromEntries(SETTING_TOOLS.map((name) => [name, SettingResult])),
	'ask-question': AnswerResult,
	'ask-detailed-question': AnswerResult,
	'choose-plugin': AnswerResult,
};

// Embed code shows the place the user picked; words or a link can land elsewhere.
const fromPlace = (op) => {
	const made = op?.op === 'add' ? op.new : op;
	return (
		(op?.op === 'set-map' || made?.type === 'core/html') &&
		Boolean(made?.link || made?.place)
	);
};

export const previewsMap = (part) =>
	getToolName(part) === 'edit-blocks' &&
	Boolean(part.output?.maps?.length) &&
	Boolean(part.input?.ops?.some(fromPlace));

// A change made on a card opens only when it has a picture to show.
export const resultViewOf = (part) => {
	const name = getToolName(part);
	if (name === 'card-change') return part.output?.image && ChangeResult;
	if (previewsMap(part)) return MapResult;
	return VIEWS[name];
};
