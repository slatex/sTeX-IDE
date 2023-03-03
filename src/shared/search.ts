import * as vscode from 'vscode';
import * as language from 'vscode-languageclient/node';
import { CancellationToken, ProtocolRequestType, ProtocolRequestType0 } from 'vscode-languageclient';
import { STeXContext } from './context';
import { InstallMessage } from './commands';
import { MHTreeItem } from './mathhub';
import { iFrame } from '../util/utils';

interface LSPSearchResult {
  archive:String;
  sourcefile:String;
  local:Boolean;
  html:String;
  fileuri:String|null;
  module:String|null;
  preview:String;
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
  syms: Boolean;
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
          "resources","toolkit.min.js"
      ));
      const cssuri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(
        this.scontext.vsc.extensionUri,
          "resources","codicon.css"
      ));
      webviewView.webview.onDidReceiveMessage(msg => {
        switch (msg.command) {
          case "search":
            let params : SearchParams = {
              query:msg.text,
              defis:msg.searchtype === "defs",
              asserts:msg.searchtype === "ass",
              exs:msg.searchtype === "ex",
              syms:msg.searchtype === "syms"
            };
            let ret = this.scontext.client?.sendRequest(new ProtocolRequestType<SearchParams,LSPSearchResults,any,any,any>("sTeX/search",),
              params
            );
            ret?.then(res => {
              var loc : string = "";
              if (res.locals.length > 0) {
                res.locals.forEach(l => {
                  if (l.module === null || l.module === undefined) {
                    loc += htmlResult2(l,'preview(\'' + l.preview + '\')',"preview",'openFile(\'' + l.fileuri + '\')',"open");
                  } else {
                    loc += htmlResult3(l,'preview(\'' + l.preview + '\')',"preview",'openFile(\'' + l.fileuri + '\')',"open",'adduse(\'' + l.archive + '\',\'' + l.module + '\')',"use");
                  }
                });
              }
              var rem : string = "";
              if (res.remotes.length > 0) {
                res.remotes.forEach(l => {
                  rem += htmlResult3(l,'preview(\'' + l.preview + '\')',"preview",'installArchive(\'' + l.archive + '\')',"install",'installArchive(\'' + l.archive + '\');adduse(\'' + l.archive + '\',\'' + l.module + '\');',"install & use");
                });
              }
              webviewView.webview.postMessage({html: htmlResults(loc, rem, res.locals.length, res.remotes.length)});
            });
            break;
          case "open":
            vscode.workspace.openTextDocument(vscode.Uri.parse(msg.uri)).then((document : vscode.TextDocument) => {
              vscode.window.showTextDocument(document,vscode.ViewColumn.Beside,true);
            })
            //vscode.window.showTextDocument(vscode.Uri.parse(msg.uri));
            break;
          case "preview":
            const panel = vscode.window.createWebviewPanel('webviewPanel','Preview',vscode.ViewColumn.Beside,webviewView.webview.options);
            panel.webview.html = iFrame(msg.url);
            break;
          case "adduse":
            const doc = vscode.window.activeTextEditor?.document;
            if (doc) {
              let insertline = 0;
              let lastemptyline = 0;
              let inbody = false;
              let done = false;
              while (insertline < doc.lineCount && !done) {
                let line = doc.lineAt(insertline).text;
                if (!inbody) {
                  insertline += 1;
                  if (line.indexOf("\\begin{document") !== -1) {
                    inbody = true;
                    lastemptyline = insertline;
                  }
                } else if (line.trim() == "") {
                  insertline += 1;
                } else if (line.indexOf("\\usemodule") !== -1) {
                  insertline += 1;
                  lastemptyline = insertline;
                } else { done = true;}
              }
              const pos = new vscode.Position(lastemptyline,0);
              const edit = new vscode.WorkspaceEdit();
              edit.insert(doc.uri,pos,`\\usemodule[${msg.archive}]{${msg.uri}}\n`);
              vscode.workspace.applyEdit(edit);
            }
            break;
          case "install": 
            this.scontext.mathhubtreeprovider?.installArchive(msg.archive);
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
  <div><i><b>[${res.archive}] ${res.sourcefile}</b></i></div>
  <div style="align-self:end;"><vscode-button onclick="${link}" appearance="secondary">${label}</vscode-button></div>
</div>
<iframe frameborder="0" src="${res.html}"></iframe>
<vscode-divider role="separator"></vscode-divider>`;
}
function htmlResult2(res:LSPSearchResult,link1:string,label1:string,link2:string,label2:string) {
  return `
<div class="result">
  <div><i><b>[${res.archive}] ${res.sourcefile}</b></i></div>
  <div style="align-self:end;"><vscode-button onclick="${link1}" appearance="secondary">${label1}</vscode-button>
  <vscode-button onclick="${link2}" appearance="secondary">${label2}</vscode-button></div>
</div>
<iframe frameborder="0" src="${res.html}"></iframe>
<vscode-divider role="separator"></vscode-divider>`;
}
function htmlResult3(res:LSPSearchResult,link1:string,label1:string,link2:string,label2:string,link3:string,label3:string) {
  return `
<div class="result">
  <div><i><b>[${res.archive}] ${res.sourcefile}</b></i></div>
  <div style="align-self:end;">
    <vscode-button onclick="${link1}" appearance="secondary">${label1}</vscode-button>
    <vscode-button onclick="${link2}" appearance="secondary">${label2}</vscode-button>
    <vscode-button onclick="${link3}" appearance="secondary">${label3}</vscode-button>
  </div>
</div>
<iframe frameborder="0" src="${res.html}"></iframe>
<vscode-divider role="separator"></vscode-divider>`;
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
      flex-direction:column;
    }
    vscode-divider {
      margin: 16px 0;
    }
  </style>
</head>
<body>
<vscode-text-field size="50" id="search-field" placeholder="Search">
  <span slot="start" class="codicon codicon-search"></span>
  sTeX Content
  <span slot="end" class="codicon codicon-close" onclick="clearSearch()" style="cursor: pointer;"></span>
</vscode-text-field>
<vscode-radio-group id="searchtype">
  <vscode-radio id="searchall" value="all" checked>Anywhere</vscode-radio>
  <vscode-radio id="searchdefs" value="defs">Definitions</vscode-radio>
  <vscode-radio id="searchass" value="ass">Assertions</vscode-radio>
  <vscode-radio id="searchex" value="ex">Examples</vscode-radio> 
  <vscode-radio id="searchsyms" value="syms">Symbols</vscode-radio> 
</vscode-radio-group>
<vscode-divider role="separator"></vscode-divider>
<div id="stex-search-results"></div>
<script>
const vscode = acquireVsCodeApi();
let searchfield = document.getElementById("search-field");
let resultfield = document.getElementById("stex-search-results");
let searchtype = document.getElementById("searchtype");

const previousState = vscode.getState();
searchfield.value = previousState?.searchValue ?? "";
resultfield.innerHTML = previousState?.searchResultsHtml ?? "";
searchtype.value = previousState?.searchType ?? "all";

searchfield.addEventListener("keyup", runSearch);
searchtype.addEventListener("change", runSearch);
let timeout = null;
function clearSearch() {
  searchfield.value = "";
  doSearch();
}
function runSearch(event) {
  if (event.key === "Enter") {
    window.clearTimeout(timeout);
    doSearch(true);
    return;
  }
  if (timeout) {
    window.clearTimeout(timeout);
  }
  timeout = window.setTimeout(function(){ doSearch();}, 500);
}
function doSearch(force=false) {
  const oldState = vscode.getState();
  const searchType = searchtype.value;
  const searchValue = searchfield.value;
  if (!force && oldState.searchValue === searchValue && oldState.searchType === searchType) {
    return;
  }
  vscode.setState({ ...vscode.getState(), searchType, searchValue });
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
function adduse(a,s) {
  vscode.postMessage({
    command: "adduse",
    archive: a,
    uri:s
  });
}
function installArchive(s) {
  vscode.postMessage({
    command: "install",
    archive:s
  });
}
function preview(s) {
  vscode.postMessage({command: "preview",url:s});
}
window.addEventListener('message', event => {
  const data = event.data;
  vscode.setState({ ...vscode.getState(), searchResultsHtml: data.html });
  resultfield.innerHTML = data.html;
})
</script>

</body>
</html>
        `;
}