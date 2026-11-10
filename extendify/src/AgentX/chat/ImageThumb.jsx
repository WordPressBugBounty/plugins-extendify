import { __ } from '@wordpress/i18n';

export const ImageThumb = ({ image, alt, loading, className = 'size-12' }) =>
	image ? (
		<img
			src={image.thumb ?? image.url}
			alt={alt ?? image.name ?? ''}
			className={`${className} rounded-agentx-thumb border border-agentx-thumb-border bg-agentx-thumb object-contain`}
		/>
	) : (
		<span
			className={`${className} flex items-center justify-center rounded-agentx-thumb border border-dashed border-agentx-thumb-border text-agentx-caption text-agentx-muted`}
		>
			{!loading &&
				// translators: Shown in place of an image when the site has no logo or icon.
				__('None', 'extendify-local')}
		</span>
	);
