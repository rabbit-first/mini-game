/* Settings for the browser-side OpenRouter connection. */
(function () {
	'use strict';

	const STORAGE_KEY = 'openrouter_api_key';
	const CONNECTION_TEST_URL = 'https://openrouter.ai/api/v1/auth/key';

	function init() {
		const form = document.getElementById('settings-form');
		if (!form) return;

		const keyInput = document.getElementById('openrouter-api-key');
		const testButton = document.getElementById('settings-test');
		const status = document.getElementById('settings-status');
		keyInput.value = localStorage.getItem(STORAGE_KEY) || '';

		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const apiKey = keyInput.value.trim();
			if (!apiKey) {
				status.textContent = 'Enter an OpenRouter API Key before saving.';
				status.className = 'settings-status is-error';
				keyInput.focus();
				return;
			}

			localStorage.setItem(STORAGE_KEY, apiKey);
			status.textContent = 'API Key saved in this browser.';
			status.className = 'settings-status is-success';
		});

		testButton.addEventListener('click', async () => {
			const apiKey = keyInput.value.trim() || localStorage.getItem(STORAGE_KEY) || '';
			if (!apiKey) {
				status.textContent = '❌ Invalid API Key';
				status.className = 'settings-status is-error';
				keyInput.focus();
				return;
			}

			testButton.disabled = true;
			testButton.textContent = 'Testing…';
			status.textContent = '';
			status.className = 'settings-status';

			try {
				const response = await fetch(CONNECTION_TEST_URL, {
					method: 'GET',
					headers: { Authorization: `Bearer ${apiKey}` }
				});
				if (!response.ok) throw new Error('OpenRouter rejected this API Key.');

				status.textContent = '✅ Connected';
				status.className = 'settings-status is-success';
			} catch (error) {
				status.textContent = '❌ Invalid API Key';
				status.className = 'settings-status is-error';
			} finally {
				testButton.disabled = false;
				testButton.innerHTML = 'Test Connection <span aria-hidden="true">↗</span>';
			}
		});
	}

	document.addEventListener('DOMContentLoaded', init);
})();