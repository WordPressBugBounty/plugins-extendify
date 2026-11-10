import { InlineCard } from '@agentx/chat/InlineCard';
import { LayoutOptions } from '@agentx/chat/LayoutOptions';
import { __ } from '@wordpress/i18n';
import { layout } from '@wordpress/icons';

export const LayoutCard = ({ part, latest, takesFocus }) => (
	<InlineCard
		part={part}
		latest={latest}
		cancel
		holds
		takesFocus={takesFocus}
		icon={layout}
		// translators: Heading of the AI Agent's card for trying a different ready-made design for the top section of the site's home page.
		title={__('Try a new layout', 'extendify-local')}
		subtitle={
			// translators: Shown under the heading of the AI Agent's layout card, which lists ready-made designs for the top section of the site's home page.
			__('Pick a ready-made top section for your home page.', 'extendify-local')
		}
	>
		<LayoutOptions samples={part.demoState?.layouts} live={latest} />
	</InlineCard>
);
