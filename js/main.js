/*
 * Mini Game Hub 的公共控制器。
 * 这里集中管理玩家资料、每日奖励和本地存档；各游戏只负责自身规则，
 * 并通过 window.GameHub 这个轻量接口修改奖励与游戏记录。
 */
(function () {
	'use strict';

	const STORAGE_KEY = 'mini-game-hub-save-v1';

	// 所有持久化数据都放在这一个版本化对象中，后续增加字段时仍能兼容旧存档。
	function createInitialState() {
		return {
			profile: { coins: 0, level: 1, xp: 0, achievements: [] },
			daily: { claimedDate: null, streak: 0 },
			stats: { guessWins: 0, foodSpins: 0, wordAnswered: 0, wordCorrect: 0 },
			games: { guess: null, food: { spins: 0, lastChoice: '' }, word: null }
		};
	}

	// 加载时把新默认字段与已有字段合并，避免新版本代码读到 undefined。
	function loadState() {
		const defaults = createInitialState();
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
			if (!saved || typeof saved !== 'object') return defaults;
			return {
				...defaults,
				...saved,
				profile: { ...defaults.profile, ...(saved.profile || {}) },
				daily: { ...defaults.daily, ...(saved.daily || {}) },
				stats: { ...defaults.stats, ...(saved.stats || {}) },
				games: { ...defaults.games, ...(saved.games || {}) }
			};
		} catch (error) {
			console.warn('无法读取本地存档，将创建新存档。', error);
			return defaults;
		}
	}

	let state = loadState();
	let toastTimer = 0;

	// 使用本地日历格式比较每日奖励，避免 UTC 时区导致午夜附近日期错位。
	function getLocalDateKey(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function getYesterdayKey() {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		return getLocalDateKey(yesterday);
	}

	function xpNeededForLevel(level) {
		return 80 + Math.max(0, level - 1) * 30;
	}

	function saveState() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (error) {
			console.error('存档失败，请检查浏览器的本地存储设置。', error);
			showToast('存档失败：浏览器存储空间不可用');
		}
		renderProfile();
		window.dispatchEvent(new CustomEvent('gamehub:statechange', { detail: state }));
	}

	function renderProfile() {
		const profile = state.profile;
		const needed = xpNeededForLevel(profile.level);
		const percentage = Math.min(100, Math.max(0, (profile.xp / needed) * 100));

		document.querySelectorAll('[data-level]').forEach((element) => { element.textContent = profile.level; });
		document.querySelectorAll('[data-coins]').forEach((element) => { element.textContent = profile.coins; });
		document.querySelectorAll('[data-xp]').forEach((element) => { element.textContent = profile.xp; });
		document.querySelectorAll('[data-xp-needed]').forEach((element) => { element.textContent = needed; });

		const fill = document.querySelector('[data-xp-fill]');
		const bar = document.querySelector('[data-xp-bar]');
		if (fill) fill.style.width = `${percentage}%`;
		if (bar) {
			bar.setAttribute('aria-valuemax', String(needed));
			bar.setAttribute('aria-valuenow', String(profile.xp));
		}

		renderDailyStatus();
	}

	function renderDailyStatus() {
		const status = document.getElementById('daily-status');
		const button = document.getElementById('daily-claim');
		if (!status || !button) return;

		const claimed = state.daily.claimedDate === getLocalDateKey(new Date());
		status.textContent = claimed ? `今日已领取 · 连续 ${state.daily.streak} 天` : '今日奖励待领取';
		button.disabled = claimed;
		button.innerHTML = claimed ? '今日已领取 <span aria-hidden="true">✓</span>' : '领取奖励 <span aria-hidden="true">↗</span>';
	}

	function showToast(message) {
		const toast = document.getElementById('toast');
		if (!toast) return;
		toast.textContent = message;
		toast.classList.add('is-visible');
		window.clearTimeout(toastTimer);
		toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
	}

	function addReward(coins, xp, message) {
		state.profile.coins += Math.max(0, Math.floor(coins));
		state.profile.xp += Math.max(0, Math.floor(xp));

		// 升级可能一次跨过多个等级，因此循环结算而不是只判断一次。
		let levelsGained = 0;
		while (state.profile.xp >= xpNeededForLevel(state.profile.level)) {
			state.profile.xp -= xpNeededForLevel(state.profile.level);
			state.profile.level += 1;
			levelsGained += 1;
		}

		saveState();
		const levelMessage = levelsGained ? ` 升级了！现在是 LV ${state.profile.level}。` : '';
		const rewardSummary = xp > 0 ? `+${coins} 金币，+${xp} XP。` : `+${coins} 金币。`;
		showToast(`${message || '奖励已到账'} ${rewardSummary}${levelMessage}`);
	}

	function switchPage(pageName) {
		document.querySelectorAll('[data-page]').forEach((page) => {
			page.hidden = page.dataset.page !== pageName;
		});
		document.querySelectorAll('.top-nav .nav-link').forEach((link) => {
			link.classList.toggle('is-active', pageName === 'home' && link.dataset.backHome !== undefined);
		});
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function bindNavigation() {
		document.querySelectorAll('[data-open-game]').forEach((button) => {
			button.addEventListener('click', () => switchPage(button.dataset.openGame));
		});
		document.querySelectorAll('[data-back-home]').forEach((button) => {
			button.addEventListener('click', (event) => {
				if (button.tagName === 'A') event.preventDefault();
				switchPage('home');
			});
		});

		const gameLink = document.querySelector('.nav-link[href="#games"]');
		if (gameLink) {
			gameLink.addEventListener('click', (event) => {
				event.preventDefault();
				switchPage('home');
				document.getElementById('games').scrollIntoView({ behavior: 'smooth' });
			});
		}
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') switchPage('home');
		});
	}

	function claimDailyReward() {
		const today = getLocalDateKey(new Date());
		if (state.daily.claimedDate === today) return;

		state.daily.streak = state.daily.claimedDate === getYesterdayKey() ? state.daily.streak + 1 : 1;
		state.daily.claimedDate = today;
		addReward(30, 20, '每日登录奖励');
	}

	// 供独立游戏脚本使用的最小公共 API。
	window.GameHub = {
		getState: () => state,
		save: saveState,
		reward: addReward,
		toast: showToast,
		saveGame: (gameName, gameState) => {
			state.games[gameName] = gameState;
			saveState();
		}
	};

	document.addEventListener('DOMContentLoaded', () => {
		bindNavigation();
		const claimButton = document.getElementById('daily-claim');
		if (claimButton) claimButton.addEventListener('click', claimDailyReward);
		renderProfile();
		if (window.GuessGame) window.GuessGame.init();
		if (window.EatGame) window.EatGame.init();
	});
})();
