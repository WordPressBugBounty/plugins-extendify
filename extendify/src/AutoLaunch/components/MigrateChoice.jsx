import { ChoiceBox } from '@auto-launch/components/ChoiceBox';
import { checkIn } from '@auto-launch/functions/insights';
import { sparkles } from '@auto-launch/icons';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { cloudUpload } from '@wordpress/icons';
import { motion } from 'framer-motion';

const getMigrateSearchUrl = () =>
	`${window.extSharedData.adminUrl}plugin-install.php?tab=search&s=${encodeURIComponent(
		__('migration', 'extendify-local'),
	)}`;

export const MigrateChoice = ({ onBuildNew }) => {
	useEffect(() => {
		checkIn({ stage: 'migrate_screen' });
	}, []);

	return (
		<motion.div
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.4 }}
			className="grid w-full gap-6 sm:mx-auto sm:max-w-xl sm:grid-cols-2 sm:items-start sm:pt-7"
		>
			<ChoiceBox
				icon={cloudUpload}
				buttonLabel={__('Migrate website', 'extendify-local')}
				description={__(
					'Import an existing WordPress website',
					'extendify-local',
				)}
				onClick={() => {
					checkIn({ stage: 'migrate_screen_migrate' });
					window.location.assign(getMigrateSearchUrl());
				}}
			/>
			<ChoiceBox
				icon={sparkles}
				highlight
				badgeLabel={__('Most Popular', 'extendify-local')}
				buttonLabel={__('Build a new website', 'extendify-local')}
				description={__(
					'Create a beautiful website in about a minute',
					'extendify-local',
				)}
				onClick={() => {
					checkIn({ stage: 'migrate_screen_build' });
					onBuildNew();
				}}
			/>
		</motion.div>
	);
};
