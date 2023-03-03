import * as vscode from "vscode";
import { iFrame } from "../util/utils";

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
    this.webview!.webview.html = "Loading"; // <- necessary hack to trigger a reload if this.currentUrl's content has changed!
    this.webview!.webview.html = iFrame(this.currentUrl);
  }
}

export type HTMLUpdateMessage = {
  html: string;
};
