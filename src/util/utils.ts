import { spawn,exec } from "child_process";
import * as path from "path";
import { promisify } from "util";
import * as vscode from 'vscode';

const execPromise = promisify(exec);

export async function call_cmd(cmd:string,args:string[]) : Promise<string | undefined> {
  try {
    const wsf = vscode.workspace.workspaceFolders;
    const cwd = wsf? wsf[0].uri.fsPath : "";
    const {stdout} = await execPromise(cmd + " " + args.join(" "),{ env: process.env, cwd});
    return stdout.trim()
  } catch (error) {
    return undefined;
  }
}

export function getMathhubEnvConfigPath(): string {
  return path.join((process.env.HOME || process.env.USERPROFILE) as string, ".stex", "mathhub.path");
}

export function openHTML(src:string):vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel('webviewPanel','Preview',vscode.ViewColumn.Beside,{
    enableScripts: true,
    enableForms:true     
  });
  panel.webview.html = iFrame(src);
  return panel;
}

export function iFrame(src:string):string {
  return `
<!DOCTYPE html>
<html>
  <head></head>
  <body style="padding:0;width:100vw;height:100vh;overflow:hidden;">
    <iframe style="width:100vw;height:100vh;overflow:hidden;" src="${src}" title="Preview" style="background:white"></iframe>
  </body>
</html>`
}