/* AURA — AG-UI streaming client (vanilla).
   Connects the canonical Frontend_Aura UI to POST /api/ag-ui/run and dispatches
   AG-UI events to handler callbacks. No dependency; uses fetch + ReadableStream.
   Override the API base via window.AURA_API_BASE (see aura-api.js). */
(function () {
  function base() {
    return window.AURA_API_BASE || 'http://localhost:3000';
  }

  /**
   * Run an AG-UI turn.
   * @param {object} input   RunAgentInput { threadId, runId, messages[], state, ... }
   * @param {object} on      handlers keyed by event type, e.g. { TextMessageContent(e){}, Custom(e){} }
   *                         plus optional onError(err) and onDone().
   * @param {AbortSignal} signal  to cancel the stream.
   */
  async function run(input, on, signal) {
    let response;
    try {
      response = await fetch(base() + '/api/ag-ui/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(input),
        signal: signal,
      });
    } catch (err) {
      if (on.onError) on.onError(networkError(err));
      return;
    }

    if (!response.ok || !response.body) {
      let code = 'AGUI_HTTP_' + response.status;
      try { const j = await response.json(); code = j.code || j.error?.code || code; } catch (e) {}
      if (on.onError) on.onError({ code: code, status: response.status, message: friendly(response.status) });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';
        for (const frame of frames) {
          const dataLines = frame
            .split('\n')
            .filter(function (l) { return l.indexOf('data:') === 0; })
            .map(function (l) { return l.replace(/^data:\s?/, ''); });
          if (!dataLines.length) continue;
          const raw = dataLines.join('\n');
          if (raw === '[DONE]') { if (on.onDone) on.onDone(); return; }
          let event;
          try { event = JSON.parse(raw); } catch (e) { continue; }
          dispatch(event, on);
        }
      }
      if (on.onDone) on.onDone();
    } catch (err) {
      if (signal && signal.aborted) { if (on.onAbort) on.onAbort(); return; }
      if (on.onError) on.onError(networkError(err));
    }
  }

  function dispatch(event, on) {
    if (typeof on[event.type] === 'function') {
      try { on[event.type](event); } catch (e) { /* a handler error must not kill the stream */ }
    }
    if (typeof on.any === 'function') on.any(event);
  }

  function friendly(status) {
    if (status === 401 || status === 403) return 'You are not authorized to use the assistant here.';
    if (status === 429) return 'Too many requests — please wait a moment.';
    return 'The assistant is temporarily unavailable. Please try again.';
  }
  function networkError(err) {
    return { code: 'AGUI_NETWORK', message: 'Could not reach the assistant. Check your connection and try again.', raw: String(err && err.message || err) };
  }

  window.AgUIClient = { run: run };
})();
