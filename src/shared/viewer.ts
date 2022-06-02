import * as vscode from "vscode";

var webviewer : vscode.WebviewPanel | undefined;

export async function viewer() {
    if (!webviewer) {
        webviewer = vscode.window.createWebviewPanel(
            "sTeXPreview",
            "sTeX HTML Preview",
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                enableCommandUris:true
            }
        );
        webviewer.onDidDispose(() => webviewer = undefined);
    }
}

export class HTMLUpdateMessage {
    html: string;
    constructor(html : string) {this.html = html;}
}

export function updateHTML(msg : HTMLUpdateMessage) {
    viewer().then(() => {
        if (webviewer) {
            webviewer.webview.html = '<iframe width="100%" height="650px" src="' +
              msg.html + '" title="Preview" style="background:white"></iframe>';
        }
    });
}