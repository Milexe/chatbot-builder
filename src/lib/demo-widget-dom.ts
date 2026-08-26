/** Tear down landing/demo embed scripts + shadow roots (Strict Mode / route changes). */
export function removeChatbotBuilderWidgetDom() {
  document
    .querySelectorAll(
      "script[data-cbb-demo-widget='true'], script[src*='widget.js'][data-bot-id]",
    )
    .forEach((node) => node.remove());
  document
    .querySelectorAll("#chatbot-builder-widget-root")
    .forEach((node) => node.remove());
}
