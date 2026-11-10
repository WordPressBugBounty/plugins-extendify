import { drawSpinner, setSpinnerShader } from '@agentx/spinner/renderer';
import { spinnerFor } from '@agentx/spinner/shaders';
import { useShellStore } from '@agentx/state/shell';
import { useEffect, useRef, useState } from '@wordpress/element';

export const useSpinnerShader = () =>
	useShellStore(
		(state) => state.spinnerSource ?? spinnerFor(state.spinner).fragment,
	);

export const Spinner = ({ className = 'h-4 w-agentx-spinner' }) => {
	const ref = useRef(null);
	const [ring, setRing] = useState(false);
	const fragment = useSpinnerShader();

	useEffect(() => {
		setSpinnerShader(fragment);
	}, [fragment]);

	useEffect(() => {
		const stop = drawSpinner(ref.current, () => setRing(true));
		if (!stop) setRing(true);
		return stop;
	}, []);

	if (ring) {
		return (
			<span
				aria-hidden="true"
				className="size-4 shrink-0 animate-spin rounded-full border-2 border-agentx-spinner/30 border-t-agentx-spinner motion-reduce:animate-none"
			/>
		);
	}
	return (
		<canvas
			ref={ref}
			data-agentx-spinner=""
			className={`shrink-0 ${className}`}
		/>
	);
};
