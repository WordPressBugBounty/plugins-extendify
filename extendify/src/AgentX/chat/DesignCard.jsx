import { PlayAgain } from '@agentx/chat/AnimationOptions';
import { InlineCard } from '@agentx/chat/InlineCard';
import { DesignStep, designTabs } from '@agentx/guide/DesignStep';
import { noteChange } from '@agentx/lib/card-changes';
import { designOptions } from '@agentx/lib/design';
import { useInView } from '@agentx/lib/hooks';
import { madeOptionsOf } from '@agentx/lib/made-colors';
import { madeFontsOf } from '@agentx/lib/made-fonts';
import { madeStylesOf } from '@agentx/lib/made-styles';
import { useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { settings } from '@wordpress/icons';

const CHANGED = {
	// translators: A finished step in the AI Agent's chat, after the user picked new colors for their site on its card.
	colors: () => __('Changed your colors', 'extendify-local'),
	// translators: A finished step in the AI Agent's chat, after the user picked new fonts for their site on its card.
	fonts: () => __('Changed your fonts', 'extendify-local'),
	// translators: A finished step in the AI Agent's chat, after the user picked a new style, like corners and spacing, for their site on its card.
	vibe: () => __('Changed your style', 'extendify-local'),
	// translators: A finished step in the AI Agent's chat, after the user picked a new animation for how their site's sections move into view.
	animation: () => __('Changed your animation', 'extendify-local'),
};

// The Site Guide's design step, so the chat picks from the same tiles.
export const DesignCard = ({ part, latest, takesFocus }) => {
	const tabs = designTabs().map(({ id }) => id);
	const [tab, setTab] = useState(
		tabs.includes(part.input?.tab) ? part.input.tab : tabs[0],
	);
	const body = useRef(null);
	const inView = useInView(body);
	const { made, styles, fonts } = part.input ?? {};
	const optionsOf = (layer) => {
		if (layer === 'colors' && made) return madeOptionsOf(made)(layer);
		if (layer === 'vibe' && styles) return madeStylesOf(styles)(layer);
		if (layer === 'fonts' && fonts) return madeFontsOf(fonts)(layer);
		return designOptions(layer);
	};

	return (
		<InlineCard
			part={part}
			latest={latest}
			cancel
			holds
			takesFocus={takesFocus}
			icon={settings}
			// translators: Heading of the AI Agent's card for trying colors, fonts, style and animation on the site.
			title={__('Adjust your design', 'extendify-local')}
			subtitle={
				// translators: Shown under the heading of the AI Agent's design card.
				__('Fine-tune colors, fonts, style and animation.', 'extendify-local')
			}
		>
			<div ref={body} className="flex flex-col gap-3">
				<DesignStep
					stage={tab}
					onStage={setTab}
					// Only the newest card warms, so older ones in the conversation don't render pages too.
					active={Boolean(latest && inView)}
					onPicked={(kind) => noteChange({ kind, done: CHANGED[kind]() })}
					optionsOf={made || styles || fonts ? optionsOf : undefined}
				/>
				{tab === 'animation' && <PlayAgain />}
			</div>
		</InlineCard>
	);
};
