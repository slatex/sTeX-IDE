import * as vscode from 'vscode';
import * as language from 'vscode-languageclient/node';
import { CancellationToken, NotificationType0, ProtocolNotificationType } from 'vscode-languageclient/node';
import { STeXContext } from './context';
import { MathHubTreeProvider, MHTreeItem } from './mathhub';
import { SearchPanel } from './search';

export interface InstallMessage {
	archive: string
}

export interface BuildMessage {
	file:string
}

export function registerCommands(context: STeXContext) {
    context.vsc.subscriptions.push(vscode.commands.registerCommand('stexide.info', () => {
		vscode.window.showInformationMessage('Hello World from sTeXWeb!');
	}));
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.openFile", arg => {
		vscode.window.showTextDocument(arg);
	}));
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.openSettings", (arg) => {
		vscode.commands.executeCommand("workbench.action.openSettings", `@ext:${context.vsc.extension.id}`);
	}));
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.openInBrowser", (arg) => {
		if (context.htmlPreview.currentUrl) {
			vscode.env.openExternal(vscode.Uri.parse(context.htmlPreview.currentUrl));
		} else {
			vscode.window.showInformationMessage("No preview found, build first.")
		}
	}));
	/*context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.insertCode", (str:string,startl:integer,startch:integer,endl:integer,endch:integer) => 
  {
		vscode.window.activeTextEditor?.edit(eb => eb.replace(
      new vscode.Range(new vscode.Position(startl,startch),new vscode.Position(endl,endch)),str
    ));
	}));*/
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.mathhub.install", (arg: MHTreeItem) => {
		context.mathhubtreeprovider?.installArchive(arg.path);
	}));
	vscode.window.registerTreeDataProvider("stexidemathhub",new MathHubTreeProvider(context));
	vscode.window.registerWebviewViewProvider("stexidesearch",new SearchPanel(context));
	vscode.window.registerWebviewViewProvider("stexidetools",new ToolsPanel(context));

	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.build", arg => {
		context.client?.sendNotification(new language.ProtocolNotificationType<BuildMessage,void>("sTeX/buildFile"),
			{file:(<vscode.Uri>arg).toString()});
	}));
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.buildhtml", arg => {
		context.client?.sendNotification(new language.ProtocolNotificationType<BuildMessage,void>("sTeX/buildHTML"),
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
            break;
          case "newarchive":
            vscode.window.showInputBox({
              prompt:"Insert the name of a new math archive here.",
              password:false,
              title:"New Math Archive",
              placeHolder:"My/Archive/Name",
              validateInput(value) {
                return undefined // TODO
              },
            }).then(value => {
              if (value !== undefined) { 
                this.scontext.client?.sendNotification(new ProtocolNotificationType<InstallMessage, void>("sTeX/initializeArchive"), { archive:value });
              }
            });
            break;
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
<div style="text-align:center">
  <vscode-button onclick="new_archive()">New sTeX Archive</vscode-button>
  <vscode-divider role="separator"></vscode-divider>
  <vscode-button onclick="quickparse_workspace()">Quickparse Workspace</vscode-button>
</div>
<script>
const vscode = acquireVsCodeApi();

function quickparse_workspace() {
  vscode.postMessage({
    command: "quickparse"
  });
}

function new_archive() {
  vscode.postMessage({
    command: "newarchive"
  });
}
</script>

</body>
</html>
        `;
}