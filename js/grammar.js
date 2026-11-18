/*
 * Grammar Checker：当前由少量内置例句模拟语法建议。
 * callAI(sentence) 是未来接入 AI 服务的边界，浏览器当前不会发出网络请求。
 */
(function () {
	'use strict';

	const EXAMPLES = [
		{
			input: 'i study python yesterday',
			correction: 'I studied Python yesterday.',
			explanation: 'Yesterday indicates past time, therefore the verb should use past tense.'
		},
		{
			input: 'he go to work every day',
			correction: 'He goes to work every day.',
			explanation: 'With he, she, or it in the present simple, add -s or -es to the verb.'
		},
		{
			input: 'we was fixing a bug',
			correction: 'We were fixing a bug.',
			explanation: 'Use were with we in the past form of be.'
		},
		{
			input: 'the feature work good',
			correction: 'The feature works well.',
			explanation: 'Use works with a singular subject. Well is the adverb that describes how it works.'
		},
		{
			input: 'she do not understand the requirement',
			correction: 'She does not understand the requirement.',
			explanation: 'Use does not with she in the present simple; the main verb stays in its base form.'
		},
		{
			input: 'the tests was failing',
			correction: 'The tests were failing.',
			explanation: 'Tests is plural, so use were rather than was.'
		}
	];

	function normalize(sentence) {
		return sentence.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').toLowerCase();
	}

	// Replace this local lookup with a server-side provider adapter when AI is connected.
	async function callAI(sentence) {
		const sample = EXAMPLES.find((item) => normalize(item.input) === normalize(sentence));
		if (sample) return { correction: sample.correction, explanation: sample.explanation };
		return {
			correction: sentence.trim().replace(/\s+([,.!?])/g, '$1'),
			explanation: 'No matching built-in example was found. This local demo does not call an AI service yet.'
		};
	}

	function init() {
		const form = document.getElementById('grammar-form');
		if (!form) return;

		const input = document.getElementById('grammar-input');
		const result = document.getElementById('grammar-result');
		const correction = document.getElementById('grammar-correction');
		const explanation = document.getElementById('grammar-explanation');
		const submit = form.querySelector('button[type="submit"]');

		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const sentence = input.value.trim();
			if (!sentence) return;

			submit.disabled = true;
			try {
				const response = await callAI(sentence);
				correction.textContent = response.correction;
				explanation.textContent = response.explanation;
				result.hidden = false;
				window.EnglishCoach.recordGrammar();
			} catch (error) {
				correction.textContent = 'Unable to check this sentence.';
				explanation.textContent = 'Please try again.';
				result.hidden = false;
			} finally {
				submit.disabled = false;
			}
		});
	}

	window.GrammarChecker = { init, callAI };
	document.addEventListener('DOMContentLoaded', init);
})();