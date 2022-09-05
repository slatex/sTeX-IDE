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
                  loc += htmlResult(l,'openFile("' + l.fileuri + '")',"open");
                });
              }
              var rem : string = "";
              if (res.remotes.length > 0) {
                res.remotes.forEach(l => {
                  rem += htmlResult(l,'installArchive("' + l.archive + '")',"install");
                });
              }
              webviewView.webview.postMessage({html:htmlResults(loc,rem)});
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
<tr><td><table width="100%"><tr>
  <td style="text-align:left;"><i><b>[${res.archive}]${res.sourcefile}</b></i><td>
  <td style="text-align:right;">
    <vscode-button onclick='${link}'>${label}</vscode-button>
  <td>
</tr></table></td></tr>
<tr><td style="border:1px solid;">
  <iframe width="100%" src="${res.html}"></iframe>
</td></tr>`;
}

function htmlResults(locals : string,remotes:string) { return `
<table id="stex-searchlocal" style="width:100%">
  <tr><th><vscode-tag>Local</vscode-tag></th></tr>
  ${locals}
</table>
<table id="stex-searchglobal" style="width:100%">
  <tr><th><vscode-tag>Remote</vscode-tag></th></tr>
  ${remotes}
</table>
`;}
/* 
  <tr><td style="border:1px solid">narf</td></tr>
*/

function searchhtml(tkuri:vscode.Uri,cssuri:vscode.Uri) { return `
<!DOCTYPE html>
<html>
<head>
  <link href="${cssuri}" rel="stylesheet"/>
  <script type="module" src="${tkuri}"></script>
</head>
<body>
<vscode-text-field size="50" id="searchfield">Search sTeX Content<span slot="start" class="codicon codicon-search"></span></vscode-text-field>
<br/>
<vscode-radio-group id="searchtype">
  <vscode-radio id="searchall" value="all" checked>Anywhere</vscode-radio>
  <vscode-radio id="searchdefs" value="defs">Definitions</vscode-radio>
  <vscode-radio id="searchass" value="ass">Assertions</vscode-radio>
  <vscode-radio id="searchex" value="ex">Examples</vscode-radio>
</vscode-radio-group>
<div id="stex-searchresults">
</div>
<script>
const vscode = acquireVsCodeApi();
let searchfield = document.getElementById("searchfield");
let resultfield = document.getElementById("stex-searchresults");
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
  resultfield.innerHTML = "<vscode-divider></vscode-divider><vscode-progress-ring></vscode-progress-ring>";
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