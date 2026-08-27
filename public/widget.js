(function () {
  "use strict";

  var script =
    document.currentScript ||
    document.querySelector("script[data-bot-id][src*='widget.js']");
  if (!script) return;

  var botId = script.getAttribute("data-bot-id");
  if (!botId) {
    console.error("[Chatbot Builder] Missing data-bot-id on widget script.");
    return;
  }

  // One widget instance per page — React Strict Mode / remounts can inject twice.
  document.querySelectorAll("#chatbot-builder-widget-root").forEach(function (node) {
    node.remove();
  });

  var hideLauncher = script.getAttribute("data-hide-launcher") === "true";

  var src = script.getAttribute("src") || "";
  var apiBase = src
    ? new URL(src, window.location.href).origin
    : window.location.origin;

  var SESSION_KEY = "cbb_embed_session_" + botId;
  var HISTORY_KEY = "cbb_embed_history_" + botId;

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSessionId() {
    try {
      var existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var id = uuid();
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    } catch {
      return uuid();
    }
  }

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(messages) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* ignore quota */
    }
  }

  var state = {
    open: false,
    loading: false,
    streaming: null,
    config: null,
    messages: loadHistory(),
    error: "",
    draft: "",
  };

  var root = document.createElement("div");
  root.id = "chatbot-builder-widget-root";
  document.body.appendChild(root);
  var shadow = root.attachShadow({ mode: "open" });

  if (!document.getElementById("cbb-widget-fonts")) {
    var fontLink = document.createElement("link");
    fontLink.id = "cbb-widget-fonts";
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap";
    document.head.appendChild(fontLink);
  }

  var style = document.createElement("style");
  style.textContent = [
    ":host, * { box-sizing: border-box; font-family: 'Space Grotesk', ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }",
    "button, a, [role='button'] { cursor: pointer; }",
    "button:disabled { cursor: not-allowed; }",
    ".wrap { position: fixed; z-index: 2147483000; right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); left: auto; }",
    ".launcher { width: 56px; height: 56px; border: 0; border-radius: 50%; color: #fff; box-shadow: 0 8px 24px rgba(70, 50, 110, .22); font-size: 22px; transition: transform .15s ease; }",
    ".launcher:hover { transform: translateY(-1px); }",
    ".panel { position: absolute; right: 0; bottom: 68px; width: min(380px, calc(100vw - 24px)); height: min(560px, calc(100vh - 100px)); color: #1c1830; border-radius: 16px; box-shadow: 0 4px 18px rgba(40, 30, 70, .1); display: flex; flex-direction: column; overflow: hidden; border: 0; }",
    ".panel.panel-flush { bottom: 0; }",
    ".panel[hidden] { display: none !important; }",
    ".header { padding: 12px 16px; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
    ".header strong { font-size: 14px; font-weight: 600; letter-spacing: -0.03em; }",
    ".close { background: transparent; border: 0; color: inherit; font-size: 20px; line-height: 1; opacity: .9; }",
    ".messages { flex: 1; overflow: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }",
    ".bubble { margin: 0; padding: 8px 12px; font-size: 14px; line-height: 1.375; white-space: pre-wrap; word-break: break-word; }",
    ".bubble.bot { align-self: flex-start; max-width: 90%; background: #fff; border: 1px solid rgba(28, 24, 48, .12); border-radius: 16px 16px 16px 6px; }",
    ".bubble.user { align-self: flex-end; max-width: 88%; color: #fff; border-radius: 16px 16px 6px 16px; }",
    ".bubble.system { align-self: flex-start; background: transparent; color: #6b6578; font-size: 13px; padding: 0; border: 0; }",
    ".footer { padding: 10px 12px 8px; border-top: 1px solid rgba(28, 24, 48, .1); background: #fff; }",
    ".row { display: flex; align-items: flex-end; gap: 8px; }",
    ".row textarea { flex: 1; resize: none; box-sizing: border-box; min-height: 44px; max-height: 120px; height: 44px; border-radius: 12px; border: 1px solid rgba(28, 24, 48, .14); padding: 11px 12px; font: inherit; background: #fff; color: inherit; line-height: 1.35; overflow-y: hidden; scrollbar-width: thin; }",
    ".row textarea::placeholder { color: #8a8496; }",
    ".row .send { border: 0; border-radius: 12px; color: #fff; width: 44px; height: 44px; min-width: 44px; min-height: 44px; padding: 0; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }",
    ".row .send svg { width: 20px; height: 20px; display: block; }",
    ".row .send:disabled { opacity: .6; }",
    ".brand { margin-top: 4px; text-align: center; font-size: 11px; line-height: 1.2; color: #7a7388; }",
    ".brand a { color: inherit; }",
    ".error { color: #b42318; font-size: 12px; margin: 0 0 6px; }",
  ].join("\n");
  shadow.appendChild(style);

  var wrap = document.createElement("div");
  wrap.className = "wrap";
  shadow.appendChild(wrap);

  function color() {
    return (state.config && state.config.primaryColor) || "#8B7EB8";
  }

  function chatSurface() {
    // Keep in sync with chatSurfaceFromPrimary() in src/lib/bot-defaults.ts (5% mix).
    return "color-mix(in srgb, " + color() + " 5%, white)";
  }

  function render() {
    wrap.innerHTML = "";

    // Avoid a default-color flash: hide until config arrives (errors still show).
    wrap.style.visibility = state.config || state.error ? "visible" : "hidden";

    var showLauncher = !hideLauncher && !state.open;
    var launcher = document.createElement("button");
    launcher.className = "launcher";
    launcher.type = "button";
    launcher.style.background = color();
    launcher.setAttribute("aria-label", "Open chat");
    launcher.textContent = "💬";
    launcher.addEventListener("click", function () {
      state.open = true;
      render();
      if (!state.config) {
        loadConfig();
      }
    });
    if (showLauncher) {
      wrap.appendChild(launcher);
    }

    var panel = document.createElement("div");
    panel.className = "panel" + (showLauncher ? "" : " panel-flush");
    panel.style.background = color();
    if (!state.open) panel.hidden = true;

    var header = document.createElement("div");
    header.className = "header";
    header.innerHTML =
      "<strong></strong><button class='close' type='button' aria-label='Close'>×</button>";
    header.querySelector("strong").textContent =
      (state.config && state.config.name) || "Chat";
    header.querySelector(".close").addEventListener("click", function () {
      state.open = false;
      render();
    });
    panel.appendChild(header);

    var messages = document.createElement("div");
    messages.className = "messages";
    messages.style.background = chatSurface();

    if (state.config && state.config.welcomeMessage) {
      var welcome = document.createElement("div");
      welcome.className = "bubble bot";
      welcome.textContent = state.config.welcomeMessage;
      messages.appendChild(welcome);
    }

    state.messages.forEach(function (msg) {
      var bubble = document.createElement("div");
      bubble.className = "bubble " + (msg.role === "user" ? "user" : "bot");
      if (msg.role === "user") bubble.style.background = color();
      bubble.textContent = msg.content;
      messages.appendChild(bubble);
    });

    if (state.streaming !== null) {
      var streamingBubble = document.createElement("div");
      streamingBubble.className = "bubble bot";
      streamingBubble.textContent = state.streaming || "…";
      messages.appendChild(streamingBubble);
    } else if (state.loading) {
      var thinking = document.createElement("div");
      thinking.className = "bubble system";
      thinking.textContent = "Thinking…";
      messages.appendChild(thinking);
    }

    panel.appendChild(messages);

    var footer = document.createElement("div");
    footer.className = "footer";

    if (state.error) {
      var err = document.createElement("p");
      err.className = "error";
      err.textContent = state.error;
      footer.appendChild(err);
    }

    var row = document.createElement("div");
    row.className = "row";
    var input = document.createElement("textarea");
    input.rows = 1;
    input.placeholder = "Ask a question…";
    input.disabled = state.loading || !state.config;
    if (state.draft) input.value = state.draft;
    var send = document.createElement("button");
    send.type = "button";
    send.className = "send";
    send.setAttribute("aria-label", "Send");
    send.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>';
    send.style.background = color();
    send.disabled = state.loading || !state.config;

    function fitComposer() {
      input.style.overflowY = "hidden";
      input.style.height = "44px";
      var scroll = input.scrollHeight;
      var next = Math.min(Math.max(scroll, 44), 120);
      input.style.height = next + "px";
      if (scroll > 120) {
        input.style.overflowY = "auto";
      }
    }

    function submit() {
      var text = (input.value || "").trim();
      if (!text || state.loading) return;
      state.draft = "";
      sendMessage(text);
    }

    send.addEventListener("click", submit);
    input.addEventListener("input", function () {
      state.draft = input.value;
      fitComposer();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });

    row.appendChild(input);
    row.appendChild(send);
    footer.appendChild(row);
    fitComposer();

    if (!state.config || state.config.showBranding !== false) {
      var brand = document.createElement("div");
      brand.className = "brand";
      brand.innerHTML =
        'Powered by <a href="' +
        apiBase +
        '" target="_blank" rel="noopener">Chatbot Builder</a>';
      footer.appendChild(brand);
    }

    panel.appendChild(footer);
    wrap.appendChild(panel);

    messages.scrollTop = messages.scrollHeight;

    try {
      window.dispatchEvent(
        new CustomEvent("chatbot-builder:visibility", {
          detail: { open: state.open },
        }),
      );
    } catch {
      /* ignore */
    }
  }

  function loadConfig() {
    fetch(apiBase + "/api/embed/" + encodeURIComponent(botId) + "/config")
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Failed to load bot");
          return data;
        });
      })
      .then(function (data) {
        state.config = data;
        state.error = "";
        root.style.display = "";
        wrap.style.display = "";
        wrap.style.visibility = "visible";
        render();
        try {
          window.dispatchEvent(new CustomEvent("chatbot-builder:ready"));
        } catch {
          /* ignore */
        }
      })
      .catch(function () {
        // Paused / missing bot — remove the widget entirely.
        state.config = null;
        state.error = "";
        state.open = false;
        wrap.innerHTML = "";
        root.style.display = "none";
        try {
          window.dispatchEvent(
            new CustomEvent("chatbot-builder:visibility", {
              detail: { open: false },
            }),
          );
        } catch {
          /* ignore */
        }
      });
  }

  function sendMessage(text) {
    state.loading = true;
    state.streaming = "";
    state.error = "";
    state.messages.push({ role: "user", content: text });
    saveHistory(state.messages);
    render();

    fetch(apiBase + "/api/embed/" + encodeURIComponent(botId) + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        sessionId: getSessionId(),
      }),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error((data && data.error) || "Request failed");
          });
        }
        if (!res.body || !res.body.getReader) {
          throw new Error("Streaming is not supported in this browser.");
        }

        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        var finalAnswer = "";
        var streamError = null;

        function handleEvent(event) {
          if (!event || !event.type) return;
          if (event.type === "delta" && typeof event.text === "string") {
            state.streaming = (state.streaming || "") + event.text;
            render();
            return;
          }
          if (event.type === "done" && typeof event.answer === "string") {
            finalAnswer = event.answer;
            state.streaming = event.answer;
            render();
            return;
          }
          if (event.type === "error") {
            streamError = event.message || "Request failed";
          }
        }

        function pump() {
          return reader.read().then(function (result) {
            if (result.done) return;
            buffer += decoder.decode(result.value, { stream: true });
            var parts = buffer.split("\n\n");
            buffer = parts.pop() || "";
            parts.forEach(function (chunk) {
              var lines = chunk.split("\n");
              for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf("data:") !== 0) continue;
                var payload = line.slice(5).trim();
                if (!payload) continue;
                try {
                  handleEvent(JSON.parse(payload));
                } catch {
                  /* ignore malformed chunk */
                }
              }
            });
            return pump();
          });
        }

        return pump().then(function () {
          if (streamError) throw new Error(streamError);
          if (!finalAnswer && state.streaming) finalAnswer = state.streaming;
          if (!finalAnswer) throw new Error("Empty assistant response.");
          state.messages.push({ role: "assistant", content: finalAnswer });
          saveHistory(state.messages);
        });
      })
      .catch(function (err) {
        state.error = err.message || "Something went wrong";
        state.messages.push({
          role: "assistant",
          content: "Sorry — I could not answer that right now.",
        });
        saveHistory(state.messages);
      })
      .finally(function () {
        state.loading = false;
        state.streaming = null;
        render();
      });
  }

  window.addEventListener("chatbot-builder:open", function () {
    state.open = true;
    state.error = "";
    render();
    if (!state.config) {
      loadConfig();
    }
  });

  render();
  loadConfig();
})();
