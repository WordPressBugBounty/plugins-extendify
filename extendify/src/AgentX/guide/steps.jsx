import { GHOST_SMALL, OUTLINED_SMALL } from '@agentx/chat/styles';
import { DesignStep, designTabs } from '@agentx/guide/DesignStep';
import { ImageStep } from '@agentx/guide/ImageStep';
import {
	BrowserIcon,
	CheckIcon,
	GlobeIcon,
	ImageIcon,
	OpenInNewIcon,
	PaletteIcon,
	SlidersIcon,
	TextIcon,
} from '@agentx/guide/icons';
import { LookStep } from '@agentx/guide/LookStep';
import { save } from '@agentx/lib/draft';
import { searchUrl } from '@agentx/lib/guide';
import { headerLogo } from '@agentx/lib/logo-title';
import { saveSetting } from '@agentx/lib/settings';
import { showDraft } from '@agentx/lib/show-draft';
import { useDraftStore } from '@agentx/state/draft';
import { useSettingsStore } from '@agentx/state/settings';
import { createDomainUrlLink } from '@assist/lib/domains';
import { safeParseJson } from '@shared/lib/parsing';
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const INPUT =
	'agentx-focus h-9 w-full min-w-0 rounded-agentx-control border border-solid border-agentx-field-border bg-agentx-guide-field px-2.5 text-agentx-body font-normal text-agentx-ink';

const saveDraft = async () => {
	if (useDraftStore.getState().unsaved) {
		await showDraft(save, { saving: true });
	}
};

const TitleStep = ({ values, onChange }) => (
	<div className="flex flex-col gap-3">
		<label className="flex flex-col gap-1.5 text-agentx-caption font-agentx-button">
			{
				// translators: Label of the field for the site's title in the AI Agent's Site Guide.
				__('Site title', 'extendify-local')
			}
			<input
				type="text"
				value={values.title}
				onChange={(event) => onChange({ title: event.target.value })}
				className={INPUT}
			/>
		</label>
		<label className="flex flex-col gap-1.5 text-agentx-caption font-agentx-button">
			{
				// translators: Label of the field for the site's tagline, the short line under its title, in the AI Agent's Site Guide.
				__('Tagline', 'extendify-local')
			}
			<input
				type="text"
				value={values.description}
				onChange={(event) => onChange({ description: event.target.value })}
				className={INPUT}
			/>
		</label>
	</div>
);

const useDomains = () => {
	const cached = safeParseJson(window.extSharedData?.resourceData)?.domains;
	const [domains, setDomains] = useState(
		Array.isArray(cached) && cached.length ? cached : null,
	);
	useEffect(() => {
		if (domains) return;
		apiFetch({ path: '/extendify/v1/agentx/domains' }).then(
			(got) => setDomains(got.domains ?? []),
			() => setDomains([]),
		);
	}, []);
	return domains;
};

const Register = ({ domain, className, onDone, children }) => (
	<a
		href={createDomainUrlLink(searchUrl(), domain)}
		target="_blank"
		rel="noopener noreferrer"
		onClick={onDone}
		className={`no-underline ${className}`}
	>
		{children}
		<OpenInNewIcon className="size-3.5" />
	</a>
);

const DomainStep = ({ onDone }) => {
	const domains = useDomains();
	if (!domains) {
		return (
			<p className="m-0 text-agentx-caption text-agentx-guide-muted">
				{
					// translators: Shown in the AI Agent's Site Guide while it finds domain names for the site.
					__('Finding domains for your site…', 'extendify-local')
				}
			</p>
		);
	}
	const [best, ...more] = domains.slice(0, 3);
	if (!best) {
		return (
			<a
				href={searchUrl().replace(/\{[A-Z]+\}/g, '')}
				target="_blank"
				rel="noopener noreferrer"
				onClick={onDone}
				className={`self-start no-underline ${OUTLINED_SMALL}`}
			>
				{
					// translators: Link in the AI Agent's Site Guide to the host's page for finding a domain name, when no names were suggested.
					__('Search for a domain', 'extendify-local')
				}
				<OpenInNewIcon className="size-3.5" />
			</a>
		);
	}
	return (
		<ul className="m-0 list-none divide-y divide-agentx-guide-list-border rounded-agentx bg-agentx-guide-list p-0 text-agentx-caption ring-1 ring-agentx-guide-list-border">
			<li className="flex items-center gap-2 py-2.5 ps-3 pe-1.5">
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-agentx-guide-muted">
						{
							// translators: Label over the domain name the AI Agent's Site Guide suggests first.
							__('Best match', 'extendify-local')
						}
					</span>
					<span className="truncate text-agentx-body font-medium">{best}</span>
				</span>
				<Register domain={best} className={OUTLINED_SMALL} onDone={onDone}>
					{
						// translators: Link beside a domain name in the AI Agent's Site Guide that opens the host's page to register it.
						__('Register', 'extendify-local')
					}
				</Register>
			</li>
			{more.map((domain) => (
				<li key={domain} className="flex items-center gap-2 py-1.5 ps-3 pe-1.5">
					<span className="min-w-0 flex-1 truncate">{domain}</span>
					<Register domain={domain} className={GHOST_SMALL} onDone={onDone}>
						{
							// translators: Link beside a domain name in the AI Agent's Site Guide that opens the host's page to register it.
							__('Register', 'extendify-local')
						}
					</Register>
				</li>
			))}
		</ul>
	);
};

// A site with no visibility setting offered is already live.
export const isLive = (settings) => settings.visibility !== 'unpublished';

// translators: Button that finishes a step of the AI Agent's Site Guide, like adding a logo, and moves on to the next step.
export const nextLabel = () => __('Next', 'extendify-local');
// With Autosave on, a change saves on its own, so the button only moves on.
const saveLabel = ({ autosave } = {}) =>
	autosave
		? nextLabel()
		: // translators: Button that saves a step of the AI Agent's Site Guide, like a new look or title, and moves on to the next step.
			__('Save', 'extendify-local');

export const STEPS = [
	{
		id: 'build',
		Icon: CheckIcon,
		// translators: A step in the AI Agent's Site Guide that is done once the site is built.
		title: () => __('Build your site', 'extendify-local'),
	},
	{
		id: 'look',
		Icon: PaletteIcon,
		// translators: A step in the AI Agent's Site Guide, to pick a whole new look for the site: its design, colors and fonts.
		title: () => __('Pick your look', 'extendify-local'),
		description: () =>
			// translators: Shown under the heading of the AI Agent's Site Guide step for picking a whole new look for the site.
			__(
				'Choose the design, colors, and fonts that fit your site.',
				'extendify-local',
			),
		Tool: LookStep,
		action: saveLabel,
		finish: saveDraft,
		draft: true,
	},
	{
		id: 'design',
		Icon: SlidersIcon,
		// translators: A step in the AI Agent's Site Guide, to fine-tune the site's colors, fonts, style and animation.
		title: () => __('Adjust your design', 'extendify-local'),
		description: () =>
			// translators: Shown under the heading of the AI Agent's Site Guide step for fine-tuning the site's design.
			__('Fine-tune colors, fonts, style and animation.', 'extendify-local'),
		Tool: DesignStep,
		stages: () => designTabs().map(({ id }) => id),
		action: saveLabel,
		finish: saveDraft,
		draft: true,
	},
	{
		id: 'logo',
		Icon: ImageIcon,
		// translators: A step in the AI Agent's Site Guide, to add the site's logo.
		title: () => __('Add your logo', 'extendify-local'),
		description: () =>
			// translators: Shown under the heading of the AI Agent's Site Guide step for adding a logo.
			__('Upload a logo so visitors recognize your site.', 'extendify-local'),
		Tool: (props) => <ImageStep which="logo" {...props} />,
		// The picture saves live, so only a title beside the header's logo has anything to save.
		get draft() {
			return Boolean(headerLogo());
		},
		action: (options) => (headerLogo() ? saveLabel(options) : nextLabel()),
		finish: saveDraft,
	},
	{
		id: 'icon',
		Icon: BrowserIcon,
		// translators: A step in the AI Agent's Site Guide, to add the site icon, the small image in browser tabs.
		title: () => __('Add your site icon', 'extendify-local'),
		description: () =>
			// translators: Shown under the heading of the AI Agent's Site Guide step for adding the site icon, the small image in browser tabs.
			__(
				'Upload an icon so your site stands out in browser tabs.',
				'extendify-local',
			),
		Tool: (props) => <ImageStep which="icon" {...props} />,
		action: nextLabel,
	},
	{
		id: 'title',
		Icon: TextIcon,
		// translators: A step in the AI Agent's Site Guide, to set the site's title and tagline, the short line under it.
		title: () => __('Set your title & tagline', 'extendify-local'),
		description: () =>
			// translators: Shown under the heading of the AI Agent's Site Guide step for the site's title and tagline.
			__(
				'Confirm the name and tagline your site shows everywhere.',
				'extendify-local',
			),
		Tool: TitleStep,
		action: saveLabel,
		form: () => {
			const { title = '', description = '' } = useSettingsStore.getState();
			return { title, description };
		},
		finish: async (values) => {
			const now = useSettingsStore.getState();
			if (values.title !== now.title) await saveSetting('title', values.title);
			if (values.description !== now.description) {
				await saveSetting('description', values.description);
			}
		},
	},
	{
		id: 'domain',
		Icon: GlobeIcon,
		// translators: A step in the AI Agent's Site Guide, to register a domain name for the site.
		title: () => __('Get your domain', 'extendify-local'),
		description: () =>
			// translators: Shown under the heading of the AI Agent's Site Guide step for registering a domain name.
			__(
				'Replace your temporary address with a domain of your own.',
				'extendify-local',
			),
		Tool: DomainStep,
		action: nextLabel,
	},
];
