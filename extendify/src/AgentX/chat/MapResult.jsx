import { __ } from '@wordpress/i18n';

// From the address the page draws, so a wrong place shows before saving.
export const MapResult = ({ part }) => (
	<iframe
		src={part.output.maps[0]}
		// translators: The name screen readers give a small copy, in the AI Agent's chat, of a map it just put on the user's web page.
		title={__('Map preview', 'extendify-local')}
		loading="lazy"
		referrerPolicy="no-referrer-when-downgrade"
		className="h-48 w-full max-w-sm self-start rounded-agentx-control border-0"
	/>
);
