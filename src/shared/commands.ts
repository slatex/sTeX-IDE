import * as vscode from 'vscode';
import * as language from 'vscode-languageclient/node';
import { CancellationToken, integer, NotificationType0 } from 'vscode-languageclient/node';
import { STeXContext } from './context';
import { MathHubTreeProvider, MHTreeItem } from './mathhub';
import { SearchPanel } from './search';

export interface InstallMessage {
	archive: string
}

interface BuildMessage {
	file:string
}

export function registerCommands(context: STeXContext) {
    context.vsc.subscriptions.push(vscode.commands.registerCommand('stexide.info', () => {
		vscode.window.showInformationMessage('Hello World from sTeXWeb!');
	}));
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.openFile", arg => {
		vscode.window.showTextDocument(arg);
	}));
	/*context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.insertCode", (str:string,startl:integer,startch:integer,endl:integer,endch:integer) => 
  {
		vscode.window.activeTextEditor?.edit(eb => eb.replace(
      new vscode.Range(new vscode.Position(startl,startch),new vscode.Position(endl,endch)),str
    ));
	}));*/
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.mathhub.install", arg => {
		if (context.mathhub) {context.mathhub.roots = []; context.mathhub.update();}
		context.client?.sendNotification(new language.ProtocolNotificationType<InstallMessage,void>("sTeX/installArchive"),{archive:(<MHTreeItem>arg).path});
	}));
	vscode.window.registerTreeDataProvider("stexidemathhub",new MathHubTreeProvider(context));
	vscode.window.registerWebviewViewProvider("stexidesearch",new SearchPanel(context));
	vscode.window.registerWebviewViewProvider("stexidetools",new ToolsPanel(context));

	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.build", arg => {
		context.client?.sendNotification(new language.ProtocolNotificationType<BuildMessage,void>("sTeX/buildFile"),
			{file:(<vscode.Uri>arg).toString()});
	}));
}


class ToolsPanel implements vscode.WebviewViewProvider {
    constructor(private scontext:STeXContext) {}
    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: CancellationToken): Thenable<void> | void {
      webviewView.webview.options = {
        enableScripts: true,
        enableForms:true     
      };
      const tkuri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(
        this.scontext.vsc.extensionUri,
          /*"node_modules",
          "@vscode",
          "webview-ui-toolkit",
          "dist",
          "toolkit.js"*/
          "resources","toolkit.min.js"
      ));
      const cssuri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(
        this.scontext.vsc.extensionUri,
          /*"node_modules",
          "@vscode/codicons",
          "dist",
          "codicon.css"*/
          "resources","codicon.css"
      ));
      webviewView.webview.onDidReceiveMessage(msg => {
        switch (msg.command) {
          case "quickparse":
			this.scontext.client?.sendNotification(new NotificationType0("sTeX/parseWorkspace"));
		}
      });
      //this.scontext.outputChannel.appendLine("Values: " + tkuri.toString() + ", " + cssuri.toString());
      webviewView.webview.html = toolhtml(tkuri,cssuri);
    }
}


function toolhtml(tkuri:vscode.Uri,cssuri:vscode.Uri) { return `
<!DOCTYPE html>
<html>
<head>
  <link href="${cssuri}" rel="stylesheet"/>
  <script type="module" src="${tkuri}"></script>
</head>
<body>
  <vscode-button onclick="quickparse_workspace()">Quickparse Workspace</vscode-button>
  
<script>
const vscode = acquireVsCodeApi();

function quickparse_workspace() {
  vscode.postMessage({
    command: "quickparse"
  });
}
</script>

</body>
</html>
        `;
}