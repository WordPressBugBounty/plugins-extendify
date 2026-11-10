import { PastedMap } from '@agentx/chat/PastedMap';
import { pastedMap } from '@agentx/lib/pasted-map';
import { __ } from '@wordpress/i18n';

export const AnswerResult = ({ part }) => {
	const { text, map } = pastedMap(part.output.answer);
	return (
		<dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 ps-6 text-sm">
			<dt className="text-agentx-record-label">
				{
					// translators: Label for the question the AI Agent asked the user, in its record of the step.
					__('Question', 'extendify-local')
				}
			</dt>
			<dd className="m-0 [overflow-wrap:anywhere]">{part.input.question}</dd>
			<dt className="text-agentx-record-label">
				{
					// translators: Label for the user's answer to the AI Agent's question, in its record of the step.
					__('Your answer', 'extendify-local')
				}
			</dt>
			<dd className="m-0 [overflow-wrap:anywhere]">
				{text}
				{map && <PastedMap {...map} />}
			</dd>
		</dl>
	);
};
