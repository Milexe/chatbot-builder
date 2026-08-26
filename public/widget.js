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
    } catch (e) {
      return uuid();
    }
  }

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(messages) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
    } catch (e) {
      /* ignore quota */
    }
  }

  var state = {
    open: false,
    loading: false,
    config: null,
    messages: loadHistory(),
    error: "",
  };

  var root = document.createElement("div");
  root.id = "chatbot-builder-widget-root";
  document.body.appendChild(root);
  var shadow = root.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent = [
    ":host, * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }",
    ".wrap { position: fixed; z-index: 2147483000; right: 20px; bottom: 20px; }",
    ".launcher { width: 56px; height: 56px; border: 0; border-radius: 999px; color: #fff; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.25); font-size: 22px; }",
    ".panel { position: absolute; right: 0; bottom: 68px; width: min(380px, calc(100vw - 24px)); height: min(560px, calc(100vh - 100px)); background: #fff; color: #111; border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,.28); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(0,0,0,.08); }",
    ".panel[hidden] { display: none !important; }",
    ".header { padding: 14px 16px; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
    ".header strong { font-size: 15px; }",
    ".close { background: transparent; border: 0; color: inherit; font-size: 20px; cursor: pointer; line-height: 1; }",
    ".messages { flex: 1; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #f7f7f8; }",
    ".bubble { max-width: 85%; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }",
    ".bubble.bot { align-self: flex-start; background: #fff; border: 1px solid rgba(0,0,0,.06); }",
    ".bubble.user { align-self: flex-end; color: #fff; }",
    ".bubble.system { align-self: center; background: transparent; color: #666; font-size: 12px; }",
    ".footer { padding: 10px; border-top: 1px solid rgba(0,0,0,.08); background: #fff; }",
    ".row { display: flex; gap: 8px; }",
    ".row textarea { flex: 1; resize: none; min-height: 44px; max-height: 96px; border-radius: 10px; border: 1px solid rgba(0,0,0,.15); padding: 10px; font: inherit; }",
    ".row button { border: 0; border-radius: 10px; color: #fff; padding: 0 14px; cursor: pointer; font-weight: 600; }",
    ".row button:disabled { opacity: .6; cursor: default; }",
    ".brand { margin-top: 8px; text-align: center; font-size: 11px; color: #888; }",
    ".brand a { color: inherit; }",
    ".error { color: #b91c1c; font-size: 12px; margin: 0 0 8px; }",
  ].join("\n");
  shadow.appendChild(style);

  var wrap = document.createElement("div");
  wrap.className = "wrap";
  shadow.appendChild(wrap);

  function color() {
    return (state.config && state.config.primaryColor) || "#111827";
  }

  function render() {
    wrap.innerHTML = "";

    // Avoid a default-color flash: hide until config arrives (errors still show).
    wrap.style.visibility = state.config || state.error ? "visible" : "hidden";

    var launcher = document.createElement("button");
    launcher.className = "launcher";
    launcher.type = "button";
    launcher.style.background = color();
    launcher.setAttribute("aria-label", state.open ? "Close chat" : "Open chat");
    launcher.textContent = state.open ? "×" : "💬";
    launcher.addEventListener("click", function () {
      state.open = !state.open;
      render();
      if (state.open && !state.config) {
        loadConfig();
      }
    });
    wrap.appendChild(launcher);

    var panel = document.createElement("div");
    panel.className = "panel";
    if (!state.open) panel.hidden = true;

    var header = document.createElement("div");
    header.className = "header";
    header.style.background = color();
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

    if (state.loading) {
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
    input.rows = 2;
    input.placeholder = "Ask a question…";
    input.disabled = state.loading || !state.config;
    var send = document.createElement("button");
    send.type = "button";
    send.textContent = "Send";
    send.style.background = color();
    send.disabled = state.loading || !state.config;

    function submit() {
      var text = (input.value || "").trim();
      if (!text || state.loading) return;
      sendMessage(text);
    }

    send.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });

    row.appendChild(input);
    row.appendChild(send);
    footer.appendChild(row);

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
        render();
      })
      .catch(function (err) {
        state.error = err.message || "Failed to load bot";
        render();
      });
  }

  function sendMessage(text) {
    state.loading = true;
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
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Request failed");
          return data;
        });
      })
      .then(function (data) {
        state.messages.push({ role: "assistant", content: data.answer });
        saveHistory(state.messages);
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
        render();
      });
  }

  render();
  loadConfig();
})();
