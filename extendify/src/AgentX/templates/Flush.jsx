import { BrandBar } from '@agentx/PartnerLogo';
import { Canvas } from '@agentx/templates/Canvas';
import { Chat, ChatCell } from '@agentx/templates/Chat';
import { SiteBar } from '@agentx/templates/SiteBar';
import { SlotPanel } from '@agentx/templates/SlotPanel';

export const Flush = ({
	brand,
	mark,
	bar,
	bell,
	chat,
	chatToggle,
	toolbar,
	site,
	tool,
	siteView,
	minimized,
	slot,
}) => {
	const agentFirst = bar === 'agent';
	// Over a minimized chat the cell is a sliver, so the partner logo moves beside the toggle.
	const brandBeside = agentFirst || minimized;
	return (
		<div className="flex size-full flex-col gap-3 pt-3 pr-4">
			<div className="flex h-10 shrink-0 items-center">
				<ChatCell minimized={minimized}>
					{agentFirst ? mark : <BrandBar data-agentx-brand>{brand}</BrandBar>}
				</ChatCell>
				<div className="min-w-0 flex-1">
					<SiteBar
						brand={brandBeside ? brand : null}
						chatToggle={chatToggle}
						bell={bell}
						toolbar={toolbar}
					/>
				</div>
			</div>
			<div className="flex min-h-0 flex-1">
				<Chat chat={chat} minimized={minimized} className="pb-4" />
				<div
					className={`flex min-w-0 flex-1 flex-col ${slot ? 'gap-3 pb-4' : ''}`}
				>
					<Canvas
						site={site}
						tool={tool}
						toggle={siteView}
						rounded={slot ? 'rounded-agentx-site' : 'rounded-t-agentx-site'}
					/>
					{slot && <SlotPanel>{slot}</SlotPanel>}
				</div>
			</div>
		</div>
	);
};
