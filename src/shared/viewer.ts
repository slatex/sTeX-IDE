import * as vscode from "vscode";

export class HtmlPreviewWindow {
  currentUrl?: string;
  private webview?: vscode.WebviewPanel;
  
  createIfNecessary(): void {
    if (!this.webview) {
      this.webview = vscode.window.createWebviewPanel(
        "sTeXPreview",
        "sTeX HTML Preview",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          enableCommandUris: true,
        }
      );
      this.webview.onDidDispose(() => {
        this.webview = undefined;
      });
    }
  }

  updateHtml(msg: HTMLUpdateMessage): void {
    this.createIfNecessary();
    this.currentUrl = msg.html;
    this.webview!.webview.html = /* html */ `
<!DOCTYPE html>
<html>
  <head></head>
  <body>
    <iframe width="100%" height="650px" frameborder="0" src="${this.currentUrl}" title="Preview" style="background:white"></iframe>
  </body>
</html>`;
  }
}

export type HTMLUpdateMessage = {
  html: string;
};
