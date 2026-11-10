import { Canvas } from '@agentx/templates/Canvas';
import { Chat } from '@agentx/templates/Chat';
import { SlotPanel } from '@agentx/templates/SlotPanel';
import { TopBar } from '@agentx/templates/TopBar';

export const Slot = ({
	brand,
	bell,
	chat,
	chatToggle,
	header,
	toolbar,
	site,
	tool,
	siteView,
	minimized,
	slot,
}) => (
	<div className="flex size-full flex-col gap-3 pt-3 pr-4 pb-4">
		<TopBar
			brand={brand}
			bell={bell}
			chatToggle={chatToggle}
			header={header}
			toolbar={toolbar}
			minimized={minimized}
		/>
		<div className="flex min-h-0 flex-1">
			<Chat chat={chat} minimized={minimized} />
			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<Canvas
					site={site}
					tool={tool}
					toggle={siteView}
					rounded="rounded-agentx-site"
				/>
				<SlotPanel>{slot}</SlotPanel>
			</div>
		</div>
	</div>
);
