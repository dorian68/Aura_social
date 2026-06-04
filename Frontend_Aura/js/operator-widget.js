/* ============================================================
   AURA — Operator Chat Widget (vanilla JS)
   Floating bottom-right agent — calls /api/operator/chat
   ============================================================ */
(function () {
  const API = window.AURA_API_BASE || 'http://localhost:3000';

  /* ---- state ---- */
  let isOpen = false;
  let isLoading = false;
  let messages = [];

  /* ---- suggested starters ---- */
  const STARTERS = [
    'Check workspace health',
    'Show loyalty stats',
    'Run B2B agent',
    'Explain Token Readiness'
  ];

  const NEXT_ACTION_LABELS = {
    getLoyaltyStats: 'Loyalty stats', getTopFans: 'Top fans',
    listRewards: 'List rewards', createReward: 'Create reward',
    runPlatformHealthCheck: 'Health check', runB2BExpansionAgent: 'Run B2B agent',
    generateDMDraft: 'Generate DMs', generateCampaignDraft: 'Draft campaign',
    simulateTokenEconomy: 'Simulate token economy',
    explainTokenReadiness: 'Token readiness',
    getContractStatus: 'Contract status', listFanPasses: 'List passes',
    simulateFanPassLaunch: 'Simulate launch', discoverLocalBusinesses: 'Discover businesses',
    generateRecommendations: 'Recommendations', getAuditTrail: 'Audit trail',
    getIntegrationHealth: 'Integration health'
  };

  /* ---- styles ---- */
  const style = document.createElement('style');
  style.textContent = `
    #aura-op-root * { box-sizing: border-box; }
    #aura-op-root {
      position: fixed; bottom: 22px; right: 22px; z-index: 9999;
      display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* launcher button */
    #aura-op-launcher {
      width: 52px; height: 52px; border-radius: 50%;
      background: #0a0a0f;
      border: 1px solid rgba(184,255,77,.35);
      box-shadow: 0 8px 32px rgba(0,0,0,.6), 0 0 0 0 rgba(184,255,77,0);
      cursor: pointer; display: grid; place-items: center; position: relative;
      transition: border-color .25s, box-shadow .25s;
    }
    #aura-op-launcher:hover {
      border-color: rgba(184,255,77,.6);
      box-shadow: 0 8px 32px rgba(0,0,0,.6), 0 0 24px -4px rgba(184,255,77,.4);
    }
    #aura-op-launcher svg { width: 22px; height: 22px; color: #B8FF4D; }
    #aura-op-dot {
      position: absolute; top: -2px; right: -2px;
      width: 12px; height: 12px; border-radius: 50%;
      background: #B8FF4D; border: 2px solid #0a0a0f;
      box-shadow: 0 0 8px rgba(184,255,77,.8);
      display: none;
    }
    #aura-op-dot.visible { display: block; }

    /* chat window */
    #aura-op-window {
      width: 360px; height: 560px;
      background: rgba(8,11,10,.97);
      border: 1px solid rgba(232,220,200,.08);
      border-radius: 18px;
      box-shadow: 0 24px 64px rgba(0,0,0,.85);
      backdrop-filter: blur(18px);
      display: flex; flex-direction: column; overflow: hidden;
      transform-origin: bottom right;
      animation: opSlideIn .22s cubic-bezier(.22,.61,.36,1) both;
    }
    @keyframes opSlideIn {
      from { opacity:0; transform: scale(.92) translateY(12px); }
      to   { opacity:1; transform: scale(1)  translateY(0); }
    }

    /* header */
    #aura-op-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-bottom: 1px solid rgba(232,220,200,.07);
      flex-shrink: 0;
    }
    .op-header-left { display: flex; align-items: center; gap: 9px; }
    .op-pulse {
      width: 8px; height: 8px; border-radius: 50%; background: #B8FF4D;
      box-shadow: 0 0 8px rgba(184,255,77,.7);
    }
    .op-title {
      font-size: 13px; font-weight: 700; color: #FFF7E8;
      font-family: 'Space Grotesk', system-ui, sans-serif; letter-spacing: -.01em;
    }
    .op-subtitle { font-size: 11px; color: rgba(255,247,232,.4); margin-top: 1px; }
    .op-hbtn {
      width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center;
      color: rgba(255,247,232,.45); cursor: pointer; transition: background .18s, color .18s;
      background: none; border: none;
    }
    .op-hbtn:hover { background: rgba(255,247,232,.06); color: #FFF7E8; }
    .op-hbtn svg { width: 15px; height: 15px; }

    /* messages */
    #aura-op-msgs {
      flex: 1; overflow-y: auto; padding: 14px 12px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    #aura-op-msgs::-webkit-scrollbar { width: 4px; }
    #aura-op-msgs::-webkit-scrollbar-track { background: transparent; }
    #aura-op-msgs::-webkit-scrollbar-thumb { background: rgba(232,220,200,.12); border-radius: 2px; }

    /* empty state */
    .op-empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 14px; padding: 20px; text-align: center;
    }
    .op-empty-orb {
      width: 56px; height: 56px; border-radius: 50%;
      background: radial-gradient(circle at 50% 35%, rgba(184,255,77,.18), transparent 70%);
      border: 1px solid rgba(184,255,77,.25);
      display: grid; place-items: center;
    }
    .op-empty-orb svg { width: 24px; height: 24px; color: #B8FF4D; }
    .op-empty-t { font-size: 13px; font-weight: 600; color: #FFF7E8; }
    .op-empty-s { font-size: 12px; color: rgba(255,247,232,.45); line-height: 1.5; max-width: 22em; }
    .op-starters { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; margin-top: 4px; }
    .op-starter {
      padding: 6px 12px; border-radius: 999px;
      border: 1px solid rgba(184,255,77,.2);
      background: rgba(184,255,77,.06);
      font-size: 11.5px; font-weight: 600; color: #B8FF4D;
      cursor: pointer; transition: background .18s;
    }
    .op-starter:hover { background: rgba(184,255,77,.12); }

    /* message bubbles */
    .op-msg { display: flex; align-items: flex-start; gap: 8px; }
    .op-msg.user { flex-direction: row-reverse; }
    .op-avatar {
      width: 24px; height: 24px; border-radius: 50%;
      display: grid; place-items: center; flex-shrink: 0; font-size: 11px;
    }
    .op-avatar.bot { background: rgba(184,255,77,.15); color: #B8FF4D; }
    .op-avatar.user { background: rgba(255,247,232,.08); color: rgba(255,247,232,.6); }
    .op-avatar svg { width: 12px; height: 12px; }
    .op-bubble {
      max-width: 82%; border-radius: 14px; padding: 9px 12px;
      font-size: 12.5px; line-height: 1.55;
    }
    .op-bubble.bot { background: rgba(255,247,232,.04); color: #E8DCC8; border-bottom-left-radius: 4px; }
    .op-bubble.user { background: rgba(255,247,232,.08); color: #FFF7E8; border-bottom-right-radius: 4px; }
    .op-bubble.error { color: rgba(224,122,77,.9); }

    /* loading dots */
    .op-dots { display: flex; align-items: center; gap: 5px; padding: 4px 0; }
    .op-dots span {
      width: 6px; height: 6px; border-radius: 50%; background: #B8FF4D; opacity: .5;
      animation: opDot 1.2s ease-in-out infinite;
    }
    .op-dots span:nth-child(2) { animation-delay: .18s; }
    .op-dots span:nth-child(3) { animation-delay: .36s; }
    @keyframes opDot { 0%,80%,100%{transform:scale(.7);opacity:.3} 40%{transform:scale(1);opacity:1} }

    /* tool call tags */
    .op-tool-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
    .op-tool-tag {
      font-size: 10.5px; color: rgba(255,247,232,.35);
      background: rgba(255,247,232,.04); border: 1px solid rgba(255,247,232,.07);
      border-radius: 999px; padding: 2px 8px; font-family: 'Space Mono', monospace;
    }

    /* next actions */
    .op-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .op-action {
      padding: 5px 11px; border-radius: 999px;
      border: 1px solid rgba(184,255,77,.2);
      background: rgba(184,255,77,.05);
      font-size: 11px; font-weight: 600; color: #B8FF4D;
      cursor: pointer; transition: background .18s;
    }
    .op-action:hover { background: rgba(184,255,77,.12); }

    /* UI blocks */
    .op-block { border-radius: 12px; overflow: hidden; margin-top: 8px; }
    .op-block-kpi {
      background: rgba(255,247,232,.04);
      border: 1px solid rgba(232,220,200,.08);
      padding: 12px;
    }
    .op-block-title {
      font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
      color: #B8FF4D; margin-bottom: 10px;
      font-family: 'Space Mono', monospace;
    }
    .op-kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
    .op-kpi-item {
      background: rgba(255,247,232,.03);
      border-radius: 8px; padding: 8px 10px;
    }
    .op-kpi-label { font-size: 10px; color: rgba(255,247,232,.4); font-weight: 600; margin-bottom: 3px; }
    .op-kpi-val { font-size: 15px; font-weight: 700; color: #FFF7E8; font-family: 'Space Grotesk', system-ui; letter-spacing: -.02em; }

    .op-block-health {
      background: rgba(255,247,232,.04);
      border: 1px solid rgba(232,220,200,.08);
      padding: 12px;
    }
    .op-int-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 0; border-bottom: 1px solid rgba(232,220,200,.06);
      font-size: 12px;
    }
    .op-int-row:last-child { border-bottom: none; }
    .op-int-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .op-int-label { flex: 1; color: rgba(255,247,232,.7); }
    .op-int-status { font-size: 10.5px; font-family: 'Space Mono', monospace; font-weight: 700; }

    .op-block-b2b {
      background: rgba(255,247,232,.04);
      border: 1px solid rgba(232,220,200,.08);
      padding: 12px;
    }
    .op-biz-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(232,220,200,.06); }
    .op-biz-row:last-child { border-bottom: none; }
    .op-biz-av { width: 28px; height: 28px; border-radius: 7px; background: linear-gradient(135deg,#12382b,#101614); border: 1px solid rgba(232,220,200,.1); display: grid; place-items: center; font-size: 12px; color: #B8FF4D; font-family: 'Space Grotesk', system-ui; font-weight: 700; flex-shrink: 0; }
    .op-biz-name { font-size: 12px; font-weight: 600; color: #FFF7E8; flex: 1; }
    .op-biz-score { font-size: 11px; font-weight: 700; color: #B8FF4D; font-family: 'Space Mono', monospace; }

    .op-block-token {
      background: rgba(255,247,232,.04);
      border: 1px solid rgba(232,220,200,.08);
      padding: 12px;
    }
    .op-token-score { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .op-token-num { font-family: 'Space Grotesk', system-ui; font-size: 38px; font-weight: 700; color: #FFF7E8; letter-spacing: -.03em; line-height: 1; }
    .op-token-label { font-size: 11.5px; color: rgba(255,247,232,.5); line-height: 1.4; max-width: 16em; }

    .op-block-action {
      background: rgba(255,247,232,.04);
      border: 1px solid rgba(232,220,200,.08);
      padding: 12px;
    }
    .op-rec-item { display: flex; gap: 9px; padding: 7px 0; border-bottom: 1px solid rgba(232,220,200,.06); }
    .op-rec-item:last-child { border-bottom: none; }
    .op-rec-dot { width: 6px; height: 6px; border-radius: 50%; background: #B8FF4D; flex-shrink: 0; margin-top: 5px; }
    .op-rec-text { font-size: 12px; color: rgba(255,247,232,.7); line-height: 1.5; }
    .op-rec-pri { font-size: 10px; font-weight: 700; font-family: 'Space Mono', monospace; text-transform: uppercase; }

    /* input */
    #aura-op-input-area {
      padding: 10px 12px 12px; border-top: 1px solid rgba(232,220,200,.07);
      flex-shrink: 0;
    }
    .op-input-wrap {
      display: flex; align-items: flex-end; gap: 8px;
      background: rgba(255,247,232,.04);
      border: 1px solid rgba(232,220,200,.1);
      border-radius: 12px; padding: 8px 10px 8px 14px;
      transition: border-color .2s;
    }
    .op-input-wrap:focus-within { border-color: rgba(184,255,77,.35); }
    #aura-op-textarea {
      flex: 1; background: none; border: none; outline: none; resize: none;
      color: #E8DCC8; font-size: 12.5px; font-family: 'Inter', system-ui;
      line-height: 1.5; min-height: 20px; max-height: 100px;
    }
    #aura-op-textarea::placeholder { color: rgba(255,247,232,.28); }
    #aura-op-send {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
      background: rgba(184,255,77,.18); border: none; cursor: pointer;
      display: grid; place-items: center; color: #B8FF4D;
      transition: background .18s; align-self: flex-end;
    }
    #aura-op-send:hover:not(:disabled) { background: rgba(184,255,77,.28); }
    #aura-op-send:disabled { opacity: .35; cursor: default; }
    #aura-op-send svg { width: 14px; height: 14px; }
    .op-hint { text-align: center; font-size: 10px; color: rgba(255,247,232,.22); margin-top: 6px; }

    /* mobile */
    @media (max-width: 480px) {
      #aura-op-window { width: 100vw; height: 100vh; border-radius: 0; position: fixed; inset: 0; }
      #aura-op-root { bottom: 16px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  /* ---- DOM ---- */
  const root = document.createElement('div');
  root.id = 'aura-op-root';
  root.innerHTML = `
    <div id="aura-op-window" style="display:none">
      <div id="aura-op-header">
        <div class="op-header-left">
          <div class="op-pulse"></div>
          <div>
            <div class="op-title">Aura Operator</div>
            <div class="op-subtitle">Natural language control</div>
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="op-hbtn" id="aura-op-clear" title="Clear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
          </button>
          <button class="op-hbtn" id="aura-op-close" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div id="aura-op-msgs"></div>
      <div id="aura-op-input-area">
        <div class="op-input-wrap">
          <textarea id="aura-op-textarea" rows="1" placeholder="Ask anything about your platform…"></textarea>
          <button id="aura-op-send" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div class="op-hint">Enter to send · Shift+Enter for newline · Rules mode</div>
      </div>
    </div>
    <button id="aura-op-launcher" title="Aura Operator">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <div id="aura-op-dot"></div>
    </button>
  `;
  document.body.appendChild(root);

  /* ---- refs ---- */
  const win      = root.querySelector('#aura-op-window');
  const launcher = root.querySelector('#aura-op-launcher');
  const msgsEl   = root.querySelector('#aura-op-msgs');
  const textarea = root.querySelector('#aura-op-textarea');
  const sendBtn  = root.querySelector('#aura-op-send');
  const closeBtn = root.querySelector('#aura-op-close');
  const clearBtn = root.querySelector('#aura-op-clear');
  const dot      = root.querySelector('#aura-op-dot');

  /* ---- open / close ---- */
  function toggle() {
    isOpen = !isOpen;
    win.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) { renderMsgs(); textarea.focus(); }
  }
  launcher.addEventListener('click', toggle);
  closeBtn.addEventListener('click', toggle);
  clearBtn.addEventListener('click', () => { messages = []; dot.classList.remove('visible'); renderMsgs(); });

  /* ---- textarea auto-grow ---- */
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    sendBtn.disabled = !textarea.value.trim() || isLoading;
  });
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) send(); }
  });

  /* ---- render ---- */
  function renderMsgs() {
    if (messages.length === 0) {
      msgsEl.innerHTML = `
        <div class="op-empty">
          <div class="op-empty-orb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <div class="op-empty-t">Aura Operator</div>
          <div class="op-empty-s">Your natural-language control layer. Ask me to check health, run tools, or navigate the platform.</div>
          <div class="op-starters">
            ${STARTERS.map(s => `<div class="op-starter" data-s="${s}">${s}</div>`).join('')}
          </div>
        </div>`;
      msgsEl.querySelectorAll('[data-s]').forEach(el =>
        el.addEventListener('click', () => { textarea.value = el.getAttribute('data-s'); sendBtn.disabled = false; send(); }));
      return;
    }
    msgsEl.innerHTML = messages.map(renderMsg).join('');
    msgsEl.scrollTop = msgsEl.scrollHeight;
    // bind next actions
    msgsEl.querySelectorAll('[data-action]').forEach(el =>
      el.addEventListener('click', () => {
        const action = el.getAttribute('data-action');
        textarea.value = action;
        sendBtn.disabled = false;
        send();
      }));
  }

  function renderMsg(m) {
    if (m.loading) {
      return `<div class="op-msg">
        <div class="op-avatar bot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
        <div class="op-bubble bot"><div class="op-dots"><span></span><span></span><span></span></div></div>
      </div>`;
    }
    const isUser = m.role === 'user';
    const avatarSvg = isUser
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';

    let extra = '';
    if (!isUser) {
      if (m.toolCalls && m.toolCalls.length > 0) {
        extra += `<div class="op-tool-tags">${m.toolCalls.map(tc =>
          `<span class="op-tool-tag">${tc.toolName}${tc.simulated ? ' [sim]' : ''}</span>`).join('')}</div>`;
      }
      if (m.uiBlocks && m.uiBlocks.length > 0) {
        extra += m.uiBlocks.map(renderBlock).join('');
      }
      if (m.nextActions && m.nextActions.length > 0) {
        extra += `<div class="op-actions">${m.nextActions.slice(0,4).map(a => {
          const label = NEXT_ACTION_LABELS[a] || a.replace(/([A-Z])/g,' $1').trim();
          return `<div class="op-action" data-action="${a}">${label}</div>`;
        }).join('')}</div>`;
      }
    }

    return `<div class="op-msg ${isUser ? 'user' : ''}">
      <div class="op-avatar ${isUser ? 'user' : 'bot'}">${avatarSvg}</div>
      <div style="flex:1;min-width:0">
        <div class="op-bubble ${isUser ? 'user' : 'bot'} ${m.error ? 'error' : ''}">${escHtml(m.content)}</div>
        ${extra}
      </div>
    </div>`;
  }

  function renderBlock(block) {
    const title = `<div class="op-block-title">${escHtml(block.title)}</div>`;
    const d = block.data || {};

    if (block.type === 'kpi') {
      const metrics = (d.metrics || []).slice(0, 4);
      return `<div class="op-block op-block-kpi">${title}
        <div class="op-kpi-grid">
          ${metrics.map(m => `<div class="op-kpi-item"><div class="op-kpi-label">${escHtml(m.label||'')}</div><div class="op-kpi-val">${escHtml(String(m.value||''))}</div></div>`).join('')}
        </div></div>`;
    }

    if (block.type === 'health_status') {
      const integrations = (d.integrations || []).slice(0, 5);
      const STATUS_C = { ready:'#B8FF4D', mock_ready:'#7FB6FF', error:'#E07A4D', missing_config:'#E0B24D', disabled:'rgba(255,247,232,.25)' };
      return `<div class="op-block op-block-health">${title}
        ${d.score !== undefined ? `<div style="font-size:22px;font-weight:700;color:${d.score>=80?'#B8FF4D':d.score>=50?'#E0B24D':'#E07A4D'};font-family:'Space Grotesk',system-ui;letter-spacing:-.02em;margin-bottom:8px">${d.score}%</div>` : ''}
        ${integrations.map(ig => `<div class="op-int-row">
          <div class="op-int-dot" style="background:${STATUS_C[ig.status]||'rgba(255,247,232,.2)'}"></div>
          <div class="op-int-label">${escHtml(ig.label||ig.key||'')}</div>
          <div class="op-int-status" style="color:${STATUS_C[ig.status]||'rgba(255,247,232,.4)'}">${escHtml(ig.status||'')}</div>
        </div>`).join('')}
      </div>`;
    }

    if (block.type === 'b2b_opportunity') {
      const businesses = (d.businesses || []).slice(0, 4);
      const topB = d.topBusiness;
      return `<div class="op-block op-block-b2b">${title}
        ${d.location ? `<div style="font-size:11px;color:rgba(255,247,232,.45);margin-bottom:8px">📍 ${escHtml(String(d.location))}${d.businessesDiscovered ? ' · ' + d.businessesDiscovered + ' found' : ''}</div>` : ''}
        ${topB ? `<div class="op-biz-row"><div class="op-biz-av">${(topB.name||'?')[0]}</div><div class="op-biz-name">${escHtml(topB.name||'')}</div><div class="op-biz-score">${topB.rating||''} ★</div></div>` : ''}
        ${businesses.map(b => `<div class="op-biz-row"><div class="op-biz-av">${(b.name||'?')[0]}</div><div class="op-biz-name">${escHtml(b.name||'')}</div><div style="font-size:11px;color:rgba(255,247,232,.4)">${escHtml(b.category||'')}</div></div>`).join('')}
        ${d.opportunity ? `<div style="margin-top:8px;padding:8px;border-radius:8px;background:rgba(184,255,77,.06);border:1px solid rgba(184,255,77,.15)"><div style="font-size:12px;font-weight:600;color:#FFF7E8">${escHtml(d.opportunity.title||'')}</div><div style="font-size:11px;color:#B8FF4D;margin-top:3px">€${d.opportunity.platformCommission||0} commission</div></div>` : ''}
      </div>`;
    }

    if (block.type === 'token_economy') {
      const score = d.readinessScore ?? d.score;
      const label = d.readinessLabel ?? d.label;
      return `<div class="op-block op-block-token">${title}
        ${score !== undefined ? `<div class="op-token-score">
          <div class="op-token-num" style="color:${score>=75?'#B8FF4D':score>=45?'#E0B24D':'#E07A4D'}">${score}</div>
          <div class="op-token-label"><b style="color:#FFF7E8">/ 100</b><br>${escHtml(String(label||''))}</div>
        </div>` : ''}
        ${d.disclaimer ? `<div style="font-size:10.5px;color:rgba(255,247,232,.3);line-height:1.5;font-style:italic">${escHtml(String(d.disclaimer))}</div>` : ''}
      </div>`;
    }

    if (block.type === 'action_plan') {
      const items = (d.items || []).slice(0, 4);
      const PRI_C = { urgent:'#E07A4D', high:'#E0B24D', medium:'rgba(255,247,232,.6)', low:'rgba(255,247,232,.35)' };
      return `<div class="op-block op-block-action">${title}
        ${items.map(it => `<div class="op-rec-item">
          <div class="op-rec-dot"></div>
          <div><div class="op-rec-text">${escHtml(it.title||it.label||it.suggestedAction||'')}</div>
          ${it.priority ? `<div class="op-rec-pri" style="color:${PRI_C[it.priority]||'rgba(255,247,232,.4)'};margin-top:2px">${it.priority}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>`;
    }

    // generic fallback
    return `<div class="op-block op-block-kpi">${title}
      <div style="font-size:12px;color:rgba(255,247,232,.5)">${escHtml(block.type)}</div>
    </div>`;
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ---- send ---- */
  async function send() {
    const text = textarea.value.trim();
    if (!text || isLoading) return;
    textarea.value = ''; textarea.style.height = 'auto'; sendBtn.disabled = true;

    messages.push({ role: 'user', content: text });
    messages.push({ loading: true });
    isLoading = true;
    renderMsgs();

    let reply;
    try {
      const res = await fetch(API + '/api/operator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            workspaceId: 'workspace_aura_demo',
            currentPage: location.pathname,
            selectedCreatorId: 'creator-demo'
          }
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        reply = {
          role: 'assistant',
          content: json.data.reply,
          toolCalls: json.data.toolCalls || [],
          uiBlocks: json.data.uiBlocks || [],
          nextActions: json.data.nextActions || []
        };
      } else {
        reply = { role: 'assistant', content: json.error?.message || 'Something went wrong.', error: true };
      }
    } catch (e) {
      reply = { role: 'assistant', content: 'Cannot reach the Aura backend. Make sure the server is running on port 3000.', error: true };
    }

    messages.pop(); // remove loading
    messages.push(reply);
    isLoading = false;
    dot.classList.add('visible');
    renderMsgs();
    sendBtn.disabled = !textarea.value.trim();
  }

  sendBtn.addEventListener('click', send);
})();
