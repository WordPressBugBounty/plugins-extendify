import { ImageThumb } from '@agentx/chat/ImageThumb';

export const ChangeResult = ({ part }) => (
	<ImageThumb
		image={part.output.image}
		className="h-32 w-auto max-w-full self-start p-1"
	/>
);
