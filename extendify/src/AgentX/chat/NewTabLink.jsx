import { __ } from '@wordpress/i18n';
import { external, Icon } from '@wordpress/icons';

// Leaving the shell drops the conversation, so links open in a new tab.
export const NewTabLink = ({ children, className = '', ...link }) => (
	<a
		{...link}
		target="_blank"
		rel="noopener noreferrer"
		className={`agentx-focus rounded-xs ${className}`}
	>
		{children}
		<Icon
			icon={external}
			size={14}
			className="ms-0.5 inline-block fill-current align-[-2px]"
		/>
		<span className="sr-only">
			{
				// translators: Read by screen readers right after a link in the AI Agent's chat, saying the link opens in a new browser tab.
				__('(opens in a new tab)', 'extendify-local')
			}
		</span>
	</a>
);
