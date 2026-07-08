import { ExtendifyCodeConnector } from '@auto-launch/components/ExtendifyCodeConnector';
import { Launch } from '@auto-launch/components/Launch';
import { Logo } from '@auto-launch/components/Logo';
import { MigrateChoice } from '@auto-launch/components/MigrateChoice';
import { MovingGradient } from '@auto-launch/components/MovingGradients';
import { NeedsTheme } from '@auto-launch/components/NeedsTheme';
import { RestartLaunchModal } from '@auto-launch/components/RestartLaunchModal';
import { ViewportPulse } from '@auto-launch/components/ViewportPulse';
import { getAbTest } from '@auto-launch/functions/getAbTest';
import { preLaunchFunctions } from '@auto-launch/functions/setup';
import { updateOption } from '@auto-launch/functions/wp';
import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { registerCoreBlocks } from '@wordpress/block-library';
import { getBlockTypes } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { chevronLeft, Icon } from '@wordpress/icons';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { checkIn, reportRestApiStatus } from './functions/insights';

export const LaunchPage = () => {
	const theme = useSelect((select) => select('core').getCurrentTheme());
	// Checking `theme` here makes sure the data is populated
	const needsTheme = theme && theme?.textdomain !== 'extendable';

	const oldPages = window.extLaunchData.resetSiteInformation.pagesIds ?? [];
	const needsToReset = oldPages.length > 0;

	const {
		title,
		descriptionRaw,
		go,
		urlParams,
		designBuild,
		setData,
		showExtendifyCodeScreen,
	} = useLaunchDataStore();
	const skipDescription =
		Boolean(urlParams?.['build-id']) ||
		designBuild ||
		((title || descriptionRaw) && go);
	const showConnector = !skipDescription && showExtendifyCodeScreen;
	const showExitLink =
		!skipDescription && !window.extLaunchData?.hideAutoLaunchExitLink;
	const inMigrateVariant =
		getAbTest('AutoLaunch.MigrateScreen').variant === 'B';
	const [choosingMigration, setChoosingMigration] = useState(inMigrateVariant);
	const showMigrateChoice = !skipDescription && choosingMigration;

	const containerRef = useRef(null);

	useEffect(() => {
		// translators: Launch is a noun.
		document.title = __('Launch - AI-Powered Web Creation', 'extendify-local');
		updateOption('extendify_launch_loaded', new Date().toISOString());
		// We load core blocks so we can parse them
		if (getBlockTypes().length === 0) registerCoreBlocks();

		preLaunchFunctions();
		checkIn({ stage: 'launch_page' });
		reportRestApiStatus();
	}, []);

	if (needsTheme) {
		return (
			<Wrapper>
				<div className="bg-white w-full max-w-3xl rounded-lg border border-design-main/60 relative z-10">
					<NeedsTheme />
				</div>
			</Wrapper>
		);
	}

	if (needsToReset) {
		return (
			<Wrapper>
				<div className="w-full max-w-2xl rounded-3xl border bg-gray-100/80 backdrop-blur-2xl shadow-md relative z-10 border-gray-300">
					<RestartLaunchModal pages={oldPages} />
				</div>
			</Wrapper>
		);
	}

	return (
		<Wrapper
			footer={
				showConnector ? (
					<BackLink onClick={() => setData('showExtendifyCodeScreen', false)} />
				) : showExitLink ? (
					<ExitLink />
				) : null
			}
		>
			<AnimatePresence mode="wait" initial={false}>
				<TheTitle
					key={showMigrateChoice ? 'migrate' : 'description'}
					// The connector renders its own heading, so hide the shared one.
					hide={skipDescription || showConnector}
					migrate={showMigrateChoice}
				/>
			</AnimatePresence>
			<div
				ref={containerRef}
				className={classNames('w-full relative z-10', {
					'max-w-3xl': inMigrateVariant || showConnector,
					'max-w-2xl': !inMigrateVariant && !showConnector,
					'md:h-72.75': inMigrateVariant && !skipDescription,
				})}
			>
				<AnimatePresence mode="wait">
					{showConnector && (
						<ExtendifyCodeConnector
							key="extendify-code"
							onProceed={() => setData('go', true)}
						/>
					)}
					{!showConnector && showMigrateChoice && (
						<MigrateChoice
							key="migrate-choice"
							onBuildNew={() => setChoosingMigration(false)}
						/>
					)}
					{!showConnector && !showMigrateChoice && (
						<Launch
							key={skipDescription ? 'description-launch' : 'creating-launch'}
							skipDescription={skipDescription}
							lastHeight={containerRef.current?.offsetHeight}
						/>
					)}
				</AnimatePresence>
			</div>
		</Wrapper>
	);
};

const Wrapper = ({ children, footer }) => {
	const { pulse } = useLaunchDataStore();

	return (
		<div style={{ zIndex: 99999 + 1 }} className="fixed inset-0 bg-white">
			<div className="relative h-dvh bg-banner-main text-banner-text text-base overflow-y-auto">
				<div className="relative z-10 min-h-dvh w-full flex flex-col items-center justify-between p-6">
					<div className="w-full flex flex-col items-center gap-5 md:gap-8 m-auto">
						<div className="mb-4">
							<Logo />
						</div>
						{children}
					</div>
					{footer && <div className="w-full pt-8 shrink-0">{footer}</div>}
				</div>
			</div>
			<MovingGradient />
			{pulse ? <ViewportPulse /> : null}
		</div>
	);
};

const ExitLink = () => {
	return (
		<a
			className="inline-flex items-center gap-0.5 text-sm text-banner-text opacity-70 hover:opacity-100 transition-opacity"
			href={window.extSharedData.adminUrl}
			onClick={() => checkIn({ stage: 'exit_to_wp_admin' })}
		>
			<Icon fill="currentColor" icon={chevronLeft} size={20} />
			{__('WP Admin Dashboard', 'extendify-local')}
		</a>
	);
};

const BackLink = ({ onClick }) => {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex items-center gap-0.5 border-0 bg-transparent cursor-pointer text-sm text-banner-text opacity-70 hover:opacity-100 transition-opacity"
		>
			<Icon fill="currentColor" icon={chevronLeft} size={20} />
			{__('Back', 'extendify-local')}
		</button>
	);
};

const TheTitle = ({ hide, migrate }) => {
	const useOldHeader =
		getAbTest('AutoLaunch.HeaderParagraphOld').variant === 'B';
	if (hide) return null;

	const headingClass =
		'text-xl md:text-2xl text-pretty text-banner-text font-semibold p-0 m-0 text-center';
	const transition = {
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: 0.4 },
	};

	if (migrate) {
		return (
			<motion.h2 className={headingClass} {...transition}>
				{__('How would you like to start your website?', 'extendify-local')}
			</motion.h2>
		);
	}

	if (useOldHeader) {
		return (
			<motion.div className="flex flex-col items-center gap-2" {...transition}>
				<h2 className={headingClass}>
					{__('Tell Us About Your Website', 'extendify-local')}
				</h2>
				<p className="text-sm md:text-base text-pretty text-banner-text opacity-70 p-0 m-0 text-center max-w-xl">
					{__(
						"Share your vision, and we'll craft a website that's perfectly tailored to your needs, ready to launch in no time.",
						'extendify-local',
					)}
				</p>
			</motion.div>
		);
	}

	return (
		<motion.h2 className={headingClass} {...transition}>
			{__('Describe the website you want to build', 'extendify-local')}
		</motion.h2>
	);
};
