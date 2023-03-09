'use strict';
import { Console } from "console";
import * as path from "path";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { extensions, commands, Uri, window, RelativePattern, ExtensionContext, workspace } from 'vscode';
import { GitExtension } from './git';
const fs = require('fs');
import Timer from './Timer';


let timer: Timer;
let gitBranch: string | undefined;
let gitpath: string | undefined;
let jsonPath: string | undefined;
export var data = JSON.parse("{}");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  const provider = new ColorsViewProvider(context.extensionUri);

	context.subscriptions.push(
		window.registerWebviewViewProvider(ColorsViewProvider.viewType, provider));

	context.subscriptions.push(
	commands.registerCommand('calicoColors.addColor', () => {
			provider.addColor();
		}));

	context.subscriptions.push(
		commands.registerCommand('calicoColors.clearColors', () => {
			provider.clearColors();
		}));
  const workspacePath = workspace.workspaceFolders![0].uri.path;
  gitpath = path.join(workspacePath, ".git");
  const gitIgnore = path.join(workspacePath, ".gitignore")
  jsonPath = path.join(workspacePath, ".vscode/branch-timer.json");
  gitBranch = getCurrentGitBranch(Uri.parse(gitpath));

  fs.appendFile(gitIgnore, '.vscode/branch-timer.json', function (err:any) {
    if (err){
      console.log(err);
    }
    console.log('Saved!');
  });
  timer = new Timer(gitBranch!);
  if (fs.existsSync(jsonPath)) {
    var jsonFile: string = fs.readFileSync(jsonPath, 'utf8');
    data = JSON.parse(jsonFile);
    timer.total = data[gitBranch!] ?? 0;
  }
  const pattern = new RelativePattern(gitpath, "HEAD");
  const watcher = workspace.createFileSystemWatcher(pattern, false, false);
  watcher.onDidCreate(e => {
    updateBranch();
    console.log(".git/HEAD create detected");
  });
  watcher.onDidChange(e => {
    updateBranch();
    console.log(".git/HEAD change detected");
  });
  workspace.onDidChangeConfiguration(e => {
    updateBranch();
    console.log("Configuration change detected");
  });

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let startTimer = commands.registerCommand('extension.startTimer', () => {
    timer.start();
  });
  let showTimer = commands.registerCommand('extension.showTimer', () => {
    timer.showTimer();
  });
  let stopTimer = commands.registerCommand('extension.stopTimer', () => {
    timer.stop();
  });
  let copyTimer = commands.registerCommand('extension.copyTimer', () => {
    timer.copyTimer();
  });

  context.subscriptions.push(showTimer);
  context.subscriptions.push(stopTimer);
  context.subscriptions.push(copyTimer);
  context.subscriptions.push(startTimer);
}

function updateBranch() {
  data[gitBranch!] = timer.total;
  gitBranch = getCurrentGitBranch(Uri.parse(gitpath!));
  timer.stop();
  timer.branchName = gitBranch;
  timer.total = data[gitBranch!] ?? 0;
  var jsonData = JSON.stringify(data);
  fs.writeFile(jsonPath, jsonData, (error: any) => {
    if (error) {
      console.log('An error has occurred ', error);
      return;
    }
    console.log('Data written successfully to disk', gitBranch);
  });
  timer.start();
}
// this method is called when your extension is deactivated
export function deactivate() {
  updateBranch();
}

function getCurrentGitBranch(docUri: Uri): string | undefined {
  console.debug("Git branch requested for document", docUri);

  const extension = extensions.getExtension<GitExtension>("vscode.git");
  if (!extension) {
    console.warn("Git extension not available");
    return undefined;
  }
  if (!extension.isActive) {
    console.warn("Git extension not active");
    return undefined;
  }

  // "1" == "Get version 1 of the API". Version one seems to be the latest when I
  // type this.
  const git = extension.exports.getAPI(1);

  const repository = git.repositories[0];
  console.log(git.repositories);
  if (!repository) {
    console.warn("No Git repository for current document", docUri);
    return undefined;
  }

  const currentBranch = repository.state.HEAD;
  if (!currentBranch) {
    console.warn("No HEAD branch for current document", docUri);
    return undefined;
  }

  const branchName = currentBranch.name;
  if (!branchName) {
    console.warn("Current branch has no name", docUri, currentBranch);
    return undefined;
  }

  console.debug("Current branch name", branchName);
  return branchName;
}


function addToGitIgnore(workspacePath: string) {
  var branchTimerPath = '.vscode/branch-timer.json';
  const gitIgnore = path.join(workspacePath, ".gitignore")
  if (fs.existsSync(gitIgnore)) {
    var gitIgnoreFile: string = fs.readFileSync(gitIgnore, 'utf8');
    if (!gitIgnoreFile.includes(branchTimerPath)) {
      fs.appendFile(gitIgnore, branchTimerPath, function (err: any) {
        if (err) {
          console.log(err);
        }
        console.log('Added branch timer file to gitignore!');
      });
    } else {
      console.log("Already Added");
    }
  }
}




class ColorsViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'calicoColors.colorsView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
						break;
					}
			}
		});
	}

	public addColor() {

		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage({ type: 'addColor' });
		}
	}

	public clearColors() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'clearColors' });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();
    var table = `<table>
    <tr>
      <th>Branch</th>
      <th>Duration</th> 
    </tr>`;
    for (let key in data) {
      let value = data[key];
      table+=` <tr>
      <td>${key}</td>
      <td>${value}</td>
    </tr>`;

      // Use `key` and `value`
  }
  table+=`</table>`;

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<title>Cat Colors</title>
			</head>
			<body>
				${table}
				<button class="add-color-button">Refresh</button>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
