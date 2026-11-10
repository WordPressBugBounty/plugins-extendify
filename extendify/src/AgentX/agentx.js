import { AdminAgent } from '@agentx/AdminAgent';
import { openOnShow } from '@agentx/lib/open-on-show';
import { track } from '@agentx/lib/track';
import { Shell } from '@agentx/Shell';
import { render } from '@shared/lib/dom';
import domReady from '@wordpress/dom-ready';
import '@agentx/agentx.css';

openOnShow();

domReady(() => {
	const { session } = window.extAgentXData ?? {};
	if (session?.started) track('session-started', { session: session.number });
	const root = document.getElementById('extendify-agentx-shell');
	if (root) render(<Shell data={window.extAgentXData} />, root);
	const admin = document.getElementById('extendify-agentx-admin');
	if (admin) render(<AdminAgent data={window.extAgentXData} />, admin);
});
