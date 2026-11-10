import { OneButtonCard } from '@agentx/chat/OneButtonCard';
import {
	cover,
	scrollToBlock,
	unhighlight,
	useSiteDocument,
} from '@agentx/lib/block-box';
import { blockById, focusBlock, pickAfterRun } from '@agentx/lib/pick-block';
import { useSelectionStore } from '@agentx/state/selection';
import { useEffect, useState } from '@wordpress/element';

// The reply to No asks the user to pick the block, so Select is on for it.
const declined = () => {
	pickAfterRun();
	return { answer: 'no' };
};

// The frame may show another page by now, and a yes would have the agent act on a block the user never saw.
const confirmed = (id) => (focusBlock(id) ? { answer: 'yes' } : declined());

// Asks whether the block the agent found is the one meant.
export const ConfirmBlock = ({ part, onAnswer, onTyped }) => {
	const { id, question, yes, no } = part.input;
	const doc = useSiteDocument();
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		useSelectionStore.setState({ confirming: id });
		return () => useSelectionStore.setState({ confirming: null });
	}, [id]);

	useEffect(() => {
		// A page the frame is leaving has no window; the next load runs this again.
		if (!doc?.defaultView) return;
		const element = blockById(doc, id);
		if (!element) return;
		cover(element);
		return () => unhighlight(doc);
	}, [doc, id]);

	// After the box, which opens a dropdown the block may sit in.
	useEffect(() => {
		const element = doc?.defaultView ? blockById(doc, id) : null;
		if (element) scrollToBlock(element);
	}, [doc, id]);

	const answer = async (save) => {
		setBusy(true);
		try {
			await onAnswer(save);
		} catch {
			setBusy(false);
		}
	};

	return (
		<OneButtonCard
			text={question}
			button={yes}
			dismiss={no}
			busy={busy}
			onPress={() => answer(async () => confirmed(id))}
			onDismiss={() => answer(async () => declined())}
			onTyped={onTyped}
			demo={Boolean(part.demoState)}
		/>
	);
};
