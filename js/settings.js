/* Settings for the browser-side OpenRouter connection. */
(function () {
	'use strict';

	const STORAGE_KEY = 'openrouter_api_key';
	const CURRENT_MODEL_KEY = 'openrouter_current_model';
	const CONNECTION_TEST_URL = 'https://openrouter.ai/api/v1/chat/completions';
	const TEST_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
	const STATUS_LABELS = {
		'not-tested': '⚪ Not Tested',
		testing: '⚪ Testing…',
		connected: '✅ Connected',
		'invalid-key': '❌ Invalid API Key',
		'model-unavailable': '⚠ Model Unavailable',
		'insufficient-balance': '⚠ Insufficient Balance'
	};

	function init() {
		const form = document.getElementById('settings-form');
		if (!form) return;

		const keyInput = document.getElementById('openrouter-api-key');
		const visibilityButton = document.getElementById('settings-key-visibility');
		const saveButton = document.getElementById('settings-save');
		const testButton = document.getElementById('settings-test');
		const status = document.getElementById('settings-status');
		const statusText = document.getElementById('settings-status-text');
		const statusDetail = document.getElementById('settings-status-detail');
		const currentModel = document.getElementById('settings-current-model');
		keyInput.value = localStorage.getItem(STORAGE_KEY) || '';
		currentModel.textContent = localStorage.getItem(CURRENT_MODEL_KEY) || 'Not used yet';
		window.addEventListener('openrouter:model-used', (event) => {
			currentModel.textContent = event.detail.model;
		});

		function setStatus(state, detail = '') {
			status.dataset.state = state;
			statusText.textContent = STATUS_LABELS[state];
			statusDetail.textContent = detail;
		}

		function setCurrentModel(model) {
			localStorage.setItem(CURRENT_MODEL_KEY, model);
			currentModel.textContent = model;
			window.dispatchEvent(new CustomEvent('openrouter:model-used', { detail: { model } }));
		}

		function getFailureStatus(response, payload) {
			const message = String(payload?.error?.message || '').toLowerCase();
			if (response.status === 401 || response.status === 403 || /invalid.*key|unauthorized|authentication/.test(message)) {
				return 'invalid-key';
			}
			if (response.status === 402 || /insufficient.*(balance|credit)|not enough credits/.test(message)) {
				return 'insufficient-balance';
			}
			return 'model-unavailable';
		}

		async function testConnection() {
			const apiKey = keyInput.value.trim();
			if (!apiKey) {
				setStatus('invalid-key', 'Enter an OpenRouter API Key to test the connection.');
				keyInput.focus();
				return;
			}

			testButton.disabled = true;
			saveButton.disabled = true;
			testButton.textContent = 'Testing…';
			setStatus('testing');
			const startedAt = performance.now();

			try {
				const response = await fetch(CONNECTION_TEST_URL, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${apiKey}`,
						'Content-Type': 'application/json',
						'HTTP-Referer': window.location.origin,
						'X-Title': 'AI English Coach'
					},
					body: JSON.stringify({
						model: TEST_MODEL,
						messages: [{ role: 'user', content: 'Hello' }],
						max_tokens: 32
					})
				});
				let payload = {};
				try {
					payload = await response.json();
				} catch (error) {
					payload = {};
				}

				if (!response.ok) {
					const state = getFailureStatus(response, payload);
					setStatus(state, payload?.error?.message || `Request failed (HTTP ${response.status}).`);
					return;
				}
				if (typeof payload?.choices?.[0]?.message?.content !== 'string') {
					setStatus('model-unavailable', 'The model returned no response.');
					return;
				}

				const elapsed = Math.round(performance.now() - startedAt);
				setCurrentModel(TEST_MODEL);
				setStatus('connected', `Response time: ${elapsed} ms`);
			} catch (error) {
				setStatus('model-unavailable', error.message || 'Unable to reach OpenRouter.');
			} finally {
				testButton.disabled = false;
				saveButton.disabled = false;
				testButton.innerHTML = 'Test Connection <span aria-hidden="true">↗</span>';
			}
		}

		visibilityButton.addEventListener('click', () => {
			const showKey = keyInput.type === 'password';
			keyInput.type = showKey ? 'text' : 'password';
			visibilityButton.setAttribute('aria-pressed', String(showKey));
			visibilityButton.setAttribute('aria-label', showKey ? 'Hide API Key' : 'Show API Key');
			visibilityButton.title = showKey ? 'Hide API Key' : 'Show API Key';
		});

		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const apiKey = keyInput.value.trim();
			if (!apiKey) {
				setStatus('invalid-key', 'Enter an OpenRouter API Key before saving.');
				keyInput.focus();
				return;
			}

			localStorage.setItem(STORAGE_KEY, apiKey);
			await testConnection();
		});

		testButton.addEventListener('click', testConnection);
		setStatus('not-tested');
		if (keyInput.value.trim()) testConnection();
	}

	document.addEventListener('DOMContentLoaded', init);
})();