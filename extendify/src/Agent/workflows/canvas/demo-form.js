import { DemoForm } from '@agent/workflows/canvas/components/DemoForm';
import {
	nextDemoFormStep,
	updateDemoForm,
} from '@agent/workflows/canvas/components/demo-form-tools';
import { __ } from '@wordpress/i18n';

export default {
	// Nothing to save, so partners never see it.
	available: () => Boolean(window.extSharedData.devbuild),
	id: 'demo-form',
	abilities: [
		'extendify/site-info',
		'extendify/content-list',
		'extendify/content-search',
		'extendify/content-read',
		'extendify/options',
		'extendify/taxonomies',
		'extendify/media',
		'extendify/navigation',
		'extendify/theme-settings',
		updateDemoForm,
		nextDemoFormStep,
	],
	whenFinished: { component: DemoForm, canvas: true },
	example: {
		// translators: Extendify is the brand name and stays as-is.
		text: __('Show me the Extendify demo form', 'extendify-local'),
		agentResponse: {
			// translators: The agent has just opened a three-step form the user fills in.
			reply: __(
				"I've opened the demo form for you to fill out. There are three steps. Feel free to ask me any questions or if you need help filling it out.",
				'extendify-local',
			),
			whenFinishedTool: {
				id: 'demo-form',
				labels: {
					confirm: __('Submitted the demo form', 'extendify-local'),
					cancel: __('Closed the demo form', 'extendify-local'),
				},
			},
		},
	},
};
