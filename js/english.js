/*
 * AI English Coach 的学习控制器。
 * 本模块独立保存英语学习进度，并通过既有 GameHub API 发放金币与经验，
 * 因而不会改变大厅现有玩家存档格式或猜数字、晚餐游戏的行为。
 */
(function () {
	'use strict';

	const STORAGE_KEY = 'mini-game-hub-english-v1';
	const CATEGORIES = [
		'Software Development', 'Debugging', 'Requirement', 'Design', 'Testing',
		'Automotive Software', 'Project Management'
	];

	// 按专业主题组织词库；每条包含简短中文释义和便于记忆的英文解释。
	const WORDS = [
		['Requirement', '需求', 'Software Development', 'a condition or capability needed by a user'],
		['feature', '功能', 'Software Development', 'a part of a product that provides a specific ability'],
		['implement', '实现', 'Software Development', 'to create a feature by writing code'],
		['deployment', '部署', 'Software Development', 'the process of releasing software to an environment'],
		['repository', '代码仓库', 'Software Development', 'a place where a project and its history are stored'],
		['branch', '分支', 'Software Development', 'a separate line of work in version control'],
		['commit', '提交', 'Software Development', 'a saved set of changes in version control'],
		['dependency', '依赖项', 'Software Development', 'software that another program needs to work'],
		['framework', '框架', 'Software Development', 'a reusable structure for building software'],
		['module', '模块', 'Software Development', 'a self-contained part of a larger program'],
		['interface', '接口', 'Software Development', 'a boundary through which two systems communicate'],
		['refactor', '重构', 'Software Development', 'to improve code structure without changing behavior'],
		['release', '发布版本', 'Software Development', 'a version of software made available to users'],
		['maintain', '维护', 'Software Development', 'to keep software working and up to date'],
		['compile', '编译', 'Software Development', 'to translate source code into an executable form'],
		['merge', '合并', 'Software Development', 'to combine changes from different branches'],

		['bug', '缺陷', 'Debugging', 'a problem that causes software to behave incorrectly'],
		['issue', '问题', 'Debugging', 'a reported problem or task that needs attention'],
		['reproduce', '复现', 'Debugging', 'to make a problem happen again using the same steps'],
		['root cause', '根本原因', 'Debugging', 'the original reason that a problem occurred'],
		['stack trace', '堆栈跟踪', 'Debugging', 'a report of function calls leading to an error'],
		['breakpoint', '断点', 'Debugging', 'a marker that pauses a program during debugging'],
		['log', '日志', 'Debugging', 'a record of events produced while software runs'],
		['exception', '异常', 'Debugging', 'an event that interrupts the normal flow of a program'],
		['crash', '崩溃', 'Debugging', 'a sudden stop caused by a serious software problem'],
		['workaround', '临时解决方案', 'Debugging', 'a temporary way to avoid a known problem'],
		['regression', '回归缺陷', 'Debugging', 'a new problem caused by a recent change'],
		['diagnose', '诊断', 'Debugging', 'to identify the cause of a problem'],
		['inspect', '检查', 'Debugging', 'to examine something carefully for problems'],
		['investigate', '调查', 'Debugging', 'to find facts about an issue'],
		['reliable', '可靠的', 'Debugging', 'working consistently without unexpected failures'],
		['timeout', '超时', 'Debugging', 'a limit reached while waiting for an operation'],

		['stakeholder', '相关方', 'Requirement', 'a person or group affected by a project'],
		['acceptance criteria', '验收标准', 'Requirement', 'conditions that must be met for work to be accepted'],
		['user story', '用户故事', 'Requirement', 'a short description of a feature from a user perspective'],
		['scope', '范围', 'Requirement', 'the work and boundaries included in a project'],
		['constraint', '限制条件', 'Requirement', 'a rule or limit that affects a solution'],
		['priority', '优先级', 'Requirement', 'the level of importance assigned to a task'],
		['specification', '规格说明', 'Requirement', 'a detailed description of what a system must do'],
		['functional', '功能性的', 'Requirement', 'describing a behavior or service a system provides'],
		['assumption', '假设', 'Requirement', 'something accepted as true without full proof'],
		['ambiguity', '歧义', 'Requirement', 'a lack of clarity that allows multiple meanings'],
		['clarify', '澄清', 'Requirement', 'to make an idea or request easier to understand'],
		['validate', '验证', 'Requirement', 'to check that something meets the intended need'],
		['request', '请求', 'Requirement', 'a formal or informal ask for a change or service'],
		['use case', '用例', 'Requirement', 'a description of how a user interacts with a system'],
		['non-functional', '非功能性的', 'Requirement', 'describing qualities such as speed or security'],
		['feasibility', '可行性', 'Requirement', 'the possibility of completing something successfully'],

		['architecture', '架构', 'Design', 'the high-level structure of a software system'],
		['component', '组件', 'Design', 'a replaceable part of a larger system'],
		['abstraction', '抽象', 'Design', 'a simplified view that hides implementation details'],
		['pattern', '模式', 'Design', 'a reusable approach to a common design problem'],
		['scalability', '可扩展性', 'Design', 'the ability to handle growth in users or workload'],
		['performance', '性能', 'Design', 'how quickly and efficiently a system works'],
		['latency', '延迟', 'Design', 'the time taken for a request or response'],
		['throughput', '吞吐量', 'Design', 'the amount of work completed in a period of time'],
		['security', '安全性', 'Design', 'protection against unauthorized access or harm'],
		['accessibility', '无障碍性', 'Design', 'the degree to which a product can be used by everyone'],
		['maintainability', '可维护性', 'Design', 'how easily software can be changed and supported'],
		['trade-off', '权衡', 'Design', 'a balance between benefits and costs'],
		['prototype', '原型', 'Design', 'an early model used to explore an idea'],
		['scalable', '可扩展的', 'Design', 'able to grow without major redesign'],
		['reusable', '可复用的', 'Design', 'able to be used again in another context'],
		['design system', '设计系统', 'Design', 'shared rules and components for consistent products'],

		['test case', '测试用例', 'Testing', 'steps and data used to check a specific behavior'],
		['unit test', '单元测试', 'Testing', 'a test of one small piece of code'],
		['integration test', '集成测试', 'Testing', 'a test of how multiple parts work together'],
		['end-to-end test', '端到端测试', 'Testing', 'a test of a complete user workflow'],
		['assertion', '断言', 'Testing', 'a statement that checks whether an expected condition is true'],
		['coverage', '覆盖率', 'Testing', 'a measure of how much code is exercised by tests'],
		['mock', '模拟对象', 'Testing', 'a test substitute for a real dependency'],
		['fixture', '测试夹具', 'Testing', 'prepared data or setup used by a test'],
		['automated', '自动化的', 'Testing', 'performed by software without repeated manual work'],
		['manual', '手动的', 'Testing', 'performed directly by a person'],
		['flaky', '不稳定的', 'Testing', 'sometimes passing and sometimes failing without code changes'],
		['edge case', '边界情况', 'Testing', 'an unusual input or condition near a limit'],
		['verification', '核验', 'Testing', 'checking that work matches its specification'],
		['validation test', '确认测试', 'Testing', 'checking that a product meets real user needs'],
		['test suite', '测试套件', 'Testing', 'a collection of tests run together'],
		['assert', '断言检查', 'Testing', 'to verify that a condition is true in a test'],

		['ECU', '电子控制单元', 'Automotive Software', 'an electronic unit that controls a vehicle function'],
		['CAN bus', 'CAN 总线', 'Automotive Software', 'a network that lets vehicle controllers exchange data'],
		['sensor', '传感器', 'Automotive Software', 'a device that measures a physical condition'],
		['actuator', '执行器', 'Automotive Software', 'a device that creates movement or action from a signal'],
		['firmware', '固件', 'Automotive Software', 'software stored on an embedded device'],
		['embedded', '嵌入式的', 'Automotive Software', 'built into a dedicated device or system'],
		['diagnostic', '诊断的', 'Automotive Software', 'related to identifying faults in a vehicle system'],
		['powertrain', '动力总成', 'Automotive Software', 'the parts that generate and deliver vehicle power'],
		['braking', '制动', 'Automotive Software', 'the system or action used to slow a vehicle'],
		['steering', '转向', 'Automotive Software', 'the system that controls a vehicle direction'],
		['infotainment', '信息娱乐系统', 'Automotive Software', 'in-vehicle information and entertainment features'],
		['ADAS', '高级驾驶辅助系统', 'Automotive Software', 'technology that assists a driver with safety tasks'],
		['calibration', '标定', 'Automotive Software', 'adjusting a system to produce accurate measurements'],
		['telemetry', '遥测数据', 'Automotive Software', 'data collected and sent from a remote system'],
		['vehicle network', '车载网络', 'Automotive Software', 'connected controllers that exchange vehicle data'],
		['drive mode', '驾驶模式', 'Automotive Software', 'a vehicle setting that changes driving behavior'],

		['milestone', '里程碑', 'Project Management', 'an important point in a project timeline'],
		['deadline', '截止日期', 'Project Management', 'the latest time by which work should be finished'],
		['estimate', '估算', 'Project Management', 'a calculated guess of effort, time, or cost'],
		['backlog', '待办列表', 'Project Management', 'an ordered list of work that may be completed'],
		['sprint', '冲刺周期', 'Project Management', 'a short, fixed period for completing planned work'],
		['deliverable', '交付成果', 'Project Management', 'a result that must be provided to a customer or team'],
		['blocker', '阻碍项', 'Project Management', 'a problem that prevents progress'],
		['risk', '风险', 'Project Management', 'a possible event that could affect project outcomes'],
		['progress', '进度', 'Project Management', 'the amount of work completed so far'],
		['agenda', '议程', 'Project Management', 'a list of topics planned for a meeting'],
		['align', '达成一致', 'Project Management', 'to bring people to a shared understanding'],
		['ownership', '负责权', 'Project Management', 'responsibility for completing or maintaining work'],
		['retrospective', '复盘会议', 'Project Management', 'a meeting to discuss how a project or sprint went'],
		['action item', '行动项', 'Project Management', 'a specific task agreed on during a discussion'],
		['dependency map', '依赖关系图', 'Project Management', 'a view of tasks or systems that rely on each other'],
		['status update', '进度更新', 'Project Management', 'a short report about current work and blockers']
	].map(([term, meaning, category, definition]) => ({ term, meaning, category, definition }));

	const SCENARIOS = {
		bug: {
			prompt: 'Customer reported screen flickering when entering Drive Mode.',
			suggested: 'The screen flickers when the customer enters Drive Mode.',
			better: 'The display flickers every time the vehicle switches to Drive Mode. We can reproduce the issue on the latest build.',
			native: 'The display flickers whenever the vehicle enters Drive Mode. We can reproduce it on the latest build.'
		},
		root: {
			prompt: 'Explain why a vehicle screen flickers after a software update.',
			suggested: 'The update changed the display timing and caused flickering.',
			better: 'The update introduced a timing issue in the display pipeline. We confirmed the root cause by comparing frame logs before and after the update.',
			native: 'The update introduced a timing issue in the display pipeline. A comparison of the frame logs confirmed the root cause.'
		},
		meeting: {
			prompt: 'Ask the team to review a proposed fix before Friday.',
			suggested: 'Can the team review my fix before Friday?',
			better: 'Could you review the proposed fix by Friday? Please flag any risks to backward compatibility.',
			native: 'Could you review the proposed fix by Friday and flag any backward-compatibility risks?'
		},
		requirements: {
			prompt: 'Clarify what should happen when the network connection is lost.',
			suggested: 'What should the system do if the network is lost?',
			better: 'Could you clarify the expected behavior when the connection is lost? Should the system retry automatically or show an error to the driver?',
			native: 'Could you clarify how the system should behave if the connection drops? Should it retry automatically or notify the driver?'
		},
		email: {
			prompt: 'Write a short update explaining that a fix is ready for testing.',
			suggested: 'The fix is ready. Please test it.',
			better: 'The fix for the reported flickering issue is ready for validation. Please test it on the latest build and share any unexpected results.',
			native: 'The flickering fix is ready for validation. Please test it on the latest build and let me know if you see anything unexpected.'
		}
	};

	const ACHIEVEMENTS = [
		{ id: 'first-word', title: 'First Word', detail: 'Learn your first technical word' },
		{ id: 'hundred-words', title: '100 Words Learned', detail: 'Learn 100 unique technical words' },
		{ id: 'first-grammar', title: 'First Grammar Check', detail: 'Check your first sentence' },
		{ id: 'first-chat', title: 'First AI Chat', detail: 'Start your first conversation' },
		{ id: 'seven-day-streak', title: '7-Day Learning Streak', detail: 'Practice on seven consecutive days' },
		{ id: 'grammar-master', title: 'Grammar Master', detail: 'Complete ten grammar checks' }
	];

	function localDateKey(date) {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	}

	function createDefaultData() {
		return {
			vocabulary: { totalAnswered: 0, correctAnswers: 0, learnedWords: [], todayLearned: [] },
			grammar: { checks: 0 },
			chat: { started: false, messages: [], scene: 'daily' },
			practice: { completed: [], activeScenario: 'bug' },
			mission: { date: localDateKey(new Date()), grammarChecks: 0, conversationDone: false, claimed: false },
			learningDates: [],
			achievements: []
		};
	}

	function loadData() {
		const defaults = createDefaultData();
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
			if (!saved || typeof saved !== 'object') return defaults;
			const data = {
				...defaults,
				...saved,
				vocabulary: { ...defaults.vocabulary, ...(saved.vocabulary || {}) },
				grammar: { ...defaults.grammar, ...(saved.grammar || {}) },
				chat: { ...defaults.chat, ...(saved.chat || {}) },
				practice: { ...defaults.practice, ...(saved.practice || {}) },
				mission: { ...defaults.mission, ...(saved.mission || {}) },
				learningDates: Array.isArray(saved.learningDates) ? saved.learningDates : [],
				achievements: Array.isArray(saved.achievements) ? saved.achievements : []
			};
			if (!Array.isArray(data.vocabulary.learnedWords)) data.vocabulary.learnedWords = [];
			if (!Array.isArray(data.vocabulary.todayLearned)) data.vocabulary.todayLearned = [];
			if (!Array.isArray(data.chat.messages)) data.chat.messages = [];
			if (!Array.isArray(data.practice.completed)) data.practice.completed = [];
			if (data.mission.date !== defaults.mission.date) {
				data.mission = defaults.mission;
				data.vocabulary.todayLearned = [];
			}
			return data;
		} catch (error) {
			console.warn('无法读取英语学习记录，将创建新记录。', error);
			return defaults;
		}
	}

	const data = loadData();
	let initialized = false;

	// A page can remain open across midnight, so refresh today's counters before any render or action.
	function resetMissionForToday() {
		const today = localDateKey(new Date());
		if (data.mission.date === today) return;
		data.mission = { ...createDefaultData().mission };
		data.vocabulary.todayLearned = [];
	}

	// Refresh an open dashboard just after local midnight, then schedule the following day.
	function scheduleDailyReset() {
		const now = new Date();
		const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
		window.setTimeout(() => {
			resetMissionForToday();
			saveData();
			scheduleDailyReset();
		}, Math.max(1000, nextMidnight.getTime() - now.getTime()));
	}

	function shuffled(items) {
		const values = items.slice();
		for (let index = values.length - 1; index > 0; index -= 1) {
			const swap = Math.floor(Math.random() * (index + 1));
			[values[index], values[swap]] = [values[swap], values[index]];
		}
		return values;
	}

	function saveData() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		} catch (error) {
			console.error('英语学习记录保存失败。', error);
			if (window.GameHub) GameHub.toast('英语学习记录保存失败，请检查浏览器存储设置。');
		}
		if (initialized) renderSidebar();
	}

	function missionProgress() {
		return {
			words: Math.min(5, data.vocabulary.todayLearned.length),
			grammar: Math.min(1, data.mission.grammarChecks),
			conversation: data.mission.conversationDone ? 1 : 0
		};
	}

	function streakLength() {
		const recorded = new Set(data.learningDates);
		const cursor = new Date();
		let length = 0;
		while (recorded.has(localDateKey(cursor))) {
			length += 1;
			cursor.setDate(cursor.getDate() - 1);
		}
		return length;
	}

	function unlockAchievement(id) {
		if (data.achievements.includes(id)) return false;
		data.achievements.push(id);
		const achievement = ACHIEVEMENTS.find((item) => item.id === id);
		if (achievement && window.GameHub) GameHub.toast(`Achievement unlocked: ${achievement.title}`);
		return true;
	}

	function checkAchievements() {
		const learnedCount = data.vocabulary.learnedWords.length;
		if (learnedCount > 0) unlockAchievement('first-word');
		if (learnedCount >= 100) unlockAchievement('hundred-words');
		if (data.grammar.checks > 0) unlockAchievement('first-grammar');
		if (data.chat.started) unlockAchievement('first-chat');
		if (streakLength() >= 7) unlockAchievement('seven-day-streak');
		if (data.grammar.checks >= 10) unlockAchievement('grammar-master');
	}

	function recordLearningDay() {
		const today = localDateKey(new Date());
		if (!data.learningDates.includes(today)) data.learningDates.push(today);
		data.learningDates = data.learningDates.slice(-30);
		checkAchievements();
	}

	function renderSidebar() {
		resetMissionForToday();
		const progress = missionProgress();
		const dateLabel = document.getElementById('mission-date');
		if (dateLabel) dateLabel.textContent = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

		const goals = { words: 5, grammar: 1, conversation: 1 };
		Object.entries(goals).forEach(([key, target]) => {
			const item = document.querySelector(`[data-mission-item="${key}"]`);
			const value = document.querySelector(`[data-mission-progress="${key}"]`);
			const current = progress[key];
			if (value) value.textContent = `${current} / ${target}`;
			if (item) item.classList.toggle('is-complete', current >= target);
		});

		const canClaim = Object.entries(goals).every(([key, target]) => progress[key] >= target);
		const claimButton = document.getElementById('mission-claim');
		const missionNote = document.getElementById('mission-note');
		if (claimButton) {
			claimButton.disabled = !canClaim || data.mission.claimed;
			claimButton.textContent = data.mission.claimed ? 'Claimed' : 'Claim';
		}
		if (missionNote) {
			missionNote.textContent = data.mission.claimed ? 'Today’s mission reward has been claimed.' :
				(canClaim ? 'All goals complete. Your reward is ready.' : 'Complete all three goals to claim today’s reward.');
		}

		const list = document.getElementById('english-achievement-list');
		const count = document.getElementById('english-achievement-count');
		if (list) {
			list.replaceChildren();
			ACHIEVEMENTS.forEach((achievement) => {
				const item = document.createElement('li');
				const badge = document.createElement('span');
				badge.className = `achievement-mark${data.achievements.includes(achievement.id) ? ' is-unlocked' : ''}`;
				badge.textContent = data.achievements.includes(achievement.id) ? '✓' : '·';
				const copy = document.createElement('span');
				const title = document.createElement('strong');
				const detail = document.createElement('small');
				title.textContent = achievement.title;
				detail.textContent = achievement.detail;
				copy.append(title, detail);
				item.append(badge, copy);
				list.append(item);
			});
		}
		if (count) count.textContent = `${data.achievements.length} / ${ACHIEVEMENTS.length}`;
	}

	function updateVocabularyStats() {
		const answered = document.getElementById('vocabulary-answered');
		const accuracy = document.getElementById('vocabulary-accuracy');
		const learned = document.getElementById('vocabulary-total-learned');
		const todayLearned = document.getElementById('vocabulary-learned');
		if (answered) answered.textContent = String(data.vocabulary.totalAnswered);
		if (accuracy) {
			const percentage = data.vocabulary.totalAnswered ? Math.round((data.vocabulary.correctAnswers / data.vocabulary.totalAnswered) * 100) : 0;
			accuracy.textContent = `${percentage}%`;
		}
		if (learned) learned.textContent = String(data.vocabulary.learnedWords.length);
		if (todayLearned) todayLearned.textContent = `${data.vocabulary.learnedWords.length} learned`;
	}

	function initTabs() {
		const tabs = document.querySelectorAll('[data-english-tab]');
		const panels = document.querySelectorAll('[data-english-panel]');
		tabs.forEach((tab) => tab.addEventListener('click', () => {
			tabs.forEach((item) => {
				const selected = item === tab;
				item.classList.toggle('is-active', selected);
				item.setAttribute('aria-selected', String(selected));
			});
			panels.forEach((panel) => { panel.hidden = panel.dataset.englishPanel !== tab.dataset.englishTab; });
		}));
	}

	function initVocabulary() {
		const options = document.getElementById('vocabulary-options');
		if (!options) return;

		const categorySelect = document.getElementById('vocabulary-category');
		const termElement = document.getElementById('vocabulary-word');
		const categoryElement = document.getElementById('vocabulary-word-category');
		const positionElement = document.getElementById('vocabulary-position');
		const feedback = document.getElementById('vocabulary-feedback');
		const nextButton = document.getElementById('vocabulary-next');
		let question = null;
		let previousTerm = '';
		let answeredThisQuestion = false;

		function makeQuestion() {
			const selectedCategory = categorySelect.value;
			let pool = WORDS.filter((word) => selectedCategory === 'all' || word.category === selectedCategory);
			if (pool.length === 0) pool = WORDS;
			const available = pool.filter((word) => word.term !== previousTerm);
			const firstExample = previousTerm === '' && selectedCategory === 'all';
			const correctWord = firstExample ? WORDS.find((word) => word.term === 'Requirement') :
				(available.length ? available : pool)[Math.floor(Math.random() * (available.length || pool.length))];
			const distractors = correctWord.term === 'Requirement' ? [
				{ term: 'sample-design', meaning: '设计' },
				{ term: 'sample-log', meaning: '日志' },
				{ term: 'sample-test', meaning: '测试' }
			] : shuffled(WORDS.filter((word) => word.term !== correctWord.term && word.meaning !== correctWord.meaning)).slice(0, 3);
			const answerOptions = firstExample ? [correctWord, ...distractors] : shuffled([correctWord, ...distractors]);
			question = { correctWord, options: answerOptions };
			previousTerm = correctWord.term;
			answeredThisQuestion = false;
			renderQuestion();
		}

		function renderQuestion() {
			termElement.textContent = question.correctWord.term;
			categoryElement.textContent = question.correctWord.category;
			positionElement.textContent = `WORD ${data.vocabulary.totalAnswered + 1}`;
			feedback.hidden = true;
			feedback.replaceChildren();
			nextButton.hidden = true;
			options.replaceChildren();
			question.options.forEach((word, index) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'vocabulary-option';
				button.dataset.term = word.term;
				const letter = document.createElement('span');
				letter.className = 'vocabulary-option-letter';
				letter.textContent = String.fromCharCode(65 + index);
				const meaning = document.createElement('span');
				meaning.textContent = word.meaning;
				button.append(letter, meaning);
				options.append(button);
			});
		}

		function answer(selectedTerm) {
			if (answeredThisQuestion) return;
			answeredThisQuestion = true;
			const isCorrect = selectedTerm === question.correctWord.term;
			options.querySelectorAll('.vocabulary-option').forEach((button) => {
				button.disabled = true;
				if (button.dataset.term === question.correctWord.term) button.classList.add('is-correct');
				if (button.dataset.term === selectedTerm && !isCorrect) button.classList.add('is-wrong');
			});

			data.vocabulary.totalAnswered += 1;
			if (isCorrect) data.vocabulary.correctAnswers += 1;
			window.EnglishCoach.recordWord(question.correctWord.term, isCorrect);

			feedback.replaceChildren();
			const result = document.createElement('strong');
			result.textContent = isCorrect ? 'Correct! +10 Gold · +5 XP' : `Correct answer: ${question.correctWord.meaning}`;
			const explanation = document.createElement('p');
			explanation.textContent = `${question.correctWord.term} = ${question.correctWord.definition}.`;
			feedback.append(result, explanation);
			feedback.hidden = false;
			nextButton.hidden = false;
			updateVocabularyStats();
			if (isCorrect && window.GameHub) GameHub.reward(10, 5, 'Technical word learned');
			else if (window.GameHub) GameHub.save();
		}

		options.addEventListener('click', (event) => {
			const button = event.target.closest('.vocabulary-option');
			if (button && options.contains(button)) answer(button.dataset.term);
		});
		categorySelect.addEventListener('change', makeQuestion);
		nextButton.addEventListener('click', makeQuestion);
		makeQuestion();
	}

	function initPractice() {
		const prompt = document.getElementById('practice-prompt');
		if (!prompt) return;

		const suggested = document.getElementById('practice-suggested');
		const better = document.getElementById('practice-better');
		const native = document.getElementById('practice-native');
		const completeButton = document.getElementById('practice-complete');
		const scenarioButtons = document.querySelectorAll('[data-practice-id]');
		let activeScenario = SCENARIOS[data.practice.activeScenario] ? data.practice.activeScenario : 'bug';

		function renderScenario() {
			const scenario = SCENARIOS[activeScenario];
			prompt.textContent = scenario.prompt;
			suggested.textContent = scenario.suggested;
			better.textContent = scenario.better;
			native.textContent = scenario.native;
			const completed = data.practice.completed.includes(activeScenario);
			completeButton.disabled = completed;
			completeButton.innerHTML = completed ? 'Completed <span aria-hidden="true">✓</span>' : 'Complete practice <span aria-hidden="true">↗</span>';
			scenarioButtons.forEach((button) => {
				const selected = button.dataset.practiceId === activeScenario;
				button.classList.toggle('is-active', selected);
				button.setAttribute('aria-selected', String(selected));
			});
		}

		scenarioButtons.forEach((button) => button.addEventListener('click', () => {
			activeScenario = button.dataset.practiceId;
			data.practice.activeScenario = activeScenario;
			saveData();
			renderScenario();
		}));
		completeButton.addEventListener('click', () => window.EnglishCoach.completePractice(activeScenario));
		window.addEventListener('englishcoach:practicecomplete', renderScenario);
		renderScenario();
	}

	function initMission() {
		const button = document.getElementById('mission-claim');
		if (button) button.addEventListener('click', () => window.EnglishCoach.claimMission());
	}

	function init() {
		initialized = true;
		initTabs();
		initVocabulary();
		initPractice();
		initMission();
		updateVocabularyStats();
		checkAchievements();
		saveData();
		scheduleDailyReset();
	}

	window.EnglishCoach = {
		words: WORDS,
		categories: CATEGORIES,
		getData: () => data,
		getScenario: (id) => SCENARIOS[id] || SCENARIOS.bug,
		getChatData: () => data.chat,
		getMissionProgress: missionProgress,
		saveChat(messages, scene) {
			data.chat.messages = messages.slice(-80);
			data.chat.scene = scene;
			saveData();
		},
		recordWord(term, isCorrect) {
			resetMissionForToday();
			if (isCorrect) {
				if (!data.vocabulary.learnedWords.includes(term)) data.vocabulary.learnedWords.push(term);
				if (!data.vocabulary.todayLearned.includes(term)) data.vocabulary.todayLearned.push(term);
			}
			recordLearningDay();
			checkAchievements();
			saveData();
		},
		recordGrammar() {
			resetMissionForToday();
			data.grammar.checks += 1;
			data.mission.grammarChecks = Math.min(1, data.mission.grammarChecks + 1);
			recordLearningDay();
			checkAchievements();
			saveData();
		},
		recordConversation() {
			resetMissionForToday();
			data.chat.started = true;
			data.mission.conversationDone = true;
			recordLearningDay();
			checkAchievements();
			saveData();
		},
		completePractice(id) {
			if (!SCENARIOS[id] || data.practice.completed.includes(id)) return;
			data.practice.completed.push(id);
			data.practice.activeScenario = id;
			recordLearningDay();
			saveData();
			if (window.GameHub) GameHub.reward(0, 20, 'Engineer English practice complete');
			window.dispatchEvent(new CustomEvent('englishcoach:practicecomplete'));
		},
		claimMission() {
			const progress = missionProgress();
			if (data.mission.claimed || progress.words < 5 || progress.grammar < 1 || progress.conversation < 1) return;
			data.mission.claimed = true;
			saveData();
			if (window.GameHub) GameHub.reward(50, 30, 'Daily English mission complete');
		},
		refresh: renderSidebar
	};

	document.addEventListener('DOMContentLoaded', init);
})();