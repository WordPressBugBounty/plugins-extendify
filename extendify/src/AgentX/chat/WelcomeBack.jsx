import { PRESS } from '@agentx/chat/styles';
import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const ITEM = `agentx-focus rounded-agentx-suggestion border border-solid border-agentx-suggestion-border bg-agentx-suggestion px-4 py-2 text-agentx-body text-agentx-suggestion-ink ${PRESS} hover:bg-agentx-suggestion-hover`;

export const WelcomeBack = ({ back, items, onPick }) => {
	const id = useId();
	return (
		<section
			aria-labelledby={id}
			className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 py-10 text-center"
		>
			<div className="flex flex-col gap-1.5">
				<h2
					id={id}
					className="m-0 text-agentx-greeting-title font-agentx-greeting-title text-agentx-greeting-ink"
				>
					{back
						? // translators: Heading of the AI Agent's chat when a user comes back and their earlier chat is put away.
							__('Welcome back', 'extendify-local')
						: // translators: Heading of the AI Agent's chat the first time a user opens it.
							__('Welcome', 'extendify-local')}
				</h2>
				<p className="m-0 text-agentx-body text-agentx-greeting-muted">
					{
						// translators: Under the heading of the AI Agent's empty chat, above a few requests the user can send with one click.
						__('What would you like to work on today?', 'extendify-local')
					}
				</p>
			</div>
			<div className="flex flex-col items-center gap-2">
				{items.map((item) => (
					<button
						key={item.id}
						type="button"
						className={ITEM}
						onClick={() => onPick(item)}
					>
						{item.text}
					</button>
				))}
			</div>
		</section>
	);
};
