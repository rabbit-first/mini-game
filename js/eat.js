/*
 * 今晚吃什么：提供一个完全本地运行的随机餐饮抽选器。
 * 抽选期间锁定按钮，避免多条计时器并行；完成后再保存结果和发放奖励。
 */
(function () {
	'use strict';

	const FOODS = [
		'番茄鸡蛋面', '牛肉拉面', '炸酱面', '重庆小面', '黄焖鸡米饭',
		'宫保鸡丁', '鱼香肉丝', '红烧肉', '糖醋里脊', '麻婆豆腐',
		'扬州炒饭', '蛋炒饭', '咖喱鸡饭', '照烧鸡腿饭', '牛肉盖饭',
		'猪肉饺子', '鲜肉包子', '小笼包', '馄饨', '煎饼果子',
		'麻辣烫', '火锅', '烤肉', '寿司', '韩式拌饭',
		'披萨', '汉堡薯条', '意大利面', '沙拉轻食', '酸菜鱼'
	];

	function init() {
		const button = document.getElementById('food-spin');
		if (!button) return;

		const result = document.getElementById('food-result');
		const caption = document.getElementById('food-caption');
		const spinCounter = document.getElementById('food-spins');
		const savedGame = GameHub.getState().games.food || {};
		let spinCount = Number.isInteger(savedGame.spins) ? savedGame.spins : 0;
		let timer = 0;

		spinCounter.textContent = String(spinCount);
		if (savedGame.lastChoice) {
			result.textContent = savedGame.lastChoice;
			caption.textContent = '上次的选择已为你保存，想换一个就再抽一次。';
		}

		button.addEventListener('click', () => {
			if (timer) return;

			button.disabled = true;
			result.classList.add('is-spinning');
			caption.textContent = '正在为今晚挑选美味…';
			const stopAt = Date.now() + 3000;

			timer = window.setInterval(() => {
				result.textContent = FOODS[Math.floor(Math.random() * FOODS.length)];
				if (Date.now() < stopAt) return;

				window.clearInterval(timer);
				timer = 0;
				button.disabled = false;
				result.classList.remove('is-spinning');
				caption.textContent = '今晚就吃这个吧，祝你用餐愉快！';
				spinCount += 1;
				spinCounter.textContent = String(spinCount);

				const finalChoice = result.textContent;
				GameHub.getState().stats.foodSpins += 1;
				GameHub.saveGame('food', { spins: spinCount, lastChoice: finalChoice });
				GameHub.reward(4, 0, '晚餐已决定！');
			}, 85);
		});
	}

	window.EatGame = { init };
})();