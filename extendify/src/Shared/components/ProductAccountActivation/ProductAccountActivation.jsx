import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { useEffect, useState } from '@wordpress/element';
import { isEmail } from '@wordpress/url';
import { createAccount } from './createAccount';
import { Loading } from './Loading';
import { partitionPlugins } from './partitionPlugins';
import { SetupComplete } from './SetupComplete';
import { SetupPlugins } from './SetupPlugins';
import {
	ACTIVATION_STATUS,
	usePluginsActivation,
} from './usePluginsActivation';

export const ProductAccountActivation = () => {
	const [isOpen, setIsOpen] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [isFinished, setIsFinished] = useState(false);
	const { offered, ineligible } = partitionPlugins(
		window.extSharedData?.showProductActivation,
	);
	const [plugins, setPlugins] = useState(offered);

	const [email, setEmail] = useState(window.extSharedData?.userEmail ?? '');
	const [marketingConsent, setMarketingConsent] = useState(false);
	const [termsAgreed, setTermsAgreed] = useState(false);
	const { scriptData, activatePlugins } = usePluginsActivation(
		plugins,
		ineligible,
	);

	useEffect(() => {
		const style = document.createElement('style');
		style.textContent = '.grecaptcha-badge { visibility: hidden; }';
		document.head.appendChild(style);
	}, []);

	const handleClose = () => {
		activatePlugins({
			status: ACTIVATION_STATUS.skipped,
		});
		setIsOpen(false);
	};

	const handleCreateAccounts = async () => {
		if (!isEmail(email)) return;

		setIsLoading(true);

		const selectedPlugins = plugins?.filter((plugin) => plugin.selected) ?? [];

		const results = await Promise.allSettled(
			selectedPlugins.map((plugin) =>
				createAccount(plugin, {
					email,
					marketingConsent,
					termsAgreed,
					scriptData: { ...scriptData?.[plugin.slug], ...plugin.scriptData },
				}),
			),
		);

		const context = Object.fromEntries(
			selectedPlugins.map((plugin, index) => {
				const result = results[index];
				const { requestTimeInMs, captchaTimeInMs, retries, errors } =
					result.status === 'fulfilled' ? result.value : result.reason;
				const entry = {
					status: result.status === 'fulfilled' ? 'success' : 'error',
					requestTimeInMs,
					captchaTimeInMs,
					endpoint: `extendify/v1/${plugin.slug}/create-account`,
					extendifyVersion: window.extSharedData?.version,
					retries,
					...(errors.length > 0 && { errors }),
				};
				return [plugin.slug, entry];
			}),
		);

		await activatePlugins({
			status: ACTIVATION_STATUS.completed,
			context,
		});

		setIsFinished(true);
		setIsLoading(false);
	};

	return (
		plugins.length > 0 && (
			<Dialog open={isOpen} onClose={() => {}} className="extendify-shared">
				{/* Utilities on the scope-class element itself never match the prefixed CSS. */}
				<div className="relative z-high">
					<DialogBackdrop
						transition
						className="fixed inset-0 bg-black/30 transition-opacity data-closed:opacity-0"
					/>

					<div className="z-10 fixed inset-0 flex w-screen items-center justify-center p-4 [body:has(#extendify-agent-chat)_&]:ml-96 [body:has(#extendify-agent-chat)_&]:w-[calc(100%-24rem)]">
						<DialogPanel
							transition
							className="relative w-full max-w-208 bg-white rounded-lg shadow-xl transition-all data-closed:opacity-0 data-closed:scale-95"
						>
							{!isFinished && !isLoading && (
								<SetupPlugins
									plugins={plugins}
									setPlugins={setPlugins}
									handleCreateAccounts={handleCreateAccounts}
									email={email}
									setEmail={setEmail}
									handleClose={handleClose}
									marketingConsent={marketingConsent}
									setMarketingConsent={setMarketingConsent}
									termsAgreed={termsAgreed}
									setTermsAgreed={setTermsAgreed}
								/>
							)}

							{!isFinished && isLoading && <Loading />}

							{isFinished && (
								<SetupComplete handleClose={() => setIsOpen(false)} />
							)}
						</DialogPanel>
					</div>
				</div>
			</Dialog>
		)
	);
};
