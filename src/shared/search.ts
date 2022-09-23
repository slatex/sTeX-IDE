import * as vscode from 'vscode';
import * as language from 'vscode-languageclient/node';
import { CancellationToken, ProtocolRequestType, ProtocolRequestType0 } from 'vscode-languageclient';
import { STeXContext } from './context';
import { InstallMessage } from './commands';
import { MHTreeItem } from './mathhub';

interface LSPSearchResult {
  archive:String;
  sourcefile:String;
  local:Boolean;
  html:String;
  fileuri:String|null;
}
interface LSPSearchResults {
  locals:LSPSearchResult[];
  remotes:LSPSearchResult[];
}
interface SearchParams {
  query : String;
  defis : Boolean;
  asserts:Boolean;
  exs: Boolean;
}

export class SearchPanel implements vscode.WebviewViewProvider {
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
          case "search":
            let params : SearchParams = {
              query:msg.text,
              defis:msg.searchtype === "defs",
              asserts:msg.searchtype === "ass",
              exs:msg.searchtype === "ex"
            };
            let ret = this.scontext.client?.sendRequest(new ProtocolRequestType<SearchParams,LSPSearchResults,any,any,any>("sTeX/search",),
              params
            );
            ret?.then(res => {
              var loc : string = "";
              if (res.locals.length > 0) {
                res.locals.forEach(l => {
                  loc += htmlResult(l,'openFile(\'' + l.fileuri + '\')',"open");
                });
              }
              var rem : string = "";
              if (res.remotes.length > 0) {
                res.remotes.forEach(l => {
                  rem += htmlResult(l,'installArchive(\'' + l.archive + '\')',"install");
                });
              }
              webviewView.webview.postMessage({html: htmlResults(loc, rem, res.locals.length, res.remotes.length)});
            });
            break;
          case "open":
            vscode.window.showTextDocument(vscode.Uri.parse(msg.uri));
            break;
          case "install": 
            if (this.scontext.mathhub) {this.scontext.mathhub.roots = []; this.scontext.mathhub.update();}
            this.scontext.client?.sendNotification(new language.ProtocolNotificationType<InstallMessage,void>("sTeX/installArchive"),{archive:msg.archive});
            break;
        }
      });
      //this.scontext.outputChannel.appendLine("Values: " + tkuri.toString() + ", " + cssuri.toString());
      webviewView.webview.html = searchhtml(tkuri,cssuri);
    }
}

function htmlResult(res:LSPSearchResult,link:string,label:string) {
  return `
<div class="result">
  <i><b>[${res.archive}] ${res.sourcefile}</b></i>
  <vscode-button onclick="${link}" appearance="secondary">${label}</vscode-button>
</div>
<iframe frameborder="0" src="${res.html}"></iframe>`;
}

function htmlResults(locals: string, remotes: string, numLocals: number, numRemotes: number) { return `
<div id="stex-searchlocal" class="result-container">
  <details open>
    <summary>Local <vscode-badge>${numLocals}</vscode-badge></summary>
    ${locals}
  </details>
</div>
<vscode-divider role="separator"></vscode-divider>
<div id="stex-searchglobal" class="result-container">
  <details open>
    <summary>Remote <vscode-badge>${numRemotes}</vscode-badge></summary>
    ${remotes}
  </details>
</div>`;
}
/* 
  <tr><td style="border:1px solid">narf</td></tr>
*/

function searchhtml(tkuri:vscode.Uri,cssuri:vscode.Uri) { return `
<!DOCTYPE html>
<html>
<head>
  <link href="${cssuri}" rel="stylesheet"/>
  <script type="module" src="${tkuri}"></script>
  <style>
    details {
      cursor: pointer;
    }
    #stex-search-results iframe {
      background-color: white;
      width: 100%;
    }
    #stex-search-results .result-container {
      display: flex;
      flex-direction: column;
      margin: 8px 0;
    }
    #stex-search-results .result {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin: 12px 0 8px 0;
    }
    vscode-divider {
      margin: 16px 0;
    }
  </style>
</head>
<body>
<vscode-text-field size="50" id="search-field">
  <span slot="start" class="codicon codicon-search"></span>
  Search sTeX Content
</vscode-text-field>
<vscode-radio-group id="searchtype">
  <vscode-radio id="searchall" value="all" checked>Anywhere</vscode-radio>
  <vscode-radio id="searchdefs" value="defs">Definitions</vscode-radio>
  <vscode-radio id="searchass" value="ass">Assertions</vscode-radio>
  <vscode-radio id="searchex" value="ex">Examples</vscode-radio>
</vscode-radio-group>
<vscode-divider role="separator"></vscode-divider>
<div id="stex-search-results"></div>
<script>
console.log("here");
const vscode = acquireVsCodeApi();
let searchfield = document.getElementById("search-field");
let resultfield = document.getElementById("stex-search-results");
let searchtype = document.getElementById("searchtype");
searchfield.addEventListener("keyup", runsearch);
let timeout = null;
function runsearch() {
  if (timeout) {
    window.clearTimeout(timeout);
  }
  timeout = window.setTimeout(function(){ dosearch();}, 500);
}
function dosearch() {
  window.clearTimeout(timeout);
  resultfield.innerHTML = "<vscode-progress-ring></vscode-progress-ring>";
  vscode.postMessage({
    command: "search",
    text: searchfield.value,
    searchtype: searchtype.value
  });
}
function openFile(s) {
  vscode.postMessage({
    command: "open",
    uri:s
  });
}
function installArchive(s) {
  vscode.postMessage({
    command: "install",
    archive:s
  });
}
window.addEventListener('message', event => {
  const msg = event.data;
  resultfield.innerHTML = msg.html;
})
</script>

</body>
</html>
        `;
}