import { arrowRight, Icon } from '@wordpress/icons';
import classNames from 'classnames';

export const ChoiceBox = ({
	icon,
	badgeLabel,
	heading,
	description,
	buttonLabel,
	buttonIcon = arrowRight,
	highlight,
	onClick,
}) => (
	<div
		className={classNames(
			'flex flex-col overflow-hidden text-left text-gray-900 backdrop-blur-2xl',
			highlight
				? 'rounded-lg border-[3px] border-design-main sm:-mt-7'
				: 'rounded-sm border border-gray-300',
		)}
	>
		{highlight && badgeLabel && (
			<span className="flex h-7 items-center justify-center bg-design-main text-sm font-medium text-design-text">
				{badgeLabel}
			</span>
		)}
		<span className="flex items-center justify-center bg-gray-100/80 py-10 text-gray-900">
			<Icon fill="currentColor" icon={icon} size={40} />
		</span>
		<span className="flex flex-1 flex-col justify-between gap-6 border-t border-gray-300 bg-white/60 p-6">
			<span className="flex flex-col gap-2">
				{heading && (
					<span className="text-base font-semibold leading-6">{heading}</span>
				)}
				<span className="text-sm leading-5 opacity-70">{description}</span>
			</span>
			<button
				type="button"
				onClick={onClick}
				className={classNames(
					'inline-flex w-full items-center justify-between gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500',
					highlight
						? 'border border-design-main bg-design-main text-white hover:opacity-90'
						: 'border border-gray-300 bg-transparent hover:border-gray-500',
				)}
			>
				{buttonLabel}
				<Icon fill="currentColor" icon={buttonIcon} size={20} />
			</button>
		</span>
	</div>
);
