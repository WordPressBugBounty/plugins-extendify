import { AddFieldBar } from '@agentx/quick-edit/AddFieldBar';
import { CalendarBar } from '@agentx/quick-edit/CalendarBar';
import { EventBar } from '@agentx/quick-edit/EventBar';
import { ImageBar } from '@agentx/quick-edit/ImageBar';
import { PriceBar } from '@agentx/quick-edit/PriceBar';
import { SectionBar } from '@agentx/quick-edit/SectionBar';
import { SocialBar } from '@agentx/quick-edit/SocialBar';
import { WordsBar } from '@agentx/quick-edit/WordsBar';

const BARS = {
	image: ImageBar,
	price: PriceBar,
	social: SocialBar,
	event: EventBar,
	calendar: CalendarBar,
	section: SectionBar,
	field: AddFieldBar,
};

export const Editor = ({ editing, changed, commit, onDone, onFailed }) => {
	const Bar = BARS[editing.target.kind] ?? WordsBar;
	return (
		<Bar
			{...editing}
			changed={changed}
			commit={commit}
			onDone={onDone}
			onFailed={onFailed}
		/>
	);
};
