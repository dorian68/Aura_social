/* AURA — AG-UI chatbot (canonical Frontend_Aura).
   Modern streaming assistant: intelligent landing, conversation management,
   thinking animation, streamed text, UIBlocks (allowlist), human-in-the-loop
   confirmation. Consumes /api/ag-ui/run via window.AgUIClient. DA from agent.css. */
(function () {
  if (window.AuraAgentChat) return;
  var API = function () { return window.AURA_API_BASE || 'http://localhost:3000'; };
  var LOGO = '../assets/aura-mark.svg';
  var STORE = 'aura_agent_conversations_v1';
  var ALLOWED_BLOCKS = {
    metric_grid: 1, action_plan: 1, health_status: 1, b2b_opportunity: 1, token_economy: 1,
    confirmation_card: 1, suggestion_chips: 1, summary_card: 1, audit_event: 1, tool_result: 1, error_card: 1
  };

  /* ── state ───────────────────────────────────────────────────────── */
  var convs = load();
  var currentId = null;        // active conversation id (null → landing)
  var sessionTouched = false;  // did the user interact this session?
  var running = false;
  var abort = null;
  var els = {};

  /* ── persistence ─────────────────────────────────────────────────── */
  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(convs.slice(0, 50))); } catch (e) {} }
  function conv(id) { return convs.find(function (c) { return c.id === id; }); }
  function current() { return conv(currentId); }
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
  function now() { return new Date().toISOString(); }

  function newConversation() {
    var c = { id: uid('conv'), title: 'New conversation', threadId: uid('thread'), createdAt: now(), updatedAt: now(), messages: [] };
    convs.unshift(c); currentId = c.id; save(); return c;
  }
  function deleteConversation(id) {
    convs = convs.filter(function (c) { return c.id !== id; });
    if (currentId === id) currentId = null;
    save();
  }
  function titleFrom(text) { var t = (text || '').replace(/\s+/g, ' ').trim(); return t.length > 38 ? t.slice(0, 38) + '…' : (t || 'New conversation'); }

  /* ── app context adapter (sent to the agent) ─────────────────────── */
  function appState() {
    var path = location.pathname.replace(/.*\/product\//, '/').replace(/\.html$/, '') || '/';
    return {
      route: path, pathname: path,
      pageTitle: document.title,
      selectedCreatorId: (window.AURA_CONTEXT && window.AURA_CONTEXT.creatorId) || undefined,
      workspaceId: (window.AURA_CONTEXT && window.AURA_CONTEXT.workspaceId) || undefined,
      locale: (window.AuraI18n && window.AuraI18n.lang) || 'en'
    };
  }
  function pageSuggestions() {
    var p = location.pathname;
    if (/loyalty/.test(p)) return ['Show my loyalty program stats', 'List my rewards', 'Who are my top fans?'];
    if (/fanpass|fan-pass/.test(p)) return ['List my fan passes', 'Simulate a fan pass launch', 'Explain fan pass perks'];
    if (/b2b/.test(p)) return ['Run the B2B expansion agent', 'Discover local businesses', 'Draft a partnership pitch'];
    if (/token/.test(p)) return ['Explain token economy readiness', 'Analyze token economy risk', 'Simulate the token economy'];
    if (/dashboard/.test(p)) return ['Run a platform health check', 'Summarize my dashboard', 'Generate fan recommendations'];
    return ['Run a platform health check', 'Show my loyalty stats', 'Generate fan recommendations', 'Explain what you can do'];
  }

  /* ── escaping + markdown-lite (safe) ─────────────────────────────── */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function md(text) {
    var src = esc(text);
    var out = [], lines = src.split('\n'), inCode = false, code = [], inList = false, list = [];
    function flushList() { if (inList) { out.push('<ul>' + list.join('') + '</ul>'); list = []; inList = false; } }
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (/^```/.test(ln.trim())) { if (inCode) { out.push('<pre><code>' + code.join('\n') + '</code></pre>'); code = []; inCode = false; } else { flushList(); inCode = true; } continue; }
      if (inCode) { code.push(ln); continue; }
      if (/^\s*[-*]\s+/.test(ln)) { inList = true; list.push('<li>' + inline(ln.replace(/^\s*[-*]\s+/, '')) + '</li>'); continue; }
      flushList();
      if (ln.trim() === '') continue;
      out.push('<p>' + inline(ln) + '</p>');
    }
    flushList(); if (inCode) out.push('<pre><code>' + code.join('\n') + '</code></pre>');
    return out.join('');
  }
  function inline(s) {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  /* ── DOM build ───────────────────────────────────────────────────── */
  function svg(p) { return '<svg viewBox="0 0 24 24">' + p + '</svg>'; }
  function mount() {
    if (document.getElementById('aui-launcher')) return;
    var launcher = document.createElement('button');
    launcher.id = 'aui-launcher'; launcher.className = 'aui-launcher'; launcher.setAttribute('aria-label', 'Open Aura assistant');
    launcher.innerHTML = '<img src="' + LOGO + '" alt=""><span class="aui-dot"></span>';
    launcher.onclick = open;
    document.body.appendChild(launcher);
    els.launcher = launcher;

    var panel = document.createElement('div');
    panel.className = 'aui-panel'; panel.id = 'aui-panel'; panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Aura assistant'); panel.hidden = true;
    panel.innerHTML =
      '<div class="aui-head">' +
        '<img src="' + LOGO + '" alt="Aura">' +
        '<div><div class="aui-title">Aura Copilot</div><div class="aui-sub">agentic assistant</div></div>' +
        '<div class="aui-grow"></div>' +
        '<button class="aui-iconbtn" id="aui-new" aria-label="New conversation" title="New conversation">' + svg('<path d="M12 5v14M5 12h14"/>') + '</button>' +
        '<button class="aui-iconbtn" id="aui-hist" aria-label="Conversation history" title="History">' + svg('<path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-8 5"/><path d="M3 3v5h5M12 7v5l3 2"/>') + '</button>' +
        '<button class="aui-iconbtn" id="aui-close" aria-label="Close assistant" title="Close">' + svg('<path d="M6 6l12 12M18 6L6 18"/>') + '</button>' +
      '</div>' +
      '<div class="aui-history" id="aui-history" hidden>' +
        '<div class="aui-hh"><button class="aui-iconbtn" id="aui-histback" aria-label="Back">' + svg('<path d="M15 6l-6 6 6 6"/>') + '</button> Conversations</div>' +
        '<div class="aui-hlist" id="aui-hlist"></div>' +
      '</div>' +
      '<div class="aui-body" id="aui-body"></div>' +
      '<div class="aui-foot">' +
        '<div class="aui-composer">' +
          '<textarea id="aui-input" rows="1" placeholder="Ask Aura to analyze, explain or act…" aria-label="Message Aura"></textarea>' +
          '<button class="aui-send" id="aui-send" aria-label="Send" disabled>' + svg('<path d="M3 11l18-8-8 18-2-7-8-3z"/>') + '</button>' +
        '</div>' +
        '<div class="aui-disclaimer">Aura grounds answers in your real data. Sensitive actions ask for confirmation.</div>' +
      '</div>';
    document.body.appendChild(panel);
    els.panel = panel;
    els.body = panel.querySelector('#aui-body');
    els.input = panel.querySelector('#aui-input');
    els.send = panel.querySelector('#aui-send');
    els.history = panel.querySelector('#aui-history');
    els.hlist = panel.querySelector('#aui-hlist');

    panel.querySelector('#aui-close').onclick = close;
    panel.querySelector('#aui-new').onclick = function () { currentId = null; sessionTouched = false; els.history.hidden = true; renderBody(); els.input.focus(); };
    panel.querySelector('#aui-hist').onclick = openHistory;
    panel.querySelector('#aui-histback').onclick = function () { els.history.hidden = true; };

    els.input.addEventListener('input', function () { autoSize(); els.send.disabled = running || !els.input.value.trim(); });
    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    });
    els.send.onclick = function () { if (running) stop(); else submit(); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !els.panel.hidden) close(); });
  }

  function autoSize() { var t = els.input; t.style.height = 'auto'; t.style.height = Math.min(132, t.scrollHeight) + 'px'; }

  /* ── open/close ──────────────────────────────────────────────────── */
  function open() {
    els.launcher.hidden = true; els.panel.hidden = false;
    // Intelligent entry: resume active session conversation, else landing.
    if (!sessionTouched) currentId = null;
    renderBody();
    setTimeout(function () { els.input.focus(); }, 60);
  }
  function close() { els.panel.hidden = true; els.launcher.hidden = false; }

  function openHistory() {
    els.history.hidden = false;
    if (!convs.length) { els.hlist.innerHTML = '<p style="color:var(--aui-t-lo);font-size:13px;padding:14px;text-align:center">No conversations yet.</p>'; return; }
    els.hlist.innerHTML = convs.map(function (c) {
      return '<div class="aui-conv' + (c.id === currentId ? ' on' : '') + '" data-id="' + c.id + '">' +
        '<div class="aui-ct"><div class="aui-cname">' + esc(c.title) + '</div><div class="aui-cmeta">' + when(c.updatedAt) + ' · ' + c.messages.length + ' msg</div></div>' +
        '<button class="aui-iconbtn aui-del" data-del="' + c.id + '" aria-label="Delete conversation">' + svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>') + '</button>' +
      '</div>';
    }).join('');
    els.hlist.querySelectorAll('.aui-conv').forEach(function (row) {
      row.onclick = function (e) {
        if (e.target.closest('[data-del]')) { deleteConversation(e.target.closest('[data-del]').getAttribute('data-del')); openHistory(); if (!current()) renderBody(); return; }
        currentId = row.getAttribute('data-id'); sessionTouched = true; els.history.hidden = true; renderBody();
      };
    });
  }
  function when(iso) { var d = Date.now() - new Date(iso).getTime(); var m = Math.floor(d / 60000); if (m < 1) return 'now'; if (m < 60) return m + 'm'; var h = Math.floor(m / 60); if (h < 24) return h + 'h'; return Math.floor(h / 24) + 'd'; }

  /* ── render body (landing | chat) ────────────────────────────────── */
  function renderBody() {
    var c = current();
    if (!c || !c.messages.length) { renderLanding(); return; }
    els.body.innerHTML = '';
    c.messages.forEach(function (m) { els.body.appendChild(messageEl(m)); });
    scrollDown(true);
  }

  function renderLanding() {
    var recent = convs.find(function (x) { return x.messages.length; });
    var greet = 'I can help you understand, pilot and automate your Aura workspace — loyalty, fan passes, token economy and B2B growth. What would you like to do?';
    var chips = pageSuggestions().map(function (s) { return '<button class="aui-chip" data-s="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
    var resume = recent ? '<div class="aui-resume"><button class="aui-btn sm" id="aui-resume">Resume “' + esc(recent.title) + '”</button></div>' : '';
    els.body.innerHTML =
      '<div class="aui-landing">' +
        '<img src="' + LOGO + '" alt="Aura">' +
        '<h3>Hey, I\'m your Aura copilot</h3>' +
        '<p>' + esc(greet) + '</p>' +
        resume +
        '<div class="aui-chips">' + chips + '</div>' +
        '<div class="aui-cap">Grounded in your real data · sensitive actions confirmed</div>' +
      '</div>';
    els.body.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { els.input.value = b.getAttribute('data-s'); submit(); }; });
    var r = els.body.querySelector('#aui-resume');
    if (r) r.onclick = function () { currentId = recent.id; sessionTouched = true; renderBody(); };
  }

  /* ── message elements ────────────────────────────────────────────── */
  function messageEl(m) {
    var wrap = document.createElement('div');
    wrap.className = 'aui-msg ' + (m.role === 'user' ? 'user' : 'bot');
    var av = m.role === 'user'
      ? '<div class="aui-av user">You</div>'
      : '<div class="aui-av"><img src="' + LOGO + '" alt="Aura"></div>';
    var inner = '<div class="aui-bubble">' + (m.role === 'user' ? esc(m.content).replace(/\n/g, '<br>') : md(m.content || '')) + '</div>';
    wrap.innerHTML = av + '<div style="min-width:0;max-width:84%">' + inner + blocksHtml(m.blocks) + '</div>';
    bindBlockActions(wrap, m);
    return wrap;
  }

  function blocksHtml(blocks) {
    if (!blocks || !blocks.length) return '';
    return blocks.map(renderBlock).filter(Boolean).join('');
  }

  /* ── UIBlock renderer (allowlist) ────────────────────────────────── */
  function renderBlock(b) {
    if (!b || !ALLOWED_BLOCKS[b.kind]) return '';
    var d = b.data || {};
    var title = b.title ? '<div class="aui-bt"><img src="' + LOGO + '" style="width:14px;height:14px">' + esc(b.title) + '</div>' : '';
    switch (b.kind) {
      case 'metric_grid': {
        var items = Object.keys(d).slice(0, 8).map(function (k) {
          var v = d[k]; if (v && typeof v === 'object') return '';
          return '<div class="aui-metric"><div class="v">' + esc(v) + '</div><div class="l">' + esc(label(k)) + '</div></div>';
        }).join('');
        return '<div class="aui-block">' + title + '<div class="aui-metricgrid">' + items + '</div></div>';
      }
      case 'action_plan': {
        var steps = (d.items || d.steps || d.actions || []);
        if (!Array.isArray(steps)) steps = [];
        var rows = steps.slice(0, 6).map(function (s, i) {
          var a = s.area || s.title || s.label || ('Step ' + (i + 1));
          var r = s.recommendation || s.detail || s.description || '';
          return '<div class="aui-step"><div class="n">' + (i + 1) + '</div><div><div class="a">' + esc(a) + '</div><div class="r">' + esc(r) + '</div></div></div>';
        }).join('');
        return '<div class="aui-block">' + title + '<div class="aui-steps">' + rows + '</div></div>';
      }
      case 'health_status': {
        var rows2 = (d.checks || d.integrations || []).slice(0, 10).map(function (c) {
          var st = (c.status || c.state || '').toLowerCase();
          var cls = /ok|ready|healthy|pass|up/.test(st) ? 'ok' : /warn|partial|degraded/.test(st) ? 'warn' : 'bad';
          return '<div class="aui-healthrow"><span class="s ' + cls + '"></span>' + esc(c.name || c.label || c.id) + ' — ' + esc(c.status || c.state || '') + '</div>';
        }).join('');
        var score = (d.score != null) ? '<div class="aui-bigscore">' + esc(d.score) + '%</div>' : '';
        return '<div class="aui-block">' + title + score + rows2 + '</div>';
      }
      case 'token_economy': {
        var sc = d.score != null ? d.score : (d.readiness != null ? d.readiness : '—');
        return '<div class="aui-block">' + title + '<div class="aui-bigscore">' + esc(sc) + (typeof sc === 'number' ? '%' : '') + '</div>' + kvRows(d, ['score', 'readiness']) + '</div>';
      }
      case 'b2b_opportunity': {
        var list = (d.businesses || d.opportunities || []).slice(0, 5).map(function (x) {
          return '<div class="aui-kv"><span class="k">' + esc(x.name || x.businessName || 'Business') + '</span><span>' + esc(x.score != null ? x.score : (x.fitScore != null ? x.fitScore : '')) + '</span></div>';
        }).join('');
        return '<div class="aui-block">' + title + (list || kvRows(d, [])) + '</div>';
      }
      case 'summary_card':
      case 'tool_result':
      case 'audit_event':
        return '<div class="aui-block">' + title + kvRows(d, []) + '</div>';
      case 'suggestion_chips': {
        var chips = (d.chips || []).slice(0, 6).map(function (s) { return '<button class="aui-chip" data-s="' + esc(s) + '">' + esc(prettyAction(s)) + '</button>'; }).join('');
        return chips ? '<div style="margin:8px 0"><div class="aui-chips" style="justify-content:flex-start">' + chips + '</div></div>' : '';
      }
      case 'confirmation_card': {
        var args = '';
        try { args = '<pre style="margin:8px 0"><code>' + esc(JSON.stringify(d.arguments || {}, null, 2)) + '</code></pre>'; } catch (e) {}
        return '<div class="aui-confirm" data-approval="' + esc(d.confirmationToken || d.approvalId || '') + '" data-tool="' + esc(d.tool || '') + '">' +
          '<div class="aui-bt">⚠ Confirmation required</div>' +
          '<div class="w">' + esc(d.warning || 'This action needs your approval before it runs.') + '</div>' +
          args +
          '<div class="aui-actions"><button class="aui-btn primary sm" data-approve>Approve & run</button><button class="aui-btn ghost sm" data-reject>Cancel</button></div>' +
        '</div>';
      }
      case 'error_card':
        return '<div class="aui-error"><div class="h">' + esc(d.title || 'Something went wrong') + '</div>' + esc(d.message || '') + '</div>';
      default:
        return '';
    }
  }
  function kvRows(d, skip) {
    return Object.keys(d || {}).filter(function (k) { return skip.indexOf(k) < 0 && typeof d[k] !== 'object'; }).slice(0, 8)
      .map(function (k) { return '<div class="aui-kv"><span class="k">' + esc(label(k)) + '</span><span>' + esc(d[k]) + '</span></div>'; }).join('');
  }
  function label(k) { return String(k).replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }).trim(); }
  var ACTION_LABELS = { generateDMDraft: 'Generate DMs', generateRecommendations: 'Get recommendations', getLoyaltyStats: 'Loyalty stats', runPlatformHealthCheck: 'Health check', runB2BExpansionAgent: 'Run B2B agent', listRewards: 'List rewards', getTopFans: 'Top fans' };
  function prettyAction(s) { return ACTION_LABELS[s] || label(s); }

  /* ── block actions (suggestions + confirmation) ──────────────────── */
  function bindBlockActions(wrap, m) {
    wrap.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { els.input.value = b.getAttribute('data-s'); submit(); }; });
    wrap.querySelectorAll('.aui-confirm').forEach(function (card) {
      var token = card.getAttribute('data-approval'); var tool = card.getAttribute('data-tool');
      var approve = card.querySelector('[data-approve]'); var reject = card.querySelector('[data-reject]');
      if (reject) reject.onclick = function () { card.innerHTML = '<div class="w">Action cancelled.</div>'; };
      if (approve) approve.onclick = function () { runConfirmation(card, tool, token, m); };
    });
  }

  function runConfirmation(card, tool, token, m) {
    var args = {};
    try { args = (m.confirmArgs && m.confirmArgs[token]) || {}; } catch (e) {}
    card.querySelector('.aui-actions').innerHTML = '<span class="aui-think-label">Running…</span>';
    fetch(API() + '/api/operator/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: tool, args: args, confirmationToken: token, context: appState() })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j && res.j.success) {
          card.className = 'aui-block';
          card.innerHTML = '<div class="aui-bt" style="color:var(--aui-lime)">✓ Action completed</div><div style="font-size:13px;color:var(--aui-t-mid)">' + esc(tool) + (res.j.meta && res.j.meta.simulated ? ' (simulated)' : '') + '</div>';
        } else {
          var code = (res.j && res.j.error && res.j.error.code) || 'EXECUTE_FAILED';
          card.querySelector('.aui-actions') ? (card.querySelector('.aui-actions').innerHTML = '<div class="aui-error"><div class="h">Could not complete</div>' + esc(code) + '</div>') : 0;
        }
      }).catch(function () {
        var slot = card.querySelector('.aui-actions'); if (slot) slot.innerHTML = '<div class="aui-error">Network error — please retry.</div>';
      });
  }

  /* ── send / stream ───────────────────────────────────────────────── */
  function submit() {
    var text = els.input.value.trim();
    if (!text || running) return;
    sessionTouched = true;
    var c = current() || newConversation();
    var userMsg = { id: uid('m'), role: 'user', content: text };
    c.messages.push(userMsg);
    if (c.messages.filter(function (x) { return x.role === 'user'; }).length === 1) c.title = titleFrom(text);
    c.updatedAt = now(); save();

    els.input.value = ''; autoSize(); els.send.disabled = true;
    if (current().messages.length === 1) renderBody(); else els.body.appendChild(messageEl(userMsg));
    scrollDown(true);

    // thinking indicator
    var think = document.createElement('div');
    think.className = 'aui-msg bot'; think.id = 'aui-thinking';
    think.innerHTML = '<div class="aui-av"><img src="' + LOGO + '" alt=""></div><div class="aui-think" role="status" aria-live="polite"><span class="aui-d"></span><span class="aui-d"></span><span class="aui-d"></span><span class="aui-think-label">Aura is thinking…</span></div>';
    els.body.appendChild(think); scrollDown(true);

    setRunning(true);

    // assistant message accumulator
    var asst = { id: uid('m'), role: 'assistant', content: '', blocks: [], confirmArgs: {} };
    var bubbleEl = null, started = false;

    function ensureBubble() {
      if (started) return;
      started = true;
      var t = document.getElementById('aui-thinking'); if (t) t.remove();
      var wrap = document.createElement('div'); wrap.className = 'aui-msg bot';
      wrap.innerHTML = '<div class="aui-av"><img src="' + LOGO + '" alt=""></div><div style="min-width:0;max-width:84%"><div class="aui-bubble aui-cursor"></div><div class="aui-extra"></div></div>';
      els.body.appendChild(wrap);
      bubbleEl = wrap.querySelector('.aui-bubble');
      asst._wrap = wrap;
    }

    abort = new AbortController();
    var history = c.messages.map(function (m) { return { id: m.id, role: m.role, content: m.content }; });

    window.AgUIClient.run(
      { threadId: c.threadId, messages: history, state: appState() },
      {
        ToolCallStart: function (e) { showTool(e.toolCallName, false); },
        ToolCallResult: function (e) { /* keep silent; final reply summarizes */ },
        TextMessageContent: function (e) { ensureBubble(); asst.content += e.delta; bubbleEl.innerHTML = md(asst.content); scrollDown(); },
        TextMessageEnd: function () { if (bubbleEl) bubbleEl.classList.remove('aui-cursor'); },
        Custom: function (e) { handleCustom(e, asst); },
        RunError: function (e) { ensureBubble(); bubbleEl.classList.remove('aui-cursor'); bubbleEl.parentElement.querySelector('.aui-extra').innerHTML = '<div class="aui-error"><div class="h">Assistant unavailable</div>' + esc(e.message || 'Please try again.') + '</div>'; },
        onError: function (err) {
          var t = document.getElementById('aui-thinking'); if (t) t.remove();
          ensureBubble(); bubbleEl.classList.remove('aui-cursor');
          bubbleEl.parentElement.querySelector('.aui-extra').innerHTML = '<div class="aui-error"><div class="h">Could not reach Aura</div>' + esc(err.message || '') + '</div>';
          finish();
        },
        onAbort: function () { if (bubbleEl) { bubbleEl.classList.remove('aui-cursor'); asst.content += '\n\n_(stopped)_'; bubbleEl.innerHTML = md(asst.content); } finish(); },
        onDone: function () {
          if (!started) { var t = document.getElementById('aui-thinking'); if (t) t.remove(); }
          // attach rendered extra blocks into asst, then persist
          if (asst._wrap) {
            var extra = asst._wrap.querySelector('.aui-extra');
            if (extra) extra.innerHTML = blocksHtml(asst.blocks);
            bindBlockActions(asst._wrap, asst);
          }
          c.messages.push({ id: asst.id, role: 'assistant', content: asst.content, blocks: asst.blocks, confirmArgs: asst.confirmArgs });
          c.updatedAt = now(); save();
          finish();
        }
      },
      abort.signal
    );

    function finish() { setRunning(false); abort = null; scrollDown(); }
  }

  function handleCustom(e, asst) {
    if (e.name === 'app.render_component' || e.name === 'app.suggestions') {
      var block = e.value; if (block && ALLOWED_BLOCKS[block.kind]) asst.blocks.push(block);
      liveAppend(asst);
    } else if (e.name === 'app.approval.required') {
      var b = e.value; if (b && b.kind === 'confirmation_card') { asst.blocks.push(b); if (b.data && b.data.confirmationToken) asst.confirmArgs[b.data.confirmationToken] = b.data.arguments || {}; }
      liveAppend(asst);
    } else if (e.name === 'app.navigate' && e.value && e.value.path) {
      // controlled navigation suggestion — surfaced as a chip, never auto-redirect
      asst.blocks.push({ kind: 'suggestion_chips', id: 'nav', data: { chips: ['Open ' + e.value.path] } });
    }
    // app.toast / app.debug: ignored in UI
  }
  function liveAppend(asst) {
    if (!asst._wrap) return;
    var extra = asst._wrap.querySelector('.aui-extra');
    if (extra) { extra.innerHTML = blocksHtml(asst.blocks); bindBlockActions(asst._wrap, asst); scrollDown(); }
  }

  function showTool(name, sim) {
    var t = document.getElementById('aui-thinking');
    var host = t ? t.querySelector('.aui-think') : null;
    if (host && !host.querySelector('.aui-tool')) {
      var pill = document.createElement('span'); pill.className = 'aui-tool' + (sim ? ' sim' : '');
      pill.innerHTML = '<span class="aui-tdot"></span>' + esc(prettyAction(name));
      host.appendChild(pill);
    }
  }

  function setRunning(on) {
    running = on;
    els.send.disabled = on ? false : !els.input.value.trim();
    els.send.classList.toggle('stop', on);
    els.send.innerHTML = on ? svg('<rect x="6" y="6" width="12" height="12" rx="2"/>') : svg('<path d="M3 11l18-8-8 18-2-7-8-3z"/>');
    els.send.setAttribute('aria-label', on ? 'Stop generating' : 'Send');
  }
  function stop() { if (abort) abort.abort(); }

  /* ── scroll ──────────────────────────────────────────────────────── */
  function nearBottom() { var b = els.body; return b.scrollHeight - b.scrollTop - b.clientHeight < 80; }
  function scrollDown(force) { if (force || nearBottom()) els.body.scrollTop = els.body.scrollHeight; }

  /* ── boot ────────────────────────────────────────────────────────── */
  function init() { mount(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.AuraAgentChat = { open: open, close: close };
})();
