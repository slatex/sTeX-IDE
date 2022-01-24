import * as vscode from 'vscode';

var webviewer : vscode.WebviewPanel | undefined;

export async function viewer(mode?: string) {
	console.log('Viewer: ' + mode);
	if (!webviewer) {
		webviewer = vscode.window.createWebviewPanel(
			'stexPreview',
			'sTeX HTML Preview',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				enableCommandUris: true,
				
				//localResourceRoots
			}
		  );
		webviewer.onDidDispose(() => {
			webviewer = undefined;
		});
	}
}


export function updateHTML(msg:HTMLUpdateMessage) {
	console.log("HTML Return: " + msg.html);
	webviewer?.dispose();
	viewer(undefined);
	if (webviewer) { 
		webviewer.webview.html = 
		"<iframe width=\"100%\" height=650px\" src=\"" + msg.html + "\" title=\"Preview\" style=\"background:white\"></iframe>";
	}
}


export class HTMLUpdateMessage {
    html : string;

	constructor(html : string) {
		this.html = html;
	}
}