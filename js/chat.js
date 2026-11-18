/*
 * AI Conversation Practice：将模拟教练回复拆成可学习的反馈卡片。
 * 对话保存在英语模块的本地存档中；callAI 当前使用本地示例，后续可替换为 API 请求。
 */
(function () {
	'use strict';

	const SCENE_LABELS = {
		daily: 'Daily English',
		technical: 'Technical English',
		meeting: 'Technical Meeting',
		bug: 'Bug Discussion',
		requirement: 'Requirement Discussion',
		email: 'Email Writing',
		interview: 'Interview'
	};
	const WORKPLACE_SCENES = new Set(['technical', 'meeting', 'bug', 'requirement']);
	const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
	//const PRIMARY_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';
	//const FALLBACK_MODEL = 'google/gemma-2-9b-it:free';
	const PRIMARY_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
	const FALLBACK_MODEL = 'baidu/ernie-5.5-flash-preview:free';
	const SYSTEM_PROMPT = `You are an AI English Coach for Software Engineers.

Always:
- answer the user's question first
- correct grammar if necessary
- explain mistakes
- provide a more natural expression
- provide a professional workplace version when applicable
- continue the conversation

Return only a valid JSON object with exactly these fields:
{
  "aiAnswer": "Answer the user's question directly first.",
  "correction": "The corrected version of the user's English, or the original sentence if no correction is needed.",
  "explanation": "A concise explanation of any mistakes and why the correction is better.",
  "betterExpression": "A natural way a fluent English speaker would express the user's meaning.",
  "workplaceVersion": null,
  "scores": { "grammar": 0, "vocabulary": 0, "naturalness": 0 }
}

Scores must be integers from 0 to 100. When the current scene is technical, a bug report, a requirement discussion, or a technical meeting, workplaceVersion must be an object with concise "issue" and "version" strings. For other scenes, workplaceVersion may be null. Keep each field concise and useful. Do not include markdown fences or any text outside the JSON object.`;

	function levelTitle(level) {
		if (level <= 1) return 'Junior Engineer';
		if (level === 2) return 'Engineer';
		return `Engineer · Level ${level}`;
	}

	function asText(value, fallback = '') {
		return typeof value === 'string' ? value.trim() : fallback;
	}

	function normalizeWorkplaceVersion(value) {
		if (!value) return null;
		if (typeof value === 'string') return { issue: '', version: value };
		if (typeof value !== 'object') return null;
		const issue = asText(value.issue);
		const version = asText(value.version || value.professionalVersion);
		return version ? { issue, version } : null;
	}

	function parseCoachResponse(content, scene) {
		const cleanContent = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
		const result = JSON.parse(cleanContent);
		const scores = result.scores || {};
		const toScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
		const aiAnswer = asText(result.aiAnswer || result.ai_answer || result.answer);
		const correction = asText(result.correction);
		const explanation = asText(result.explanation);
		const betterExpression = asText(result.betterExpression || result.better_expression);

		if (!aiAnswer || !correction || !explanation || !betterExpression) {
			throw new Error('OpenRouter returned incomplete coaching feedback. Please try again.');
		}

		return {
			aiAnswer,
			correction,
			explanation,
			betterExpression,
			workplace: WORKPLACE_SCENES.has(scene)
				? normalizeWorkplaceVersion(result.workplaceVersion || result.workplace_version || result.workplace)
				: null,
			scores: {
				grammar: toScore(scores.grammar),
				vocabulary: toScore(scores.vocabulary),
				naturalness: toScore(scores.naturalness)
			},
			reward: { xp: 10, gold: 5 },
			sceneLabel: SCENE_LABELS[scene] || SCENE_LABELS.daily
		};
	}

	function openRouterError(status, detail) {
		if (status === 401) return new Error('Invalid OpenRouter API Key.');
		if (status === 402) return new Error('OpenRouter free quota exceeded.');
		return new Error(detail || `OpenRouter request failed (HTTP ${status}).`);
	}

	async function requestOpenRouterModel(model, apiKey, messages, scene) {
		const systemPrompt = `${SYSTEM_PROMPT}\n\nCurrent practice scene: ${SCENE_LABELS[scene] || SCENE_LABELS.daily}.`;
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': window.location.origin,
				'X-Title': 'AI English Coach'
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: 'system', content: systemPrompt },
					...messages
				]
			})
		});

		let payload;
		try {
			payload = await response.json();
		} catch (error) {
			throw openRouterError(response.status, `OpenRouter returned an unreadable response (HTTP ${response.status}).`);
		}

		if (!response.ok) {
			throw openRouterError(response.status, asText(payload?.error?.message));
		}

		const content = payload?.choices?.[0]?.message?.content;
		if (typeof content !== 'string' || !content.trim()) {
			throw new Error('OpenRouter returned an empty response. Please try again.');
		}
		return parseCoachResponse(content, scene);
	}

	async function callAI(message, scene, history = []) {
		const apiKey = localStorage.getItem('openrouter_api_key');
		if (!apiKey) {
			window.alert('Please enter your OpenRouter API Key in Settings.');
			throw new Error('OpenRouter API Key is missing.');
		}

		const previousMessages = history.slice(-10).map((item) => {
			if (item.role === 'user') return { role: 'user', content: item.text };
			if (item.role !== 'assistant') return null;
			if (item.feedback) {
				return {
					role: 'assistant',
					content: JSON.stringify({
						aiAnswer: item.feedback.aiAnswer,
						correction: item.feedback.correction,
						betterExpression: item.feedback.betterExpression
					})
				};
			}
			return item.text ? { role: 'assistant', content: item.text } : null;
		}).filter(Boolean);

		const requestMessages = [
			...previousMessages,
			{ role: 'user', content: message }
		];

		try {
			return await requestOpenRouterModel(PRIMARY_MODEL, apiKey, requestMessages, scene);
		} catch (primaryError) {
			try {
				return await requestOpenRouterModel(FALLBACK_MODEL, apiKey, requestMessages, scene);
			} catch (fallbackError) {
				throw new Error('No free model is currently available.');
			}
		}
	}

	function createSection(title, icon, variant, content) {
		const section = document.createElement('section');
		section.className = `coach-feedback-card coach-feedback-${variant}`;
		const heading = document.createElement('h3');
		heading.className = 'coach-feedback-title';
		const mark = document.createElement('span');
		mark.className = 'coach-feedback-icon';
		mark.setAttribute('aria-hidden', 'true');
		mark.textContent = icon;
		const label = document.createElement('span');
		label.textContent = title;
		heading.append(mark, label);
		section.append(heading, content);
		return section;
	}

	function createFeedbackBody(text, extraClass) {
		const paragraph = document.createElement('p');
		paragraph.className = extraClass || 'coach-feedback-copy';
		paragraph.textContent = text;
		return paragraph;
	}

	function createScoreCard(scores) {
		const list = document.createElement('div');
		list.className = 'coach-score-list';
		[
			['Grammar', scores.grammar],
			['Vocabulary', scores.vocabulary],
			['Naturalness', scores.naturalness]
		].forEach(([name, value]) => {
			const row = document.createElement('div');
			row.className = 'coach-score-row';
			const label = document.createElement('div');
			label.className = 'coach-score-label';
			const nameElement = document.createElement('span');
			nameElement.textContent = name;
			const valueElement = document.createElement('strong');
			valueElement.textContent = `${value} / 100`;
			label.append(nameElement, valueElement);
			const track = document.createElement('div');
			track.className = 'coach-score-track';
			track.setAttribute('role', 'progressbar');
			track.setAttribute('aria-label', `${name} score`);
			track.setAttribute('aria-valuemin', '0');
			track.setAttribute('aria-valuemax', '100');
			track.setAttribute('aria-valuenow', String(value));
			const fill = document.createElement('span');
			fill.className = 'coach-score-fill';
			fill.style.width = `${value}%`;
			track.append(fill);
			row.append(label, track);
			list.append(row);
		});
		return list;
	}

	function renderFeedback(message) {
		const feedback = message.feedback;
		const group = document.createElement('div');
		group.className = 'coach-feedback-stack';

		group.append(createSection('AI Answer', '✦', 'answer', createFeedbackBody(feedback.aiAnswer || 'I reviewed your message. See the correction and suggestions below.')));
		group.append(createSection('Correction', '✓', 'correction', createFeedbackBody(feedback.correction)));
		group.append(createSection('Explanation', 'i', 'explanation', createFeedbackBody(feedback.explanation)));
		group.append(createSection('Better Expression', '↗', 'better', createFeedbackBody(feedback.betterExpression)));

		if (feedback.workplace) {
			const workplaceContent = document.createElement('div');
			workplaceContent.className = 'coach-workplace-content';
			workplaceContent.append(
				createFeedbackBody(`Issue: ${feedback.workplace.issue}`, 'coach-workplace-issue'),
				createFeedbackBody(`Professional Version: ${feedback.workplace.version}`, 'coach-workplace-version')
			);
			group.append(createSection('Workplace Version', '⌂', 'workplace', workplaceContent));
		}

		group.append(createSection('Grammar · Vocabulary · Naturalness', '★', 'score', createScoreCard(feedback.scores)));

		const rewardContent = document.createElement('div');
		rewardContent.className = 'coach-reward-values';
		const xp = document.createElement('strong');
		xp.textContent = `+${feedback.reward.xp} XP`;
		const gold = document.createElement('strong');
		gold.textContent = `+${feedback.reward.gold} Gold`;
		rewardContent.append(xp, gold);
		if (feedback.levelUp) {
			const levelUp = document.createElement('p');
			levelUp.className = 'coach-level-up';
			levelUp.textContent = `🎉 Level Up! ${feedback.levelUp.from} → ${feedback.levelUp.to}`;
			rewardContent.append(levelUp);
		}
		group.append(createSection('Reward', '✦', 'reward', rewardContent));
		return group;
	}

	function renderLegacyCoachMessage(message) {
		const content = document.createElement('div');
		content.className = 'coach-feedback-stack';
		content.append(createSection('Coach note', 'i', 'explanation', createFeedbackBody(message.text)));
		return content;
	}

	function init() {
		const form = document.getElementById('chat-form');
		if (!form) return;

		const messagesElement = document.getElementById('chat-messages');
		const input = document.getElementById('chat-input');
		const sceneSelect = document.getElementById('conversation-scene');
		const submit = form.querySelector('button[type="submit"]');
		const stored = window.EnglishCoach.getChatData();
		let messages = stored.messages.slice(-80);
		let scene = SCENE_LABELS[stored.scene] ? stored.scene : 'daily';
		sceneSelect.value = scene;

		if (messages.length === 0) {
			messages = [{ role: 'assistant', text: 'Choose a scene and send a sentence to receive structured coaching feedback.' }];
			window.EnglishCoach.saveChat(messages, scene);
		}

		function scrollToLatest() {
			const scroll = () => messagesElement.scrollTo({ top: messagesElement.scrollHeight, behavior: 'instant' });
			scroll();
			window.requestAnimationFrame(scroll);
			window.setTimeout(scroll, 60);
		}

		function renderMessages() {
			messagesElement.replaceChildren();
			messages.forEach((message) => {
				const bubble = document.createElement('article');
				bubble.className = `chat-message is-${message.role === 'user' ? 'user' : 'assistant'}`;
				const label = document.createElement('span');
				label.className = 'chat-message-label';
				label.textContent = message.role === 'user' ? '👤 You' : '🤖 Coach';
				bubble.append(label);

				if (message.role === 'user') {
					const text = document.createElement('p');
					text.className = 'chat-user-copy';
					text.textContent = message.text;
					bubble.append(text);
				} else if (message.feedback) {
					bubble.append(renderFeedback(message));
				} else {
					bubble.append(renderLegacyCoachMessage(message));
				}
				messagesElement.append(bubble);
			});
			scrollToLatest();
		}

		sceneSelect.addEventListener('change', () => {
			scene = sceneSelect.value;
			window.EnglishCoach.saveChat(messages, scene);
		});

		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const message = input.value.trim();
			if (!message || submit.disabled) return;
			if (!localStorage.getItem('openrouter_api_key')) {
				window.alert('Please enter your OpenRouter API Key in Settings.');
				return;
			}

			messages.push({ role: 'user', text: message });
			messages = messages.slice(-80);
			input.value = '';
			window.EnglishCoach.saveChat(messages, scene);
			renderMessages();
			submit.disabled = true;

			const typing = document.createElement('article');
			typing.className = 'chat-message is-assistant is-typing';
			typing.textContent = 'Coach is reviewing your English…';
			messagesElement.append(typing);
			scrollToLatest();

			try {
				const feedback = await callAI(message, scene, messages.slice(0, -1));
				messages.push({ role: 'assistant', feedback });
				window.EnglishCoach.recordConversation();
				if (window.GameHub) {
					const previousLevel = GameHub.getState().profile.level;
					GameHub.reward(feedback.reward.gold, feedback.reward.xp, 'English practice complete');
					const nextLevel = GameHub.getState().profile.level;
					if (nextLevel > previousLevel) {
						feedback.levelUp = { from: levelTitle(previousLevel), to: levelTitle(nextLevel) };
					}
				}
			} catch (error) {
				messages.push({ role: 'assistant', text: error.message || 'OpenRouter request failed. Please try again.' });
			} finally {
				window.EnglishCoach.saveChat(messages, scene);
				submit.disabled = false;
				input.focus({ preventScroll: true });
				renderMessages();
			}
		});

		input.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
				event.preventDefault();
				form.requestSubmit();
			}
		});

		renderMessages();
	}

	window.EnglishChat = { init, callAI };
	document.addEventListener('DOMContentLoaded', init);
})();