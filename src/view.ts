import * as vscode from "vscode";
import { data, gitBranch } from "./extension";
import { secondsToHms, zeroBase } from "./timer";
import { checkApiKey } from "./api";
import { warn } from "console";
const fs = require("fs");

export class ColorsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "branches.timers";
  config = vscode.workspace.getConfiguration('branchTimer');
  private _view?: vscode.WebviewView;
  constructor(private readonly _extensionUri: vscode.Uri) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (data) => {
      warn(data);
      if (data.type === "copy") {
        vscode.env.clipboard.writeText(data.value);
        vscode.window.showInformationMessage("Duration Copied : " + data.value);
      } else if (data.type === "refresh") {
        this.updateHtml();
      } else if (data.type === "session") {
        const apiKey = this.config.inspect("apiKey")?.globalValue;
        if (apiKey) {
          this.config.update('apiKey', "", vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage("Logged out successfully");
          this.updateHtml();
        } else {
          if (await checkApiKey(data.value)) {
            this.config.update('apiKey', data.value, vscode.ConfigurationTarget.Global);
            this.updateHtml();
            vscode.window.showInformationMessage("API Key Saved Successfully");
          } else {
            vscode.window.showErrorMessage("Invalid API Key");
          }
        }
      } else if (data.type === "helpApiKey") {
        vscode.env.openExternal(vscode.Uri.parse("https://www.example.com/api-key-instructions"));
      }
    });
  }
  public updateHtml() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
    );

    const apiKey = this.config.inspect("apiKey")?.globalValue;
    var loginItems = `<button id="api-key-session">Logout</button>`;

    if (!apiKey) {
      loginItems = `
             <div class="col">
                <label for="api-key-input">API Key : <a id="api-key-help">How get branch timer api key</a></label>
                <div class="row">
                  <input type="text" id="api-key-input"/>
                  <button id="api-key-session" type="button">Login</button>
                </div>
            </div>
      `;
    }

    const nonce = getNonce();
    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource
      }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<title>Branches duration</title>
			</head>
			<body>
      ${loginItems}
      <div class="chart-container">
        <svg id="chart" viewBox="0 0 100 100"></svg>
        <div id="tooltip" class="tooltip"></div>
      </div>
      <button class="refresh-button active">Refresh</button>
      <script nonce="${nonce}" src="${scriptUri}"></script>
      <script nonce="${nonce}">
        const data = ${JSON.stringify(data)};
        const total = Object.values(data).reduce((acc, value) => acc + value, 0);
        const chart = document.getElementById('chart');
        const tooltip = document.getElementById('tooltip');

        const createChart = () => {
          let startAngle = 0;
          let endAngle = 0;

          for (let key in data) {
            const value = data[key];
            const percent = (value / total) * 100;
            endAngle += (percent / 100) * 360;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('fill', getRandomColor());
            path.setAttribute('d', describeArc(50, 50, 45, startAngle, endAngle));
            path.setAttribute('data-branch', key);
            path.setAttribute('data-percent', percent.toFixed(2));

            path.addEventListener('mouseover', showTooltip);
            path.addEventListener('mouseout', hideTooltip);

            chart.appendChild(path);

            startAngle = endAngle;
          }
        };

        const describeArc = (x, y, radius, startAngle, endAngle) => {
          const start = polarToCartesian(x, y, radius, endAngle);
          const end = polarToCartesian(x, y, radius, startAngle);
          const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

          const d = [
            'M', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            'L', x, y,
            'L', start.x, start.y
          ].join(' ');

          return d;
        };

        const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
          const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

          return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
          };
        };

        const getRandomColor = () => {
          const letters = "0123456789ABCDEF";
          let color = "#";
          for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
          }
          color += "80";
        
          return color;
        };

        const showTooltip = (event) => {
          const branch = event.target.getAttribute('data-branch');
          const percent = event.target.getAttribute('data-percent');
          const tooltipText = branch + " | " + percent + "%";

          tooltip.textContent = tooltipText;
          tooltip.style.display = 'block';
          tooltip.style.left = (event.pageX + 10) + 'px';
          tooltip.style.top = (event.pageY + 10) + 'px';
        };

        const hideTooltip = () => {
          tooltip.style.display = 'none';
        };

        createChart();
      </script>
    </div>
      ${buildTable()}
      </div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
function buildTable() {
  var table = `<table>
	<tr>
	  <th>Branch</th>
	  <th>Duration</th>
	  <th>Percent</th>
	</tr>`;
  var total = 0;
  for (let key in data) {
    let value = data[key];
    total += value;
  }
  for (let key in data) {
    let value = data[key];
    var t = secondsToHms(value);
    var className = gitBranch?.toString() === key ? "active" : "";
    table += ` <tr class=${className}>
	  <td>${key}</td>
	  <td class="duration">${zeroBase(t.h)}:${zeroBase(t.m)}:${zeroBase(t.s)}</td>
	  <td> ${((value / total) * 100).toFixed(2)}%</td>
	  <td><button class="copy-button active" id="${key} : ${zeroBase(t.h)}:${zeroBase(
      t.m
    )}:${zeroBase(t.s)}">Copy</button></td>
	  </tr>`;
  }
  table += `</table>`;
  return table;
}
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
