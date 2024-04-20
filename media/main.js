// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  document.querySelector(".refresh-button").addEventListener("click", () => {
    vscode.postMessage({ type: "refresh" });
  });
  for (const element of document.querySelectorAll(".copy-button")) {
    element.addEventListener("click", () => {
      vscode.postMessage({ type: "copy", value: element.id });
    });
  }
  document.querySelector("#api-key-login").addEventListener("click", () => {
    const apiKey = document.querySelector("#api-key-input").value;
    vscode.postMessage({ type: "saveApiKey", value: apiKey });
  });
})();
