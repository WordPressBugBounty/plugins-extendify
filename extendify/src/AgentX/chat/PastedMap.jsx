import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Pasted embed code carries its own address; every other map is one the site works out.
export const PastedMap = ({ src, embed, link }) => {
	const [drawn, setDrawn] = useState(src ?? null);

	useEffect(() => {
		setDrawn(src ?? null);
		if (src || (!embed && !link)) return;
		let shown = true;
		apiFetch({
			path: '/extendify/v1/agentx/map-preview',
			method: 'POST',
			data: embed ? { embed } : { link },
		})
			.then((answer) => shown && setDrawn(answer?.src ?? null))
			// A link that names no place stays the words the user wrote.
			.catch(() => {});
		return () => {
			shown = false;
		};
	}, [src, embed, link]);

	if (!drawn) return null;

	return (
		<iframe
			src={drawn}
			// translators: The name screen readers give a small copy, in the AI Agent's chat, of a map the user pasted into their message.
			title={__('The map you sent', 'extendify-local')}
			loading="lazy"
			referrerPolicy="no-referrer-when-downgrade"
			className="mt-1.5 block h-32 w-56 max-w-full rounded-agentx-control border-0 first:mt-0"
		/>
	);
};
