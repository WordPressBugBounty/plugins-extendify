import { LaunchPage } from '@auto-launch/LaunchPage';
import { render, screen } from '@testing-library/react';

jest.mock('@auto-launch/components/Launch', () => ({
	Launch: () => <div data-testid="launch" />,
}));
jest.mock('@auto-launch/components/Logo', () => ({ Logo: () => null }));
jest.mock('@auto-launch/components/MovingGradients', () => ({
	MovingGradient: () => null,
}));
jest.mock('@auto-launch/components/NeedsTheme', () => ({
	NeedsTheme: () => null,
}));
jest.mock('@auto-launch/components/RestartLaunchModal', () => ({
	RestartLaunchModal: () => null,
}));
jest.mock('@auto-launch/components/ViewportPulse', () => ({
	ViewportPulse: () => null,
}));
jest.mock('@auto-launch/functions/wp', () => ({ updateOption: jest.fn() }));
jest.mock('@auto-launch/state/launch-data', () => ({
	useLaunchDataStore: () => ({
		title: null,
		descriptionRaw: null,
		go: false,
		urlParams: {},
		designBuild: false,
		pulse: false,
	}),
}));
jest.mock('@wordpress/block-library', () => ({
	registerCoreBlocks: jest.fn(),
}));
jest.mock('@wordpress/blocks', () => ({ getBlockTypes: () => [{}] }));
jest.mock('@wordpress/data', () => ({
	useSelect: () => ({ textdomain: 'extendable' }),
}));
jest.mock('framer-motion', () => ({
	AnimatePresence: ({ children }) => <>{children}</>,
	motion: new Proxy(
		{},
		{ get: () => (props) => <div {...props}>{props.children}</div> },
	),
}));
jest.mock('@auto-launch/functions/insights', () => ({ checkIn: jest.fn() }));

beforeAll(() => {
	window.extLaunchData = {
		resetSiteInformation: { pagesIds: [] },
		urlParams: {},
		hideAutoLaunchExitLink: false,
	};
});

afterAll(() => {
	delete window.extLaunchData;
});

beforeEach(() => {
	window.extSharedData = {
		adminUrl: 'https://example.test/wp-admin/',
	};
});

describe('AutoLaunchPage — hideAutoLaunchExitLink flag', () => {
	test('shows the WP Admin Dashboard exit link when the flag is false', () => {
		render(<LaunchPage />);
		expect(
			screen.getByRole('link', { name: /WP Admin Dashboard/i }),
		).toBeInTheDocument();
	});

	test('hides the WP Admin Dashboard exit link when the flag is true', () => {
		window.extLaunchData.hideAutoLaunchExitLink = true;
		render(<LaunchPage />);
		expect(
			screen.queryByRole('link', { name: /WP Admin Dashboard/i }),
		).not.toBeInTheDocument();
	});
});
