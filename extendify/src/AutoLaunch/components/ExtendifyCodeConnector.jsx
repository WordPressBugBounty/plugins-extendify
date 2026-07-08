import { ChoiceBox } from '@auto-launch/components/ChoiceBox';
import { buildExtendifyCodeLink } from '@auto-launch/functions/extendify-code';
import { checkIn } from '@auto-launch/functions/insights';
import { useLaunchDataStore } from '@auto-launch/state/launch-data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { arrowRight, code, external, layout } from '@wordpress/icons';
import { motion } from 'framer-motion';

export const ExtendifyCodeConnector = ({ onProceed }) => {
	const { descriptionRaw, title } = useLaunchDataStore();
	const { extendifyCodeData = {} } = window.extSharedData;
	const { link, title: codeTitle, message, ctaPrimary } = extendifyCodeData;

	const hasCodeConnectorData = link && codeTitle && message && ctaPrimary;

	useEffect(() => {
		if (!hasCodeConnectorData) {
			onProceed();
			return;
		}
		checkIn({
			stage: 'extendify_code_screen_seen',
			description: descriptionRaw || title,
		});
	}, [hasCodeConnectorData, onProceed, descriptionRaw, title]);

	if (!hasCodeConnectorData) return null;

	const goToWordPress = () => {
		checkIn({ stage: 'extendify_code_choose_wordpress' });
		onProceed();
	};

	const goToBuilder = () => {
		const url = buildExtendifyCodeLink(link, {
			description: descriptionRaw,
			title,
		});
		checkIn({ stage: 'extendify_code_choose_builder' });
		if (url) window.location.assign(url);
	};

	return (
		<motion.div
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.4 }}
			className="flex w-full flex-col gap-6"
		>
			<div className="flex flex-col items-center gap-2 text-center text-banner-text">
				<h2 className="m-0 p-0 text-pretty text-xl font-semibold md:text-2xl">
					{__('How would you like to build this?', 'extendify-local')}
				</h2>
				<p className="m-0 max-w-xl p-0 text-pretty text-sm opacity-70 md:text-base">
					{__(
						'Based on what you described, your site may need some advanced functionality.',
						'extendify-local',
					)}
				</p>
			</div>
			<div className="grid w-full gap-6 sm:mx-auto sm:max-w-2xl sm:grid-cols-2 sm:pt-7">
				<ChoiceBox
					icon={layout}
					heading={__('Keep building with WordPress', 'extendify-local')}
					description={__(
						'Great for business sites, e-commerces, landing pages, portfolios, and blogs.',
						'extendify-local',
					)}
					buttonLabel={__('Build with WordPress', 'extendify-local')}
					buttonIcon={arrowRight}
					onClick={goToWordPress}
				/>
				<ChoiceBox
					icon={code}
					highlight
					badgeLabel={__('Recommended for you', 'extendify-local')}
					heading={codeTitle}
					description={message}
					buttonLabel={ctaPrimary}
					buttonIcon={external}
					onClick={goToBuilder}
				/>
			</div>
		</motion.div>
	);
};
