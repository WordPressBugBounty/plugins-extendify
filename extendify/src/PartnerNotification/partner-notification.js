import { render } from '@shared/lib/dom';
import domReady from '@wordpress/dom-ready';
import { PartnerNotification } from './PartnerNotification';
import './partner-notification.css';

domReady(() => {
	for (const node of document.querySelectorAll(
		'[data-ext-partner-notification]',
	)) {
		render(
			<div className="mt-10 mr-5">
				<PartnerNotification slot={node.dataset.slot} />
			</div>,
			node,
		);
	}
});
