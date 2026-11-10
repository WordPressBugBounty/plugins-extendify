import { CAPS, profileOf, TONES } from '@agentx/lib/profile';
import { saveSetting } from '@agentx/lib/settings';
import { __, sprintf } from '@wordpress/i18n';

const questionOf = (setting) =>
	setting === 'title'
		? // translators: The AI Agent's question above the site titles it suggests, with a field under them for the user's own. Asked of the user; a site title is the name shown at the top of the website.
			__('Which site title would you like?', 'extendify-local')
		: // translators: The AI Agent's question above the site taglines it suggests, with a field under them for the user's own. Asked of the user; a tagline is the short line shown under the site title.
			__('Which tagline would you like?', 'extendify-local');

// One plugin to offer asks yes or no, not a pick of one.
const singlePlugin = ({ slug, name, description }) => ({
	text: sprintf(
		// translators: %1$s is the name of a WordPress plugin and %2$s one short sentence on what it does. The AI Agent asks the user whether to install the one plugin it suggests.
		__('Install %1$s? %2$s', 'extendify-local'),
		name,
		description,
	),
	// translators: Button that installs and turns on the one plugin the AI Agent suggests.
	button: __('Install', 'extendify-local'),
	// translators: Button that closes the AI Agent's question about installing a plugin, installing nothing.
	dismiss: __('Cancel', 'extendify-local'),
	details: {
		href: `https://wordpress.org/plugins/${encodeURIComponent(slug)}/`,
		// translators: Link on the AI Agent's card asking to install a plugin; opens the plugin's page on WordPress.org in a new tab.
		text: __('Plugin details', 'extendify-local'),
	},
	option: { title: name, description, value: slug },
	icon: 'plug',
});

// Waiting tools: what each card shows, and what an answer does before going back.
export const CARDS = {
	'choose-setting': ({ input }) => ({
		question: questionOf(input.setting),
		options: input.suggestions,
		submitLabel: __('Save', 'extendify-local'),
		failedText:
			// translators: Shown on the AI Agent's card of suggested site titles or taglines when saving the user's pick failed.
			__("Couldn't save it. Please try again.", 'extendify-local'),
		answer: (value) => saveSetting(input.setting, value),
	}),
	'ask-question': (part) => ({
		question: part.input.question,
		options: part.input.options ?? [],
		blocks: part.input.blocks ?? [],
		blocking: Boolean(part.input.blocking),
		submitLabel:
			// translators: Button that sends the answer the user typed on the AI Agent's question card.
			__('Send', 'extendify-local'),
		answer: async (value) => ({ answer: value }),
	}),
	'ask-detailed-question': (part) => ({
		...CARDS['ask-question'](part),
		answer: async (picked) =>
			typeof picked === 'string'
				? { answer: picked }
				: {
						answer: picked.title,
						...(picked.value && { value: picked.value }),
					},
	}),
	'ask-form': ({ input }) => ({
		title: input.title,
		fields: input.fields,
		submitLabel:
			input.submitLabel ||
			// translators: Button that sends what the user filled in on the AI Agent's form card.
			__('Send', 'extendify-local'),
		answer: async (values) => ({ values }),
	}),
	'edit-site-profile': () => {
		const profile = profileOf();
		return {
			// translators: Title of the AI Agent's form card where the user edits their website's name, tagline, description and tone.
			title: __('Your site profile', 'extendify-local'),
			fields: [
				{
					name: 'name',
					// translators: Label of the field for the website's name, in the AI Agent's site profile form.
					label: __('Site title', 'extendify-local'),
					type: 'text',
					required: true,
					maxLength: CAPS.name,
					value: profile.name,
				},
				{
					name: 'tagline',
					// translators: Label of the field for the website's tagline, the short line under its name, in the AI Agent's site profile form.
					label: __('Tagline', 'extendify-local'),
					type: 'text',
					maxLength: CAPS.tagline,
					value: profile.tagline,
				},
				{
					name: 'about',
					// translators: Label of the field where the user describes their business, in the AI Agent's site profile form.
					label: __('About your business', 'extendify-local'),
					type: 'textarea',
					maxLength: CAPS.about,
					value: profile.about,
				},
				{
					name: 'tone',
					// translators: Label of the pick list for the tone of voice of the website's writing, in the AI Agent's site profile form.
					label: __('Tone', 'extendify-local'),
					type: 'select',
					options: TONES,
					value: profile.tone,
				},
			],
			// translators: Button that saves the user's site profile in the AI Agent's form card.
			submitLabel: __('Save', 'extendify-local'),
			labels: {
				// translators: A finished step in the AI Agent's chat, after the user saved their site profile.
				done: __('Updated your site profile', 'extendify-local'),
				// translators: A failed step in the AI Agent's chat, when saving the user's site profile didn't work.
				failed: __("Couldn't update your site profile", 'extendify-local'),
			},
		};
	},
	'choose-plugin': (part) => ({
		...CARDS['ask-question']({
			input: {
				question: part.input.question,
				options: part.input.plugins.map(({ slug, name, description }) => ({
					title: name,
					description,
					value: slug,
				})),
			},
		}),
		...(part.input.plugins.length === 1 && {
			single: singlePlugin(part.input.plugins[0]),
		}),
		answer: async (picked) =>
			typeof picked === 'string'
				? { answer: picked }
				: {
						picked: { slug: picked.value, name: picked.title },
						done: sprintf(
							// translators: %s is the name of a WordPress plugin. A finished step in the AI Agent's chat, after the user picked that plugin to install.
							__('Picked %s', 'extendify-local'),
							picked.title,
						),
					},
	}),
};
