import { OneButtonCard } from '@agentx/chat/OneButtonCard';
import { reportCrash } from '@agentx/lib/crash';
import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// A render that throws takes every panel beside it down, so each one is caught apart.
export class Caught extends Component {
	state = { crashed: false };

	static getDerivedStateFromError() {
		return { crashed: true };
	}

	componentDidCatch(error, info) {
		reportCrash(error, this.props.where, {
			componentStack: info?.componentStack,
		});
	}

	render() {
		if (!this.state.crashed) return this.props.children;
		// A bubble over the site has no room for a card, and the user loses nothing by its going.
		if (this.props.silent) return null;
		return (
			<div role="alert" className="p-3">
				<OneButtonCard
					kind="error"
					text={
						// translators: Shown in place of the AI Agent's chat when the chat itself failed to draw on screen.
						__(
							'Something went wrong and the chat could not be shown. Your conversation is saved.',
							'extendify-local',
						)
					}
					button={
						// translators: Button that reloads the page to bring the AI Agent's chat back after it failed to draw.
						__('Reload', 'extendify-local')
					}
					onPress={this.props.onReload ?? (() => window.location.reload())}
				/>
			</div>
		);
	}
}
