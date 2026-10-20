/* assistant.js — 宇宙日历小助手
 * GLM-4-Flash via DMXAPI.
 * 这个 key 会随静态页面公开下发。它只适合这种免费/低额度的演示用途；
 * 如果被滥用，请在服务端换成代理并吊销这个 key。
 */
(function () {
  'use strict';

  const API_URL = 'https://www.dmxapi.cn/v1/chat/completions';
  const API_KEY = 'sk-cZiJRlSdF8iZIFndWZanOS5pK5IQuCrN6sLwL8rVfl2GByR6';
  const MODEL = 'glm-4-flash';
  const MAX_HISTORY = 8;

  const $ = (s) => document.querySelector(s);
  const dialog = $('#assistantDialog');
  const fab = $('#assistantBtn');
  const closeBtn = $('#assistantClose');
  const messagesEl = $('#assistantMessages');
  const form = $('#assistantForm');
  const input = $('#assistantInput');
  const sendBtn = $('#assistantSend');

  if (!dialog || !fab) return;

  const state = {
    messages: [],
    busy: false,
    greeted: false,
    lastFocus: null
  };

  const suggestions = [
    '现在火星历是几月几日？',
    '万圣夜在月球历是哪一天？',
    '今天北京的天气怎么样？',
    '银河历和宇宙历有什么区别？'
  ];

  function escapeText(v) {
    return String(v == null ? '' : v);
  }

  function contextJSON() {
    try {
      if (typeof window.CosmicContext === 'function') {
        return JSON.stringify(window.CosmicContext());
      }
    } catch (e) {}
    return '{}';
  }

  function systemPrompt() {
    return [
      '你是「宇宙日历」网站的日历助手。',
      '网站主页面用宇宙视角展示五套历法：地球历、月球历、火星历、银河历、宇宙历。天气卡是从宇宙进入一颗具体星球的落地视图。',
      '回答规则：',
      '1. 只用中文，直接回答，最多 3 句话。',
      '2. 日期、历法、天气一律以「页面数据」为准，不要自行推算，也不要编造。',
      '3. 只回答与本站历法、日期换算、节日、天气和基础天文有关的问题；其他话题直接说「这个我不太清楚」。',
      '4. 不知道时直接说不知道，并建议查看页面的「历法说明」。',
      '5. 不要声称自己能切换页面、修改数据或控制网站。',
      '页面数据：' + contextJSON()
    ].join('\n');
  }

  function scrollToBottom() {
    try { messagesEl.scrollTop = messagesEl.scrollHeight; } catch (e) {}
  }

  function renderGreeting() {
    if (state.greeted) return;
    state.greeted = true;
    const wrap = document.createElement('div');
    wrap.className = 'assistant-greeting';
    wrap.innerHTML = '我是<strong>日历助手</strong>。可以帮你读五套历法、查下一个节日，或解释天气数据。';
    const sug = document.createElement('div');
    sug.className = 'assistant-suggestions';
    suggestions.forEach((q) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.q = q;
      b.textContent = q;
      sug.appendChild(b);
    });
    wrap.appendChild(sug);
    messagesEl.appendChild(wrap);
  }

  function clearGreeting() {
    const g = messagesEl.querySelector('.assistant-greeting');
    if (g) g.remove();
  }

  function appendMessage(role, text, cls) {
    const el = document.createElement('div');
    el.className = 'assistant-msg ' + (cls || role);
    el.textContent = escapeText(text);
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendError(text) {
    const el = document.createElement('div');
    el.className = 'assistant-error';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'assistant-typing';
    el.id = 'assistantTyping';
    el.innerHTML = '<i></i><i></i><i></i>';
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }
  function hideTyping() {
    const el = document.getElementById('assistantTyping');
    if (el) el.remove();
  }

  function setBusy(on) {
    state.busy = on;
    sendBtn.disabled = on;
    input.disabled = on;
  }

  async function ask(text) {
    if (state.busy) return;
    const question = String(text || '').trim().slice(0, 300);
    if (!question) return;
    clearGreeting();
    appendMessage('user', question);
    state.messages.push({ role: 'user', content: question });
    input.value = '';
    setBusy(true);
    showTyping();

    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 35000) : null;
    try {
      const history = state.messages.slice(-MAX_HISTORY);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + API_KEY
        },
        signal: ctrl ? ctrl.signal : undefined,
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: systemPrompt() }].concat(history),
          max_tokens: 420,
          temperature: 0.35
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const reply = data && data.choices && data.choices[0] && data.choices[0].message
        ? String(data.choices[0].message.content || '').trim()
        : '';
      hideTyping();
      if (!reply) {
        appendError('助手没有返回内容。可以再问一次，或查看页面的历法说明。');
      } else {
        appendMessage('bot', reply);
        state.messages.push({ role: 'assistant', content: reply });
      }
    } catch (err) {
      hideTyping();
      const aborted = err && err.name === 'AbortError';
      appendError(aborted ? '这次回答超时了，请再试一次。' : '助手暂时连接不上。可以稍后再试，页面上的历法与天气数据仍然可用。');
    } finally {
      if (timer) clearTimeout(timer);
      setBusy(false);
      scrollToBottom();
      try { input.focus(); } catch (e) {}
    }
  }

  function open() {
    if (dialog.open) return;
    if (window.CosmicApp && typeof window.CosmicApp.closeOtherPanelsForAssistant === 'function') {
      window.CosmicApp.closeOtherPanelsForAssistant();
    }
    state.lastFocus = document.activeElement;
    renderGreeting();
    try { dialog.showModal(); } catch (e) { dialog.setAttribute('open', ''); }
    document.body.classList.add('assistant-open');
    setTimeout(() => { try { input.focus(); } catch (e) {} }, 120);
  }

  function close() {
    if (!dialog.open) return;
    try { dialog.close(); } catch (e) { dialog.removeAttribute('open'); }
    document.body.classList.remove('assistant-open');
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
  }

  fab.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  dialog.addEventListener('close', () => {
    document.body.classList.remove('assistant-open');
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });
  messagesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-q]');
    if (btn) ask(btn.dataset.q);
  });

  window.CosmicAssistant = { open, close };
})();
