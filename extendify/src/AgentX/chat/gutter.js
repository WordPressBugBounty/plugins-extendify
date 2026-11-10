import { AbilityAsk } from '@agentx/chat/AbilityAsk';
import { ChooseMany } from '@agentx/chat/ChooseMany';
import { ConfirmBlock } from '@agentx/chat/ConfirmBlock';
import { ImageStep } from '@agentx/chat/ImageStep';
import { LeaveForm } from '@agentx/chat/LeaveForm';
import { PageChoice } from '@agentx/chat/PageChoice';
import { abilityOf } from '@agentx/lib/abilities';

export const GUTTER = {
	'leave-form': LeaveForm,
	'confirm-block': ConfirmBlock,
	'choose-page': PageChoice,
	'media-upload': ImageStep,
	'choose-many': ChooseMany,
};

// Abilities come and go with the site's plugins, so every one that asks without a form shares one card.
export const gutterOf = (name) =>
	GUTTER[name] ?? (abilityOf(name) ? AbilityAsk : null);
