//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();
   
    document.querySelector('.save-button').addEventListener('click', () => {
        var items = [];
         var estimations = document.querySelectorAll('.estimation');
         estimations.forEach((item) => {
            items.push(item.value);
          });
        vscode.postMessage({ type: 'save', value: items });
    });
}());

