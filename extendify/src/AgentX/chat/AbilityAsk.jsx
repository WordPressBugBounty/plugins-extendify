import { OneButtonCard } from '@agentx/chat/OneButtonCard';
import { alreadyOptimized, mediaOf, STATUS } from '@agentx/chat/OptimizeCard';
import {
	abilityNamed,
	abilityOf,
	isDelete,
	runAbility,
} from '@agentx/lib/abilities';
import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { getToolName } from 'ai';

const OPTIMIZE = 'imagify/optimize-media';
const BULK = 'imagify/bulk-optimize';
// Imagify answers these before it spends anything, so asking would only fail.
const BLOCKED = ['invalid_api_key', 'insufficient_quota'];

const asking = (ability, credits) =>
	credits
		? sprintf(
				// translators: %1$s is the name of an action from a WordPress plugin, like "Optimize media". %2$s is that plugin's name, like Imagify. %3$d is how many of the user's Imagify credits it uses. The AI Agent asks before it runs the action.
				_n(
					'Run “%1$s” from %2$s for %3$d credit?',
					'Run “%1$s” from %2$s for %3$d credits?',
					credits,
					'extendify-local',
				),
				ability.label,
				ability.plugin,
				credits,
			)
		: sprintf(
				// translators: %1$s is the name of an action from a WordPress plugin, like "Create product". %2$s is that plugin's name, like WooCommerce. The AI Agent asks before it runs an action that changes the site.
				__('Run “%1$s” from %2$s?', 'extendify-local'),
				ability.label,
				ability.plugin,
			);

export const askCard = (ability, credits) => ({
	text: asking(ability, credits),
	// translators: Button that closes the AI Agent's question about running an action from a WordPress plugin, without running it.
	dismiss: __('Cancel', 'extendify-local'),
	...(isDelete(ability)
		? {
				// translators: Button that runs a WordPress plugin's action that deletes something, once the user confirms it in the AI Agent's chat.
				button: __('Delete', 'extendify-local'),
				danger: true,
			}
		: {
				// translators: Button that lets the AI Agent run an action from a WordPress plugin this one time.
				button: __('Allow', 'extendify-local'),
			}),
});

export const AbilityAsk = ({ part, onAnswer, onDirty, onTyped }) => {
	const name = abilityOf(getToolName(part));
	const ability = abilityNamed(name);
	const [credits, setCredits] = useState();
	const [checked, setChecked] = useState(![OPTIMIZE, BULK].includes(name));
	const [busy, setBusy] = useState(false);

	// Imagify runs nothing without confirm, so this only reads the cost.
	useEffect(() => {
		if (checked) return;
		Promise.all([
			runAbility(name, part.input, { confirm: false }),
			name === OPTIMIZE
				? runAbility(STATUS, mediaOf(part.input)).catch(() => null)
				: null,
		])
			.then(([preview, status]) => {
				if (BLOCKED.includes(preview?.status)) {
					return onAnswer(async () => ({
						refused: preview.message || preview.status,
					}));
				}
				if (alreadyOptimized(status, part.input)) {
					return onAnswer(async () => ({ ...status, already: true }));
				}
				setCredits(preview?.impact?.count);
				setChecked(true);
			})
			// Imagify still checks the run itself, so the ask goes on without the cost.
			.catch(() => setChecked(true));
	}, []);

	useEffect(() => {
		onDirty(busy);
		return () => onDirty(false);
	}, [busy, onDirty]);

	if (!ability || !checked) return null;

	const answer = async (save) => {
		setBusy(true);
		try {
			await onAnswer(save);
		} catch {
			setBusy(false);
		}
	};

	// A failed run goes back to the agent instead of a retry card.
	const run = () =>
		runAbility(name, part.input).catch((error) => ({
			refused: error?.message || String(error),
		}));

	const card = askCard(ability, credits);

	return (
		<OneButtonCard
			{...card}
			busy={busy}
			onPress={() => answer(run)}
			onTyped={onTyped}
			onDismiss={() =>
				answer(async () => ({
					canceled: true,
					done: sprintf(
						// translators: %s is the name of an action from a WordPress plugin, like "Create product". A finished step in the AI Agent's chat, after the user chose not to run it.
						__('Canceled “%s”', 'extendify-local'),
						ability.label,
					),
				}))
			}
			demo={Boolean(part.demoState)}
		/>
	);
};
