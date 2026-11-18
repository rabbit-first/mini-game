/* 猜数字玩法：独立管理数字、猜测历史与本局是否已经完成。 */
(function () {
	'use strict';

	function createRound() {
		return {
			target: Math.floor(Math.random() * 100) + 1,
			attempts: 0,
			history: [],
			finished: false,
			message: '输入一个数字，开始挑战。'
		};
	}

	function init() {
		const form = document.getElementById('guess-form');
		if (!form) return;

		const input = document.getElementById('guess-input');
		const display = document.getElementById('guess-display');
		const feedback = document.getElementById('guess-feedback');
		const attempts = document.getElementById('guess-attempts');
		const historyList = document.getElementById('guess-history');
		const restart = document.getElementById('guess-restart');
		let round = GameHub.getState().games.guess || createRound();

		function render() {
			attempts.innerHTML = `${round.attempts} <small>次</small>`;
			feedback.textContent = round.message;
			display.textContent = round.finished ? round.target : '?';
			input.disabled = round.finished;
			form.querySelector('button[type="submit"]').disabled = round.finished;

			if (round.history.length === 0) {
				historyList.innerHTML = '<span class="history-empty">还没有猜测记录</span>';
			} else {
				historyList.innerHTML = round.history.map((entry) => {
					const label = entry.result === 'correct' ? `${entry.value} ✓` : `${entry.value} ${entry.result === 'low' ? '↑' : '↓'}`;
					return `<span class="history-pill is-${entry.result}">${label}</span>`;
				}).join('');
			}
		}

		function saveRound() {
			GameHub.saveGame('guess', round);
			render();
		}

		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const value = Number(input.value);
			if (!Number.isInteger(value) || value < 1 || value > 100) {
				round.message = '请输入 1 到 100 之间的整数。';
				render();
				input.focus();
				return;
			}

			round.attempts += 1;
			if (value === round.target) {
				round.finished = true;
				round.message = `答对了！你用了 ${round.attempts} 次找到答案。`;
				round.history.unshift({ value, result: 'correct' });
				const state = GameHub.getState();
				state.stats.guessWins += 1;
				GameHub.saveGame('guess', round);
				GameHub.reward(24, 35, '猜数字挑战完成！');
			} else {
				const result = value < round.target ? 'low' : 'high';
				round.message = result === 'low' ? '太小了，再往上猜一点。' : '太大了，试着往下找。';
				round.history.unshift({ value, result });
				GameHub.saveGame('guess', round);
			}
			input.value = '';
			render();
			if (!round.finished) input.focus();
		});

		restart.addEventListener('click', () => {
			round = createRound();
			saveRound();
			input.value = '';
			input.focus();
		});

		if (!GameHub.getState().games.guess) GameHub.saveGame('guess', round);
		render();
	}

	window.GuessGame = { init };
})();
