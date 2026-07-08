import {
	callTool,
	handleWorkflow,
	pickWorkflow,
	recordAgentActivity,
} from '@agent/api';
import { Chat } from '@agent/Chat';
import { ChatInput } from '@agent/components/ChatInput';
import { ChatMessages } from '@agent/components/ChatMessages';
import { UsageMessage } from '@agent/components/messages/UsageMessage';
import { PageDocument } from '@agent/components/PageDocument';
import { useLockPost } from '@agent/hooks/useLockPost';
import {
	abilityAffectsCurrentPage,
	isAbilityWorkflow,
} from '@agent/lib/abilities';
import { getRedirectUrl } from '@agent/lib/redirects';
import { useChatStore } from '@agent/state/chat';
import { useGlobalStore } from '@agent/state/global';
import { useStatusStore } from '@agent/state/status';
import { useSuggestionsStore } from '@agent/state/suggestions';
import { useWorkflowStore } from '@agent/state/workflows';
import { useQuickEditStore } from '@quick-edit/state/store';
import { digest } from '@shared/api/digest';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const devmode = window.extSharedData.devbuild;
// Used to abort when wf canceled - reset in cleanup()
let controller = new AbortController();
const { postId } = window?.extAgentData?.context || {};

export const Agent = () => {
	const { addMessage, popMessage } = useChatStore();
	const { pushStatus, clearStatuses } = useStatusStore();
	const {
		mergeWorkflowData,
		getWorkflow,
		getWorkflowByExample,
		workflowData,
		setWorkflow,
		setWhenFinishedToolProps,
		whenFinishedToolProps,
		getAvailableWorkflows,
	} = useWorkflowStore();
	const block = useQuickEditStore((s) => s.agentBlock);
	const setBlock = useQuickEditStore((s) => s.setAgentBlock);
	const workflowIds = getAvailableWorkflows().map((w) => w.id);
	const { open, setOpen, updateRetryAfter, isChatAvailable } = useGlobalStore();
	useLockPost({ postId, enabled: !!open });
	const [canType, setCanType] = useState(true);
	const agentWorking = useRef(false);
	const toolWorking = useRef(false);
	const retrying = useRef(false);
	const [waitingOnToolOrUser, setWaitingOnToolOrUser] = useState(false);
	const [loop, setLoop] = useState(0);
	const workflow = getWorkflow();
	const chatAvailable = useMemo(() => isChatAvailable(), [isChatAvailable]);
	const { addSuggestions, getSuggestions } = useSuggestionsStore();

	const cleanup = useCallback(() => {
		setCanType(true);
		agentWorking.current = false;
		setWaitingOnToolOrUser(false);
		controller = new AbortController();
		block && setBlock(null);
		clearStatuses();
		window.dispatchEvent(new Event('extendify-agent:remove-block-highlight'));
		// scrollIntoView below walks up and scrolls the page itself,
		// fighting useLayoutShift's scroll restore when closing.
		if (!useGlobalStore.getState().open) return;
		const c = Array.from(
			document.querySelectorAll(
				'#extendify-agent-chat-scroll-area div:last-child',
			),
		)?.at(-1);
		c?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		c?.scrollBy({ top: -5, behavior: 'smooth' });
	}, [setBlock, block, clearStatuses]);

	const findAgent = useCallback(
		async (options = {}) => {
			pushStatus('calling-agent');
			const response = await pickWorkflow({
				workflows: workflowIds,
				options: { signal: controller.signal, ...options },
			}).catch(async (error) => {
				devmode && console.error(error);
				if (error?.response?.status === 429) {
					updateRetryAfter(error?.response?.headers?.get('Retry-After'));
					setCanType(false);
					pushStatus('credits-exhausted');
					return;
				}
				setCanType(true);
				if (error === 'Workflow aborted') {
					addMessage('workflow', { status: 'canceled' });
					return;
				}

				await new Promise((resolve) => setTimeout(resolve, 1000));
				addMessage('message', {
					role: 'assistant',
					// translators: This message is shown when the AI agent fails to find a suitable workflow.
					content: __(
						'Something went wrong while trying to start this request. Please try again.',
						'extendify-local',
					),
					error: true,
				});
				return;
			});
			if (!response) return;

			const { workflow: wf, reply } = response;
			if (wf?.id) setWorkflow(wf);
			if (reply) {
				const data = { role: 'assistant', content: reply, agent: wf?.agent };
				addMessage('message', data);
			}
			if (!wf?.id) setCanType(true);
		},
		[addMessage, pushStatus, updateRetryAfter, setWorkflow, workflowIds],
	);

	const handleSubmit = useCallback(
		async (message) => {
			// Save any in-flight QE canvas edits before the agent runs so
			// the user doesn't lose their work to a workflow that touches
			// the same block. No-op when no QE canvas is mounted.
			window.dispatchEvent(
				new CustomEvent('extendify-quick-edit:agent-submit'),
			);
			setWaitingOnToolOrUser(false);
			agentWorking.current = false;
			addMessage('message', { role: 'user', content: message });

			// Let some phrases auto load workflows
			const bypass = getWorkflowByExample(message);
			if (bypass?.example?.agentResponse) {
				// whenFinishedTool → inline input UI; none → ask for a typed reply.
				return bypass.example.agentResponse.whenFinishedTool
					? handleBypass(bypass)
					: handleInstantAsk(bypass);
			}

			setCanType(false);
			// If they typed while waiting on a redirect, reset the workflow
			const redirect = workflow?.needsRedirect?.();
			// If they typed while an active whenFinished, reset the workflow
			const inWhenFinished = whenFinishedToolProps?.id;
			const removingWorkflow = redirect || inWhenFinished;
			if (removingWorkflow) setWorkflow(null);

			// They are in the middle of a workflow back and forth
			if (workflow && !removingWorkflow) {
				// Clone the workflow to let the effect handle it
				const wfData = workflowData || {};
				setWorkflow({ ...workflow });
				mergeWorkflowData(wfData);
				return;
			}

			await findAgent().catch((e) => devmode && console.error(e));
		},
		[
			addMessage,
			findAgent,
			mergeWorkflowData,
			whenFinishedToolProps,
			setWorkflow,
			workflow,
			workflowData,
			getAvailableWorkflows,
		],
	);

	// Used to inject a workflow final state
	const handleBypass = useCallback(async (workflow) => {
		const agentResponse = workflow.example?.agentResponse;
		cleanup();
		if (!agentResponse) return;
		setWorkflow(workflow);
		setCanType(false);
		agentWorking.current = true;
		await new Promise((resolve) => setTimeout(resolve, 750));
		addMessage('message', {
			role: 'assistant',
			content: agentResponse.reply,
		});
		setWhenFinishedToolProps({
			...agentResponse?.whenFinishedTool,
			agentResponse,
		});
		recordAgentActivity({
			sessionId: workflow?.sessionId,
			action: 'workflow_tool_bypass',
			value: { workflow: workflow?.id },
		});
	}, []);

	// Ask the user, then let the normal loop handle their typed reply.
	const handleInstantAsk = useCallback(async (workflow) => {
		const agentResponse = workflow.example?.agentResponse;
		cleanup();
		if (!agentResponse) return;
		setWorkflow(workflow);
		// Without this the loop calls the backend before the user has typed.
		setWaitingOnToolOrUser(true);
		setCanType(false);
		agentWorking.current = true;
		await new Promise((resolve) => setTimeout(resolve, 750));
		addMessage('message', {
			role: 'assistant',
			content: agentResponse.reply,
		});
		agentWorking.current = false;
		setCanType(true);
		recordAgentActivity({
			sessionId: workflow?.sessionId,
			action: 'workflow_instant_ask',
			value: { workflow: workflow?.id },
		});
	}, []);

	useEffect(() => {
		// Allow external messages to trigger the agent
		const handleMessage = ({ detail }) => {
			if (!detail?.message) return;
			handleSubmit(detail.message);
		};
		// Allow external code to clear the block and workflow
		const handleCleanup = () => {
			controller.abort('Workflow aborted');
			cleanup();

			if (!workflow?.id) return;
			setWorkflow(null);
			addMessage('workflow', {
				status: 'canceled',
				agent: workflow.agent,
				workflowId: workflow.id,
			});
			return;
		};
		window.addEventListener('extendify-agent:cancel-workflow', handleCleanup);
		window.addEventListener('extendify-agent:chat-submit', handleMessage);
		return () => {
			window.removeEventListener(
				'extendify-agent:cancel-workflow',
				handleCleanup,
			);
			window.removeEventListener('extendify-agent:chat-submit', handleMessage);
		};
	}, [handleSubmit, cleanup, setWorkflow, addMessage, workflow]);

	// Handle whenFinished component confirm/cancel
	useEffect(() => {
		const handleConfirm = async ({ detail }) => {
			if (toolWorking.current) return;
			setWhenFinishedToolProps(null);
			pushStatus('workflow-tool-processing');
			toolWorking.current = true;
			const { data, whenFinishedToolProps, shouldRefreshPage, redirectUrl } =
				detail ?? {};
			const { whenFinishedTool, answerId, redirectTo } =
				whenFinishedToolProps?.agentResponse || {};
			const { id, labels } = whenFinishedTool || {};
			// Not all workflows have a tool at the end (e.g. tours)
			const toolResponse = await callTool?.({ tool: id, inputs: data }).catch(
				(error) => {
					const { sessionId } = workflow || {};
					digest({
						error,
						details: {
							source: 'agent',
							caller: `when-finished: ${id}`,
							sessionId,
						},
					});
					devmode && console.error(error);
					return { error: { message: error?.message, code: error?.code } };
				},
			);
			toolWorking.current = false;
			// Only loop back on error, so the model can recover. A clean
			// whenFinished tool means the workflow is done.
			if (toolResponse?.error) {
				addMessage('tool', { id, inputs: data, result: toolResponse });
				setWaitingOnToolOrUser(false);
				agentWorking.current = false;
				setLoop((prev) => prev + 1);
				return;
			}

			// Later runs of this workflow need the result (e.g. created ids).
			if (id) addMessage('tool', { id, inputs: data, result: toolResponse });
			addSuggestions(whenFinishedToolProps.agentResponse?.recommendations);
			addMessage('workflow', {
				status: 'completed',
				label: labels?.confirm,
				agent: workflow.agent,
				workflowId: workflow.id,
				answerId,
				suggestions: getSuggestions(),
			});
			setWorkflow(null);

			const url = getRedirectUrl(redirectTo, whenFinishedToolProps?.inputs);
			const refreshForAbility = abilityAffectsCurrentPage(id, data);
			if (url || redirectUrl || shouldRefreshPage || refreshForAbility) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
			if (url) return window.location.assign(url);
			if (redirectUrl) return window.location.assign(redirectUrl);
			if (shouldRefreshPage || refreshForAbility)
				return window.location.reload();
			cleanup();
		};
		const handleCancel = ({ detail }) => {
			if (toolWorking.current) return;
			const { answerId, whenFinishedTool } =
				detail.whenFinishedToolProps?.agentResponse || {};
			addMessage('workflow', {
				status: 'canceled',
				label: whenFinishedTool?.labels?.cancel,
				agent: workflow.agent,
				workflowId: workflow.id,
				answerId,
				suggestions: getSuggestions(),
			});
			setWorkflow(null);
			cleanup();
		};
		const handleRetry = () => {
			popMessage();
			setWaitingOnToolOrUser(false);
			agentWorking.current = false;
			retrying.current = true;
			setLoop((prev) => prev + 1); // Trigger next loop
		};
		window.addEventListener('extendify-agent:workflow-confirm', handleConfirm);
		window.addEventListener('extendify-agent:workflow-cancel', handleCancel);
		window.addEventListener('extendify-agent:workflow-retry', handleRetry);
		return () => {
			window.removeEventListener(
				'extendify-agent:workflow-confirm',
				handleConfirm,
			);
			window.removeEventListener(
				'extendify-agent:workflow-cancel',
				handleCancel,
			);
			window.removeEventListener('extendify-agent:workflow-retry', handleRetry);
		};
	}, [
		addMessage,
		pushStatus,
		popMessage,
		cleanup,
		setWorkflow,
		workflow,
		getSuggestions,
		addSuggestions,
	]);

	useEffect(() => {
		const handleClose = () => setOpen(false);
		const handleOpen = () => setOpen(true);
		window.addEventListener('extendify-agent:close', handleClose);
		window.addEventListener('extendify-agent:open', handleOpen);
		return () => {
			window.removeEventListener('extendify-agent:close', handleClose);
			window.removeEventListener('extendify-agent:open', handleOpen);
		};
	}, [setOpen]);

	// Closing the sidebar dismisses any latent block selection. The X-close
	// indicator (in DOMHighlighter) only renders while the sidebar is open,
	// so leaving `block` set after close would let Quick Edit's hover-bar
	// gate fire on a selection the user can no longer see or clear.
	useEffect(() => {
		if (open) return;
		if (block) setBlock(null);
	}, [open, block, setBlock]);

	useEffect(() => {
		if (waitingOnToolOrUser || !open || !workflow?.id) return;
		// Some workflows require they dont change pages
		const theyMoved = workflow?.startingPage !== window.location.href;
		// Requires a block to be selected
		const blockMissing = !block && workflow?.requires?.includes('block');
		const cancelWorkflow =
			(workflow?.cancelOnPageChange && theyMoved) || blockMissing;
		if (cancelWorkflow) {
			addMessage('workflow', {
				status: 'canceled',
				agent: workflow.agent,
				workflowId: workflow.id,
				suggestions: getSuggestions(),
			});
			setWorkflow(null);
			cleanup();
			return;
		}
		// A component is running
		if (whenFinishedToolProps?.id) return;
		// They must be on a page where they can do work
		if (workflow?.needsRedirect?.()) {
			cleanup();
			return;
		}
		(async () => {
			if (agentWorking.current) return; // Prevent multiple calls
			if (toolWorking.current) return;
			setCanType(false);
			agentWorking.current = true;
			pushStatus('agent-working');
			const agentResponse = await handleWorkflow({
				workflow,
				workflowData,
				options: { signal: controller.signal, retry: retrying.current },
			}).catch((error) => {
				// handleCleanup already added the canceled message
				if (error === 'Workflow aborted') return;
				const { sessionId } = workflow || {};
				digest({
					error,
					details: { source: 'agent', caller: `handle-workflow`, sessionId },
				});
				devmode && console.error(error);
				return { error: error.message };
			});
			if (retrying.current) retrying.current = false;
			if (!agentResponse) return;
			const { answerId, sessionId } = agentResponse;
			if (!open) return;
			if (agentResponse.error) {
				// mutate the window to add failed tools rather than keep state
				window.extAgentData.failedWorkflows =
					window.extAgentData.failedWorkflows || new Set();
				window.extAgentData.failedWorkflows.add(workflow.id);
				throw new Error(`Error handling workflow: ${agentResponse.error}`);
			}
			// The ai sent back some text to show to the user
			if (agentResponse.reply) {
				addMessage('message', {
					role: 'assistant',
					content: agentResponse.reply,
					followup: !!agentResponse.tool,
					pageSuggestion: agentResponse.pageSuggestion,
					agent: workflow.agent,
					sessionId: workflow?.sessionId,
					workflowId: workflow?.id,
					language: workflow?.language,
				});
			}
			// This is at the end of the workflow
			// and we are about to execute the final tool
			if (agentResponse.whenFinishedTool?.id) {
				setWhenFinishedToolProps({
					...agentResponse.whenFinishedTool,
					agentResponse,
				});
				// If static, add it as a message
				const { id, inputs, static: staticC } = agentResponse.whenFinishedTool;
				if (staticC) {
					addMessage('workflow-component', {
						id,
						status: 'completed',
						inputs,
						workflowId: workflow.id,
					});
					addSuggestions(agentResponse.recommendations);
					setWorkflow(null);
					addMessage('workflow', {
						status: 'completed',
						agent: workflow.agent,
						workflowId: workflow.id,
						answerId,
						suggestions: getSuggestions(),
					});
					cleanup();
				}
				return;
			}
			// If we're done, it means the AI has the answer
			if (agentResponse.status !== 'in-progress') {
				const { recommendations, status } = agentResponse;
				const isCompleted = status === 'completed';
				if (recommendations) addSuggestions(recommendations);
				setWorkflow(null);
				cleanup();
				addMessage('workflow', {
					status: isCompleted ? 'completed' : 'canceled',
					agent: workflow.agent,
					workflowId: workflow.id,
					answerId,
					suggestions: getSuggestions(),
				});
				return;
			}
			if (sessionId && sessionId !== workflow.sessionId) {
				// Session ID changed, update the workflow
				setWorkflow({ ...workflow, sessionId });
			}
			// These inputs are filled out by the AI
			mergeWorkflowData(agentResponse.inputs);
			// Agent needs more info from a
			if (agentResponse.tool) {
				const { id, inputs, labels } = agentResponse.tool;
				pushStatus('tool-started', labels?.started);
				const toolData = await Promise.all([
					callTool({ tool: id, inputs }),
					new Promise((resolve) => setTimeout(resolve, 3000)),
				])
					.then(([data]) => data)
					.catch((error) => {
						const { sessionId } = workflow || {};
						digest({
							error,
							details: {
								source: 'agent',
								caller: `in-progress: ${id}`,
								sessionId,
							},
						});
						devmode && console.error(error);
						// Don't throw; the loop hands the error to the model.
						return { error: { message: error?.message, code: error?.code } };
					});
				pushStatus('tool-completed', labels?.confirm);
				await new Promise((resolve) => setTimeout(resolve, 1000));
				// do-when-finished spreads first-class workflowData into the tool.
				if (!toolData?.error && !isAbilityWorkflow(workflow.id)) {
					mergeWorkflowData(toolData);
				}
				addMessage('tool', { id, inputs, result: toolData });
				setWaitingOnToolOrUser(false);
				agentWorking.current = false;
				setLoop((prev) => prev + 1); // Trigger next loop
				return;
			}
			setCanType(true);
			setWaitingOnToolOrUser(true);
		})().catch(async (error) => {
			const { sessionId } = workflow || {};
			digest({
				error,
				details: { source: 'agent', caller: 'main-loop', sessionId },
			});
			devmode && console.error(error);
			setWorkflow(null);
			cleanup();
			await new Promise((resolve) => setTimeout(resolve, 1000));
			addMessage('message', {
				role: 'assistant',
				// translators: This message is shown when the AI agent encounters a general error.
				content: __(
					"Sorry, something went wrong. I tried but wasn't able to do this request. Please try again.",
					'extendify-local',
				),
				error: true,
			});
		});
	}, [
		loop,
		cleanup,
		open,
		workflow,
		workflowData,
		addMessage,
		pushStatus,
		setWorkflow,
		agentWorking,
		waitingOnToolOrUser,
		mergeWorkflowData,
		canType,
		whenFinishedToolProps,
		setWhenFinishedToolProps,
		block,
		addSuggestions,
		getSuggestions,
	]);

	useEffect(() => {
		if (!canType) return;
		document.querySelector('#extendify-agent-chat-textarea')?.focus();
	}, [canType]);

	const busy = !canType || !chatAvailable || workflow?.id;

	return (
		<Chat busy={busy}>
			<div className="relative z-50 flex h-full flex-col justify-between overflow-auto">
				<ChatMessages
					redirectComponent={
						workflow?.needsRedirect?.() ? workflow.redirectComponent : null
					}
				/>
				<div>
					<div className="relative flex flex-col px-4 pb-2 pt-2.5 shadow-lg-flipped">
						{block ? <PageDocument busy={busy} blockId={block.id} /> : null}
						<UsageMessage
							onReady={() => {
								cleanup();
								pushStatus('credits-restored');
							}}
						/>
					</div>
					<div className="p-4 pb-2 pt-0">
						<ChatInput
							disabled={!canType || !chatAvailable}
							handleSubmit={handleSubmit}
						/>
					</div>
					<div className="text-pretty px-4 pb-2 text-center text-xss leading-none text-gray-700">
						{__(
							'AI Agent can make mistakes. Check changes before saving.',
							'extendify-local',
						)}
					</div>
				</div>
			</div>
		</Chat>
	);
};
