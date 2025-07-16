import { useEffect, useCallback, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Questionnaire } from '@launch/components/Questionnaire';
import { Title } from '@launch/components/Title';
import { PageLayout } from '@launch/layouts/PageLayout';
import { pageState } from '@launch/state/factory';
import { useUserSelectionStore } from '@launch/state/user-selections';

export const state = pageState('Site Questions', () => ({
	ready: false,
	canSkip: false,
	useNav: true,
	onRemove: () => {},
}));

export const SiteQuestions = () => {
	const {
		siteInformation,
		siteQA,
		setSiteQuestionAnswer,
		setShowHiddenQuestions,
		setSiteStructure,
	} = useUserSelectionStore();

	const pageTitle = sprintf(
		// translators: %s: The site title
		__('Let’s confirm more details about %s', 'extendify-local'),
		siteInformation?.title || 'your website',
	);

	const showHiddenQuestions = siteQA?.showHidden;

	const questionsToRender = showHiddenQuestions
		? siteQA?.questions
		: siteQA?.questions?.filter((q) => q.group === 'visible');

	const hasQuestions =
		Array.isArray(questionsToRender) && questionsToRender.length > 0;

	const allAnswered =
		hasQuestions &&
		questionsToRender.every(
			(question) => question?.answerUser || question?.answerAI,
		);

	const componentMounted = useRef(false);

	useEffect(() => {
		state.setState({ ready: allAnswered });
	}, [allAnswered]);

	const applyAnswerEffects = useCallback(
		(questionId, answerId) => {
			if (questionId === 'pages') {
				if (answerId === 'multiple-pages') setSiteStructure('multi-page');
				if (answerId === 'one-page') setSiteStructure('single-page');
			}

			if (questionId === 'external-cta' && answerId === 'yes') {
				setSiteStructure('single-page');
			}
		},
		[setSiteStructure],
	);

	const handleChanges = (questionId, answerId, options = {}) => {
		setSiteQuestionAnswer(questionId, answerId, options);
		applyAnswerEffects(questionId, answerId);
	};

	useEffect(() => {
		if (!hasQuestions || componentMounted.current) return;

		questionsToRender.forEach((question) => {
			const answer = question?.answerUser || question?.answerAI;
			if (!answer) return;

			applyAnswerEffects(question.id, answer);
		});

		componentMounted.current = true;
	}, [applyAnswerEffects, hasQuestions, questionsToRender]);

	return (
		<PageLayout>
			<div className="grow overflow-y-auto px-6 py-8 md:p-12 3xl:p-16">
				<Title title={pageTitle} />
				{!hasQuestions && (
					<div className="text-center text-gray-500">
						{__('Loading...', 'extendify-local')}
					</div>
				)}
				{hasQuestions && (
					<>
						<Questionnaire
							questions={questionsToRender}
							onAnswerChange={handleChanges}
						/>

						{!showHiddenQuestions && (
							<div className="flex justify-center">
								<button
									type="button"
									className="mt-12 flex cursor-pointer flex-col items-center bg-transparent text-base font-medium text-design-main"
									onClick={() => setShowHiddenQuestions(true)}>
									{__('Show more questions', 'extendify-local')}
									<svg
										className="fill-current"
										width="32"
										height="32"
										viewBox="0 0 32 32"
										fill="none"
										xmlns="http://www.w3.org/2000/svg">
										<path d="M23.3327 15.4672L15.9993 21.3339L8.66602 15.4672L9.86602 13.8672L15.9993 18.6672L21.9993 13.8672L23.3327 15.4672Z" />
									</svg>
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</PageLayout>
	);
};
