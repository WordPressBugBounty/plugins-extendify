import { PLUGIN_LOGOS } from '@agentx/chat/CardBadge';
import { ADJUST_COLORS } from '@agentx/chat/color-turn';
import { imagifyUpgrade } from '@agentx/chat/proactive';
import { abilityNamed } from '@agentx/lib/abilities';
import {
	activePlugin,
	canInstall,
	imagifyKey,
	installCall,
} from '@agentx/lib/plugins';
import { ago, launchedAt } from '@agentx/lib/when';
import { useChangedStore } from '@agentx/state/changed';
import { useImagesStore } from '@agentx/state/images';
import { useProfileStore } from '@agentx/state/profile';
import { useSettingsStore } from '@agentx/state/settings';
import { __, sprintf } from '@wordpress/i18n';

// Its text is the request itself, so sending it unchanged opens its workflow.
// With no group, it stays out of the list opened by /.
const request = (id, workflow, group, text) => ({
	id,
	text,
	type: 'placeholder',
	details: { workflow },
	group,
});

const setting = (id, group, text) => request(id, id, group, text);

// A page just made is a draft, so publishing it is very likely next.
const publishSuggestion = (page) => ({
	id: 'publish-page',
	text: sprintf(
		// translators: %s is the title of a page the AI Agent just made as a draft. A request written as the user to the agent, to publish it. Shown as the chat box's placeholder for the user to send with Tab; keep it short.
		__('Publish the “%s” page', 'extendify-local'),
		page.title,
	),
	type: 'action',
	card: {
		text: sprintf(
			// translators: %s is the title of a page the AI Agent just made as a draft. Asked on a card under its reply, over a button that publishes the page.
			__('Do you want to publish “%s” next?', 'extendify-local'),
			page.title,
		),
		// translators: Button on a card under the AI Agent's reply that publishes the page it just made.
		button: __('Publish page', 'extendify-local'),
		icon: 'rocket',
	},
	details: {
		workflow: 'page-status',
		tool: 'set-page-status',
		input: {
			url: page.url,
			title: page.title,
			type: 'page',
			status: 'publish',
		},
		// translators: Shown by the AI Agent while it publishes a page the user asked it to.
		title: __('Publishing the page', 'extendify-local'),
		labels: {
			// translators: A finished step in the AI Agent's chat, after it published a page.
			done: __('Published the page', 'extendify-local'),
			// translators: A failed step in the AI Agent's chat, when publishing a page didn't work.
			failed: __("Couldn't publish the page", 'extendify-local'),
		},
	},
});

// A post is saved as a draft, so publishing it is very likely next.
const publishPostSuggestion = (post) => ({
	id: 'publish-post',
	text: sprintf(
		// translators: %s is the title of a blog post the AI Agent just saved as a draft. A request written as the user to the agent, to publish it. Shown as the chat box's placeholder for the user to send with Tab; keep it short.
		__('Publish the “%s” post', 'extendify-local'),
		post.title,
	),
	type: 'action',
	card: {
		text: sprintf(
			// translators: %s is the title of a page the AI Agent just made as a draft. Asked on a card under its reply, over a button that publishes the page.
			__('Do you want to publish “%s” next?', 'extendify-local'),
			post.title,
		),
		// translators: Button on a card under the AI Agent's reply that publishes the blog post it just saved as a draft.
		button: __('Publish post', 'extendify-local'),
		icon: 'rocket',
	},
	details: {
		workflow: 'page-status',
		tool: 'set-page-status',
		input: {
			url: post.url,
			title: post.title,
			type: 'post',
			status: 'publish',
		},
		// translators: Shown by the AI Agent while it publishes a blog post the user asked it to.
		title: __('Publishing the post', 'extendify-local'),
		labels: {
			// translators: A finished step in the AI Agent's chat, after it published a blog post.
			done: __('Published the post', 'extendify-local'),
			// translators: A failed step in the AI Agent's chat, when publishing a blog post didn't work.
			failed: __("Couldn't publish the post", 'extendify-local'),
		},
	},
});

// Its card's input is read when it's taken, after the closing line's own fix.
const colorsSuggestion = () => ({
	id: ADJUST_COLORS,
	text:
		// translators: A request written as the user to the AI Agent, to fine-tune the background and text colors it just changed so the words read. Shown as the user's message once they take the card; keep it short.
		__('Adjust the colors', 'extendify-local'),
	type: 'action',
	// The agent asks about the very color it changed; this asks only when it wrote nothing.
	card: {
		fallback:
			// translators: Asked on a card under the AI Agent's reply, over a button that opens a card for adjusting the background and text colors it just chose itself.
			__('Do you want to adjust the new colors?', 'extendify-local'),
		// translators: Button on a card under the AI Agent's reply that opens a card for adjusting the background and text colors it just changed.
		button: __('Adjust colors', 'extendify-local'),
		icon: 'palette',
	},
	details: {
		workflow: 'block-edit',
		tool: ADJUST_COLORS,
		// translators: Shown by the AI Agent while it opens its card for adjusting colors.
		title: __('Showing colors to adjust', 'extendify-local'),
		labels: {
			// translators: A finished step in the AI Agent's chat, after it showed a card for adjusting colors.
			done: __('Showed colors to adjust', 'extendify-local'),
			// translators: A failed step in the AI Agent's chat, when its card for adjusting colors couldn't show.
			failed: __("Couldn't show the colors", 'extendify-local'),
		},
	},
});

const menuSuggestion = (page) => ({
	id: 'add-to-menu',
	text: sprintf(
		// translators: %s is the title of a page the AI Agent just made. A request written as the user to the agent, to add a link to that page to the site's menu. Shown as the chat box's placeholder for the user to send with Tab; keep it short.
		__('Add the “%s” page to the menu', 'extendify-local'),
		page.title,
	),
	type: 'action',
	card: {
		text: sprintf(
			// translators: %s is the title of a page the AI Agent just made. Asked on a card under its reply, over a button that asks the agent to add the page to the site's menu.
			__('Do you want to add “%s” to the menu next?', 'extendify-local'),
			page.title,
		),
		// translators: Button on a card under the AI Agent's reply that asks it to add the page it just made to the site's menu.
		button: __('Add to menu', 'extendify-local'),
		icon: 'browser',
	},
	details: { workflow: 'block-edit' },
});

// Offered only under a Christmas look, so it's no request in the list of things to ask for.
const snowSuggestion = () => ({
	id: 'snow',
	text:
		// translators: A request written as the user to the AI Agent, to show falling snow over their whole website. Shown as the chat box's placeholder for the user to send with Tab; keep it short.
		__('Add falling snow to my site', 'extendify-local'),
	type: 'action',
	card: {
		text:
			// translators: Asked on a card under the AI Agent's reply after it gave the site a Christmas look, over a button that shows falling snow over the whole website.
			__(
				'Want to add some falling snow over your site? You can remove this later.',
				'extendify-local',
			),
		// translators: Button on a card under the AI Agent's reply that shows falling snow over the whole website.
		button: __('Add snow', 'extendify-local'),
		icon: 'snow',
	},
	details: {
		workflow: 'canvas',
		tool: 'update-canvas',
		input: { canvas: 'snow' },
		// translators: Shown by the AI Agent while it adds falling snow over the whole website.
		title: __('Adding snow', 'extendify-local'),
		labels: {
			// translators: A finished step in the AI Agent's chat, after it added falling snow over the whole website.
			done: __('Added snow', 'extendify-local'),
			// translators: A failed step in the AI Agent's chat, when adding falling snow over the website didn't work.
			failed: __("Couldn't add snow", 'extendify-local'),
		},
	},
});

const storeSuggestion = () => ({
	id: 'setup-store',
	text:
		// translators: Sent for the user in the AI Agent's chat when they press Set up your store on its card; it opens the store setup guide.
		__('Set up my store', 'extendify-local'),
	type: 'action',
	card: {
		// translators: Asked on the AI Agent's card on a website that sells with WooCommerce and whose store isn't set up yet, over a button that opens the store setup.
		text: __('Do you want to set up your store?', 'extendify-local'),
		// translators: Button on the AI Agent's card on a website whose store isn't set up yet, that opens the store setup guide.
		button: __('Set up store', 'extendify-local'),
		icon: 'store',
	},
	details: { storeGuide: true },
});

const logoRequest = () =>
	// translators: A request written as the user to the AI Agent, to change the site's logo. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
	__('Change website logo', 'extendify-local');

const iconRequest = () =>
	// translators: A request written as the user to the AI Agent, to change the site icon, the small image in browser tabs. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
	__('Change website browser icon', 'extendify-local');

const colorsRequest = () =>
	// translators: A request written as the user to the AI Agent, to change the site's colors. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
	__('Change website colors', 'extendify-local');

const fontsRequest = () =>
	// translators: A request written as the user to the AI Agent, to change the site's fonts. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
	__('Change website fonts', 'extendify-local');

const styleRequest = () =>
	// translators: A request written as the user to the AI Agent, to change the site's style, like its corners and spacing. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
	__('Change website style', 'extendify-local');

const animationRequest = () =>
	// translators: A request written as the user to the AI Agent, to change how the site's sections animate into view. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
	__('Change website animation', 'extendify-local');

const taglineRequest = () =>
	// translators: A request written as the user to the AI Agent, to change the site's tagline, the short line under its title. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
	__('Change website tagline', 'extendify-local');

const publishSiteRequest = () =>
	// translators: A request written as the user to the AI Agent, to take the site out of Coming Soon mode so visitors see it. Shown as the chat box's placeholder for the user to send with Tab, and sent when the user presses Publish on a card in the chat; keep it short.
	__('Make my site live', 'extendify-local');

const PROFILE_FORM = { workflow: 'site-profile', form: 'edit-site-profile' };

// The three values the profile form holds, so updating one reviews them all.
export const PROFILE_REFRESHES = [
	'refresh-title',
	'refresh-tagline',
	'refresh-description',
];

const refresh = (id, label, note, shows, details) => ({
	id,
	text: label,
	type: 'refresh',
	details: { label, note, ...shows, ...details },
});

// A value never changed since launch has no stamp, so the build time stands in.
const changedAgo = (key) => {
	const at = useChangedStore.getState()[key] ?? launchedAt();
	return at ? ago(at) : null;
};

const refreshes = () => {
	const { title, description } = useSettingsStore.getState();
	const { about } = useProfileStore.getState();
	const { logo, icon } = useImagesStore.getState();
	const titleAgo = changedAgo('title');
	const taglineAgo = changedAgo('description');
	const aboutAgo = changedAgo('about');
	const logoAgo = changedAgo('logo');
	const iconAgo = changedAgo('icon');
	return [
		title?.trim() &&
			refresh(
				'refresh-title',
				// translators: Names the website's title on a card in the AI Agent's chat that shows it for the user to keep or update.
				__('Site title', 'extendify-local'),
				titleAgo
					? sprintf(
							// translators: On a card in the AI Agent's chat, above the website's title. %s says how long ago, like "3 months ago".
							__(
								'Your site title was last updated %s. Want to refresh it?',
								'extendify-local',
							),
							titleAgo,
						)
					: // translators: Asks on a card in the AI Agent's chat, above the website's title, whether it is still right.
						__('Is your site title still right?', 'extendify-local'),
				{
					value: title,
					icon: 'text',
					// translators: The small label atop a card in the AI Agent's chat that shows the website's title for the user to keep or update.
					kind: __('Site title refresh', 'extendify-local'),
				},
				PROFILE_FORM,
			),
		description?.trim() &&
			refresh(
				'refresh-tagline',
				// translators: Names the website's tagline, the short line under its title, on a card in the AI Agent's chat that shows it for the user to keep or update.
				__('Tagline', 'extendify-local'),
				taglineAgo
					? sprintf(
							// translators: On a card in the AI Agent's chat, above the website's tagline. %s says how long ago, like "3 months ago".
							__(
								'Your tagline was last updated %s. Want to refresh it?',
								'extendify-local',
							),
							taglineAgo,
						)
					: // translators: Asks on a card in the AI Agent's chat, above the website's tagline, whether it is still right.
						__('Is your tagline still right?', 'extendify-local'),
				{
					value: description,
					icon: 'text',
					// translators: The small label atop a card in the AI Agent's chat that shows the website's tagline, the short line under its title, for the user to keep or update.
					kind: __('Tagline refresh', 'extendify-local'),
				},
				PROFILE_FORM,
			),
		about?.trim() &&
			refresh(
				'refresh-description',
				// translators: Names the website's description, a few sentences about the business, on a card in the AI Agent's chat that shows it for the user to keep or update.
				__('Site description', 'extendify-local'),
				aboutAgo
					? sprintf(
							// translators: On a card in the AI Agent's chat, above the website's description. %s says how long ago, like "3 months ago".
							__(
								'Your site description was last updated %s. Want to refresh it?',
								'extendify-local',
							),
							aboutAgo,
						)
					: // translators: Asks on a card in the AI Agent's chat, above the website's description, whether it is still right.
						__('Is your site description still right?', 'extendify-local'),
				{
					value: about,
					icon: 'text',
					// translators: The small label atop a card in the AI Agent's chat that shows the website's description, a few sentences about the business, for the user to keep or update.
					kind: __('Site description refresh', 'extendify-local'),
				},
				PROFILE_FORM,
			),
		logo &&
			refresh(
				'refresh-logo',
				// translators: Names the website's logo on a card in the AI Agent's chat that shows it for the user to keep or update.
				__('Logo', 'extendify-local'),
				logoAgo
					? sprintf(
							// translators: On a card in the AI Agent's chat, above the website's logo. %s says how long ago, like "3 months ago".
							__(
								'Your site logo was last updated %s. Want to refresh it?',
								'extendify-local',
							),
							logoAgo,
						)
					: // translators: Asks on a card in the AI Agent's chat, above the website's logo, whether it is still right.
						__('Is your logo still right?', 'extendify-local'),
				{
					image: logo,
					icon: 'image',
					// translators: The small label atop a card in the AI Agent's chat that shows the website's logo for the user to keep or update.
					kind: __('Site logo refresh', 'extendify-local'),
				},
				{
					workflow: 'logo',
					request: logoRequest(),
					// translators: Button on a card in the AI Agent's chat that asks whether to add a logo next: starts adding one.
					action: __('Add logo', 'extendify-local'),
				},
			),
		icon &&
			refresh(
				'refresh-icon',
				// translators: Names the site icon, the small image in browser tabs, on a card in the AI Agent's chat that shows it for the user to keep or update.
				__('Site icon', 'extendify-local'),
				iconAgo
					? sprintf(
							// translators: On a card in the AI Agent's chat, above the site icon, the small image in browser tabs. %s says how long ago, like "3 months ago".
							__(
								'Your site icon was last updated %s. Want to refresh it?',
								'extendify-local',
							),
							iconAgo,
						)
					: // translators: Asks on a card in the AI Agent's chat, above the site icon, whether it is still right.
						__('Is your site icon still right?', 'extendify-local'),
				{
					image: icon,
					icon: 'browser',
					// translators: The small label atop a card in the AI Agent's chat that shows the site icon, the small image in browser tabs, for the user to keep or update.
					kind: __('Site icon refresh', 'extendify-local'),
				},
				{ workflow: 'site-icon', request: iconRequest() },
			),
	].filter(Boolean);
};

// The note is the short fact the bell lists; the card says the kind and asks.
const setup = (id, label, note, shows, details) => ({
	id,
	text: label,
	type: 'setup',
	details: { label, note, ...shows, ...details },
});

const designCard = (id, label, note, icon, workflow, request, card) =>
	setup(
		id,
		label,
		note,
		{ icon, ...card },
		{
			workflow,
			request,
			action: card.action,
		},
	);

const setups = () => {
	const launched = launchedAt();
	const built = launched ? ago(launched) : null;
	return [
		setup(
			'setup-logo',
			// translators: Names the website's logo on a card in the AI Agent's chat that says the site has none yet.
			__('Logo', 'extendify-local'),
			// translators: On a card in the AI Agent's chat, above a button to add one.
			__("Your site doesn't have a logo yet.", 'extendify-local'),
			{
				icon: 'image',
				// translators: Asked on a card in the AI Agent's chat, over a button that starts adding a logo to the website.
				question: __('Do you want to add a logo next?', 'extendify-local'),
				// translators: The small label atop a card in the AI Agent's chat that says the website has no logo yet.
				kind: __('Site logo setup', 'extendify-local'),
				bell: {
					// translators: A request written as the user to the AI Agent, which a task under its bell puts in the chat: the website has no logo yet.
					message: __('Help me add a logo', 'extendify-local'),
				},
				// translators: On a card in the AI Agent's chat that says the website has no logo yet, above a button to add one.
				ask: __(
					"I noticed you still don't have a site logo set. Want to do that now?",
					'extendify-local',
				),
			},
			{ workflow: 'logo', request: logoRequest() },
		),
		setup(
			'setup-icon',
			// translators: Names the site icon, the small image in browser tabs, on a card in the AI Agent's chat that says the site has none yet.
			__('Site icon', 'extendify-local'),
			// translators: On a card in the AI Agent's chat, above a button to add one. The site icon is the small image in browser tabs.
			__("Your site doesn't have a site icon yet.", 'extendify-local'),
			{
				icon: 'browser',
				// translators: Asked on a card in the AI Agent's chat, over a button that starts adding a site icon, the small image in browser tabs.
				question: __('Do you want to add a site icon next?', 'extendify-local'),
				// translators: The small label atop a card in the AI Agent's chat that says the website has no site icon, the small image in browser tabs, yet.
				kind: __('Site icon setup', 'extendify-local'),
				bell: {
					// translators: A request written as the user to the AI Agent, which a task under its bell puts in the chat: the website has no site icon, the small image in browser tabs, yet.
					message: __('Help me add a site icon', 'extendify-local'),
				},
				// translators: On a card in the AI Agent's chat that says the website has no site icon yet, above a button to add one. The site icon is the small image in browser tabs.
				ask: __(
					"I noticed you still don't have a site icon set. Want to do that now?",
					'extendify-local',
				),
			},
			{
				workflow: 'site-icon',
				request: iconRequest(),
				// translators: Button on a card in the AI Agent's chat that asks whether to add a site icon next: starts adding one.
				action: __('Add site icon', 'extendify-local'),
			},
		),
		setup(
			'setup-tagline',
			// translators: Names the website's tagline, the short line under its title, on a card in the AI Agent's chat that says the site has none yet.
			__('Tagline', 'extendify-local'),
			// translators: On a card in the AI Agent's chat, above a button to add one. The tagline is the short line under the website's title.
			__("Your site doesn't have a tagline yet.", 'extendify-local'),
			{
				icon: 'text',
				// translators: Asked on a card in the AI Agent's chat, over a button that starts writing a tagline, the short line under the website's title.
				question: __('Do you want to add a tagline next?', 'extendify-local'),
				// translators: The small label atop a card in the AI Agent's chat that says the website has no tagline, the short line under its title, yet.
				kind: __('Tagline setup', 'extendify-local'),
				bell: {
					// translators: A request written as the user to the AI Agent, which a task under its bell puts in the chat: the website has no tagline, the short line under its title, yet.
					message: __('Help me write a tagline', 'extendify-local'),
				},
				// translators: On a card in the AI Agent's chat that says the website has no tagline yet, above a button to add one. The tagline is the short line under the website's title.
				ask: __(
					"I noticed you still don't have a tagline set. Want to do that now?",
					'extendify-local',
				),
			},
			{
				workflow: 'tagline',
				request: taglineRequest(),
				// translators: Button on a card in the AI Agent's chat that asks whether to add a tagline next: starts writing one.
				action: __('Add tagline', 'extendify-local'),
			},
		),
		setup(
			'setup-publish',
			// translators: Names whether visitors can see the website, on a card in the AI Agent's chat that says the site isn't live yet.
			__('Site visibility', 'extendify-local'),
			// translators: On a card in the AI Agent's chat, above a button to make the website live.
			__(
				"Your site isn't live yet, so visitors see a Coming Soon page.",
				'extendify-local',
			),
			{
				icon: 'rocket',
				// translators: Asked on a card in the AI Agent's chat, over a button that makes the website live.
				question: __(
					'Do you want to publish your site next?',
					'extendify-local',
				),
				// translators: The small label atop a card in the AI Agent's chat that says the website isn't live yet.
				kind: __('Site launch', 'extendify-local'),
				bell: {
					// translators: A request written as the user to the AI Agent, which a task under its bell puts in the chat: the website isn't live yet, so visitors see a Coming Soon page.
					message: __('Help me publish my site', 'extendify-local'),
				},
				// translators: On a card in the AI Agent's chat, above a button to make the website live.
				ask: __(
					"I noticed your site isn't live yet, so visitors see a Coming Soon page. Want to publish it now?",
					'extendify-local',
				),
			},
			{
				workflow: 'site-visibility',
				request: publishSiteRequest(),
				// translators: Button on a card in the AI Agent's chat that asks whether to publish the website next: makes it live.
				action: __('Publish site', 'extendify-local'),
			},
		),
		designCard(
			'setup-colors',
			// translators: Names the site's colors on a card in the AI Agent's chat that says the site still has the ones it was built with.
			__('Colors', 'extendify-local'),
			// translators: On a card in the AI Agent's chat, above buttons to keep them or try others.
			__('Your site still has the colors it started with.', 'extendify-local'),
			'palette',
			'colors',
			colorsRequest(),
			{
				// translators: Asked on a card in the AI Agent's chat, over a button that starts changing the website's colors.
				question: __('Do you want to try new colors next?', 'extendify-local'),
				// translators: Button on a card in the AI Agent's chat that asks whether to change the website's colors next.
				action: __('Change colors', 'extendify-local'),
				// translators: The small label atop a card in the AI Agent's chat that says the site's colors haven't changed since the website was built.
				kind: __('Colors refresh', 'extendify-local'),
				bell: {
					// translators: A request written as the user to the AI Agent, which a task under its bell puts in the chat: the site still has the colors it was built with.
					message: __('Help me pick new colors', 'extendify-local'),
				},
				ask: built
					? sprintf(
							// translators: On a card in the AI Agent's chat, above buttons to keep them or try others. %s says how long ago, like "3 months ago".
							__(
								"Your colors haven't changed since your site was built %s. Want to try new ones?",
								'extendify-local',
							),
							built,
						)
					: // translators: On a card in the AI Agent's chat, above buttons to keep them or try others.
						__(
							'Your site still has the colors it started with. Want to try new ones?',
							'extendify-local',
						),
			},
		),
		designCard(
			'setup-fonts',
			// translators: Names the site's fonts on a card in the AI Agent's chat that says the site still has the ones it was built with.
			__('Fonts', 'extendify-local'),
			// translators: On a card in the AI Agent's chat, above buttons to keep them or try others.
			__('Your site still has the fonts it started with.', 'extendify-local'),
			'text',
			'fonts',
			fontsRequest(),
			{
				// translators: Asked on a card in the AI Agent's chat, over a button that starts changing the website's fonts.
				question: __('Do you want to try new fonts next?', 'extendify-local'),
				// translators: Button on a card in the AI Agent's chat that asks whether to change the website's fonts next.
				action: __('Change fonts', 'extendify-local'),
				// translators: The small label atop a card in the AI Agent's chat that says the site's fonts haven't changed since the website was built.
				kind: __('Fonts refresh', 'extendify-local'),
				bell: {
					// translators: A request written as the user to the AI Agent, which a task under its bell puts in the chat: the site still has the fonts it was built with.
					message: __('Help me pick new fonts', 'extendify-local'),
				},
				ask: built
					? sprintf(
							// translators: On a card in the AI Agent's chat, above buttons to keep them or try others. %s says how long ago, like "3 months ago".
							__(
								"Your fonts haven't changed since your site was built %s. Want to try new ones?",
								'extendify-local',
							),
							built,
						)
					: // translators: On a card in the AI Agent's chat, above buttons to keep them or try others.
						__(
							'Your site still has the fonts it started with. Want to try new ones?',
							'extendify-local',
						),
			},
		),
		designCard(
			'setup-style',
			// translators: Names the site's style, like its corners and spacing, on a card in the AI Agent's chat that says the site still has the one it was built with.
			__('Style', 'extendify-local'),
			// translators: On a card in the AI Agent's chat, above buttons to keep it or try others. The style is things like the site's corners and spacing.
			__('Your site still has the style it started with.', 'extendify-local'),
			'sliders',
			'vibe',
			styleRequest(),
			{
				// translators: Asked on a card in the AI Agent's chat, over a button that starts changing the website's style, like its corners and spacing.
				question: __('Do you want to try a new style next?', 'extendify-local'),
				// translators: Button on a card in the AI Agent's chat that asks whether to change the website's style, like its corners and spacing next.
				action: __('Change style', 'extendify-local'),
				// translators: The small label atop a card in the AI Agent's chat that says the site's style, like its corners and spacing haven't changed since the website was built.
				kind: __('Style refresh', 'extendify-local'),
				bell: {
					// translators: A request written as the user to the AI Agent, which a task under its bell puts in the chat: the site still has the style, like its corners and spacing, it was built with.
					message: __('Help me pick a new style', 'extendify-local'),
				},
				ask: built
					? sprintf(
							// translators: On a card in the AI Agent's chat, above buttons to keep them or try others. %s says how long ago, like "3 months ago".
							__(
								"Your site's style hasn't changed since it was built %s. Want to try a new one?",
								'extendify-local',
							),
							built,
						)
					: // translators: On a card in the AI Agent's chat, above buttons to keep them or try others.
						__(
							'Your site still has the style it started with. Want to try a new one?',
							'extendify-local',
						),
			},
		),
		designCard(
			'setup-animation',
			// translators: Names how the site's sections animate into view, on a card in the AI Agent's chat that says the site still has the animation it was built with.
			__('Animation', 'extendify-local'),
			// translators: On a card in the AI Agent's chat, above buttons to keep it or try others. The animation is how sections move into view.
			__(
				'Your site still has the animation it started with.',
				'extendify-local',
			),
			'sliders',
			'animation',
			animationRequest(),
			{
				// translators: Asked on a card in the AI Agent's chat, over a button that starts changing the website's animation, how its sections move into view.
				question: __(
					'Do you want to try a new animation next?',
					'extendify-local',
				),
				// translators: Button on a card in the AI Agent's chat that asks whether to change the website's animation, how its sections move into view next.
				action: __('Change animation', 'extendify-local'),
				// translators: The small label atop a card in the AI Agent's chat that says how the site's sections animate into view haven't changed since the website was built.
				kind: __('Animation refresh', 'extendify-local'),
				bell: {
					// translators: A request written as the user to the AI Agent, which a task under its bell puts in the chat: the site still has the animation it was built with, how its sections move into view.
					message: __('Help me pick an animation', 'extendify-local'),
				},
				ask: built
					? sprintf(
							// translators: On a card in the AI Agent's chat, above buttons to keep them or try others. %s says how long ago, like "3 months ago".
							__(
								"Your animation hasn't changed since your site was built %s. Want to try a new one?",
								'extendify-local',
							),
							built,
						)
					: // translators: On a card in the AI Agent's chat, above buttons to keep them or try others.
						__(
							'Your site still has the animation it started with. Want to try a new one?',
							'extendify-local',
						),
			},
		),
	];
};

export const setupSuggestions = () => setups();

const exploreTexts = () => [
	// translators: A request written as the user to the AI Agent, to see the list of things it can do. Shown as the chat box's placeholder when nothing else fits; Tab opens the list. Keep it short.
	__('Show me what you can do', 'extendify-local'),
	// translators: A request written as the user to the AI Agent, to see the list of things it can do. Shown as the chat box's placeholder when nothing else fits; Tab opens the list. Keep it short.
	__('What else can you do?', 'extendify-local'),
	// translators: A request written as the user to the AI Agent, to see the list of things it can do. Shown as the chat box's placeholder when nothing else fits; Tab opens the list. Keep it short.
	__('What can you help me with?', 'extendify-local'),
	// translators: A request written as the user to the AI Agent, to see the list of things it can do. Shown as the chat box's placeholder when nothing else fits; Tab opens the list. Keep it short.
	__('Show me what else you can do', 'extendify-local'),
];

const explore = (random) => {
	const texts = exploreTexts();
	return {
		id: 'explore',
		text: texts[Math.floor(random() * texts.length)],
		type: 'placeholder',
		details: { sheet: 'commands' },
	};
};

const IMAGIFY = { slug: 'imagify', name: 'Imagify' };

const installImagifyText = () =>
	sprintf(
		// translators: %s is the name of a WordPress plugin. A request written as the user to the AI Agent, to install that plugin. Shown as the chat box's placeholder for the user to send with Tab, and on a card's button that installs it; keep it short.
		__('Install %s', 'extendify-local'),
		IMAGIFY.name,
	);

const installImagify = () => ({
	workflow: 'recommend-plugins',
	tool: 'install-plugin',
	input: IMAGIFY,
	...installCall(IMAGIFY.name),
	// Used when the nudge names no workflow to run, so the install still gets its wrap-up.
	runs: { wrapUp: true, nudges: [] },
});

const IMAGIFY_LOOK = { icon: 'image', logo: PLUGIN_LOGOS.imagify };

// The agent's line says what's wrong, so the card is about the plugin.
export const imagifyInstallCard = (id) => {
	const text = installImagifyText();
	return setup(
		id,
		IMAGIFY.name,
		// translators: Imagify's own short description, on a card in the AI Agent's chat that offers to install the Imagify plugin.
		__(
			'Image optimization in 1-click: compress, resize & convert to WebP/AVIF – free up to 20MB/month.',
			'extendify-local',
		),
		{
			...IMAGIFY_LOOK,
			question: sprintf(
				// translators: %s is the name of a WordPress plugin that optimizes images. Asked on a card in the AI Agent's chat, over a button that installs it.
				__('Do you want to install %s next?', 'extendify-local'),
				IMAGIFY.name,
			),
		},
		{
			...installImagify(),
			request: text,
			// translators: Button on the AI Agent's card that asks whether to install the Imagify plugin next: installs it.
			action: text,
		},
	);
};

const imagifySuggestions = ({ largeImage }) => {
	if (!largeImage || !canInstall() || activePlugin(IMAGIFY.slug)) return [];
	if (!imagifyKey()) return [];
	return [
		imagifyInstallCard('image-size'),
		{
			id: 'install-imagify',
			text: installImagifyText(),
			type: 'placeholder',
			details: installImagify(),
		},
	];
};

// Its text carries the counts, since it is what the agent's lead into the card reads.
export const imagifyCoverageCard = ({ optimized, total, used }) => {
	const text = sprintf(
		// translators: %1$d is how many of the website's images still wait for the Imagify plugin to optimize them, %2$s an amount of data, like 20MB. On a card in the AI Agent's chat, under the agent's own line about the same.
		__(
			'%1$d of your images are waiting to be optimized. Imagify’s free %2$s for this month is used up.',
			'extendify-local',
		),
		total - optimized,
		used,
	);
	const card = setup(
		'imagify-coverage',
		IMAGIFY.name,
		text,
		{
			...IMAGIFY_LOOK,
			// translators: The small label atop a card in the AI Agent's chat about how many of the website's images the Imagify plugin has optimized.
			kind: __('Image optimization', 'extendify-local'),
			more: imagifyUpgrade(),
		},
		{
			url: 'https://imagify.io/pricing/',
			// translators: Button on a card in the AI Agent's chat about the Imagify plugin's monthly allowance: opens Imagify's prices in a new tab.
			action: __('See plans', 'extendify-local'),
		},
	);
	return { ...card, text };
};

const imagifyCoverage = () => {
	const facts = window.extAgentXData?.facts ?? {};
	const coverage = facts['imagify-coverage'];
	const quota = facts['imagify-quota'];
	const left = coverage ? coverage.total - coverage.optimized : 0;
	if (!activePlugin(IMAGIFY.slug) || left <= 0) return [];
	if (!quota?.free || quota.percent < 100) return [];
	return [
		imagifyCoverageCard({
			optimized: coverage.optimized,
			total: coverage.total,
			used: `${Math.round(quota.used)}MB`,
		}),
	];
};

// Requests come in the order the list of things to ask for shows.
// A feature with no request here is one users never find, so each new one adds its own.
export const allSuggestions = ({
	page,
	post,
	largeImage,
	recolored = false,
	store = false,
	random = Math.random,
} = {}) =>
	[
		request('fonts', 'fonts', 'design', fontsRequest()),
		request('colors', 'colors', 'design', colorsRequest()),
		request('style', 'vibe', 'design', styleRequest()),
		request('animation', 'animation', 'design', animationRequest()),
		request('logo', 'logo', 'design', logoRequest()),
		request('site-icon', 'site-icon', 'design', iconRequest()),
		setting(
			'site-title',
			'settings',
			// translators: A request written as the user to the AI Agent, to change the site's title. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
			__('Change website title', 'extendify-local'),
		),
		setting('tagline', 'settings', taglineRequest()),
		{
			...request(
				'site-profile',
				'site-profile',
				'settings',
				// translators: A request written as the user to the AI Agent, to edit the site profile: the site's name, tagline, description and tone. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
				__('Edit my site profile', 'extendify-local'),
			),
			details: PROFILE_FORM,
		},
		setting(
			'time-zone',
			'settings',
			// translators: A request written as the user to the AI Agent, to change the site's time zone. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
			__('Change website time zone', 'extendify-local'),
		),
		setting(
			'date-time-format',
			'settings',
			// translators: A request written as the user to the AI Agent, to change how the site writes dates and times. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
			__('Change date and time format', 'extendify-local'),
		),
		setting(
			'week-start',
			null,
			// translators: A request written as the user to the AI Agent, to change the day the site's calendars start the week on. Shown as the chat box's placeholder for the user to send with Tab; keep it short.
			__('Change first day of the week', 'extendify-local'),
		),
		setting(
			'site-language',
			'settings',
			// translators: A request written as the user to the AI Agent, to change the language of the whole site. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
			__('Change website language', 'extendify-local'),
		),
		setting(
			'posts-per-page',
			null,
			// translators: A request written as the user to the AI Agent, to change how many posts each blog page lists. Shown as the chat box's placeholder for the user to send with Tab; keep it short.
			__('Change posts per blog page', 'extendify-local'),
		),
		setting(
			'comments',
			null,
			// translators: A request written as the user to the AI Agent, to turn comments on new posts on or off. Shown as the chat box's placeholder for the user to send with Tab; keep it short.
			__('Change comment settings', 'extendify-local'),
		),
		setting(
			'homepage',
			'settings',
			// translators: A request written as the user to the AI Agent, to choose which page is the site's homepage. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
			__('Change website homepage', 'extendify-local'),
		),
		request(
			'create-page',
			'create-page',
			'pages',
			// translators: A request written as the user to the AI Agent, to add a new page to the site. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
			__('Create a new page', 'extendify-local'),
		),
		request(
			'rename-page',
			'rename-page',
			'pages',
			// translators: A request written as the user to the AI Agent, to give a page a different name. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
			__('Rename a page', 'extendify-local'),
		),
		request(
			'add-map',
			'block-edit',
			'pages',
			// translators: A request written as the user to the AI Agent, to put a map of where the business is on the page. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
			__('Add a map of where we are', 'extendify-local'),
		),
		request(
			'create-post',
			'create-post',
			'pages',
			// translators: A request written as the user to the AI Agent, to write a new blog post for the site. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
			__('Write a blog post', 'extendify-local'),
		),
		...(page ? [publishSuggestion(page), menuSuggestion(page)] : []),
		...(post ? [publishPostSuggestion(post)] : []),
		...(recolored ? [colorsSuggestion()] : []),
		snowSuggestion(),
		...(store ? [storeSuggestion()] : []),
		...(canInstall()
			? [
					request(
						'recommend-plugins',
						'recommend-plugins',
						'plugins',
						// translators: A request written as the user to the AI Agent, to suggest a WordPress plugin for something the site needs. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
						__('Recommend a plugin', 'extendify-local'),
					),
				]
			: []),
		...(abilityNamed('woocommerce/product-create')
			? [
					request(
						'add-product',
						'plugin:woocommerce',
						'plugins',
						// translators: A request written as the user to the AI Agent, to add a product to their WooCommerce store. Shown as the chat box's placeholder for the user to send with Tab, and in the agent's list of things to ask for; keep it short.
						__('Add a product to my store', 'extendify-local'),
					),
				]
			: []),
		...imagifySuggestions({ largeImage }),
		...imagifyCoverage(),
		request('publish-site', 'site-visibility', undefined, publishSiteRequest()),
		...setups(),
		...refreshes(),
		explore(random),
	].filter(
		({ id }) =>
			!['animation', 'setup-animation'].includes(id) ||
			window.extAgentXData?.animations,
	);
