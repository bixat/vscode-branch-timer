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
  document.getElementById("api-key-session").addEventListener("click", () => {
    const apiKey = document.querySelector("#api-key-input")
      ? document.querySelector("#api-key-input").value
      : "";
    vscode.postMessage({ type: "session", value: apiKey });
  });

  document
    .getElementById("api-key-help")
    .addEventListener("click", function () {
      vscode.postMessage({ type: "helpApiKey", value: "" });
    });
})();
