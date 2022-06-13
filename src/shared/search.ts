import * as vscode from 'vscode';
import { CancellationToken, ProtocolRequestType, ProtocolRequestType0 } from 'vscode-languageclient';
import { STeXContext } from './context';

interface LSPSearchResult {
  archive:String;
  sourcefile:String;
  local:Boolean;
  html:String;
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
          "node_modules",
          "@vscode",
          "webview-ui-toolkit",
          "dist",
          "toolkit.js"
      ));
      const styleuri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(
        this.scontext.vsc.extensionUri,
          "media",
          "styles.css"
      ));
      const cssuri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(
        this.scontext.vsc.extensionUri,
          "node_modules",
          "@vscode/codicons",
          "dist",
          "codicon.css"
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
              res.locals.forEach(l => {
                loc += htmlResult(l);
              });
              var rem : string = "";
              res.remotes.forEach(l => {
                rem += htmlResult(l);
              });
              webviewView.webview.postMessage({html:htmlResults(loc,rem)});
            });
        }
      });
      webviewView.webview.html = searchhtml(tkuri,styleuri,cssuri,webviewView.webview.cspSource);
    }
}

function htmlResult(res:LSPSearchResult) {
  return `
<tr><td style="text-align:left;"><i><b>[${res.archive}]${res.sourcefile}</b></i></td></tr>
<tr><td style="border:1px solid;">
  <div style="display:flex;flex-direction:column;width:100%;max-width:534pt;overflow-x:scroll;">
    ${res.html}
  </div>
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

function searchhtml(tkuri:vscode.Uri,styleuri:vscode.Uri,cssuri:vscode.Uri,cspsource:string) { return `
<!DOCTYPE html>
<html>
<head>
  <!--<link href="${styleuri}" rel="stylesheet"/>-->
  <link href="${cssuri}" rel="stylesheet"/>
  <script type="module" src="${tkuri}"></script>
  <script type="text/javascript" id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/mml-chtml.js">&#8205;</script>
  <style>
.definiendum {
    color: #00BB00;
    font-weight: bold;
}
.varcomp {
    color: #828282;
}
.symcomp {
    color: #0e90d2;
}
.scaledbody {
    transform: scale(1.5);
    transform-origin: top;
}
.frame {
    border:2px solid black;
    display: flex;
    margin: 5px auto;
    background-color: white;
}
.solution {

}
body {
    /*font-family: Noto Serif, serif, STIXgeneral, Times, Symbol, cmr10, CMSY10, CMEX10, serif*/;
    font-family: STIXgeneral, Times, Symbol, cmr10, CMSY10, CMEX10, serif;
    margin:auto;
}

.resetfont {
    /*font-family: Noto Serif, serif, STIXgeneral, Times, Symbol, cmr10, CMSY10, CMEX10, serif*/;
    font-family: STIXgeneral, Times, Symbol, cmr10, CMSY10, CMEX10, serif;
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
}

.monospaced {
    font-family: FreeMono, Courier New, monospace;
}

.blackboard {
    font-family: msbm;
}

.script {
    font-family: URW Chancery L, cursive;
}

.sansserif {
    font-family: sans-serif;
}

.body {
    position: relative;

    color: hsl(0, 5%, 10%);
    background-color: hsl(210, 20%, 98%);

    text-rendering: optimizeLegibility;
    align-content: inherit;
    justify-content: start;
    grid-auto-flow:row;
    text-align:justify;
    display: flex;
    flex-direction: column;
}

span {
    display:inherit;
    flex-direction: inherit;
}
.paragraph > span {
    display:inline;
}
.displaymath {
    display:block;
    text-align:center;
}
.vskip {
    display: inline-block;
    line-height:0pt
}
.reftarget {
}
.vrule {
    /*align-self:end;*/
    display:inline-block;
}
.hrule {
    /*align-self:start;*/
    display:block;
}
a {
    color: inherit;
    text-decoration: inherit;
    display: inline-block;
    pointer-events: all;
}
.raise {
    position: relative;
    display: inline-block;
}
.moveright {
    position: relative;
    display: inline-block;
}
.paragraph {
    hyphens: auto;
    -webkit-hyphens: auto;
    -moz-hyphens: auto;
    margin-top: 0;
    margin-bottom: 0;
    max-width:100%;
    justify-content:inherit;
    align-content:inherit;
}
hr {
    width: 100%;
}
.vbox {
    display: inline-flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-content: center;
    justify-content: flex-end;
    width:max-content;
    max-width:100%;
    text-align:justify;
    align-self: center;
}
.hbox {
    display: inline-flex;
    flex-direction: row;
    justify-content: flex-start;
    align-content: inherit;
    align-items: baseline;
    width:max-content;
    height:max-content;
    max-width:100%;
}
.matrix {
    display: inline-flex;
}
.hskip {
    display: inline-block;
    width: 0%;
    height: 0%;
}
.indent {
    display: inline-block;
    width: 0%;
    height: 0%;
}
.vskip {
    width: 0%;
    height: 0%;
}
foreignObject {
}
.foreign {
    display:flex;
    width:100%;
    height:100%;
    align-items:center;
    justify-content:center;
    transform: scale(1,-1);
}
table {
    border-spacing:0;
    white-space:nowrap;
    width:max-content;
    height:max-content;
    /*display:initial;*/
}
td {
    padding:0;
}
.vfil {
    margin-bottom: 10px;
    width: 0%;
    height: 0%;
}
.vfill {
    margin-bottom: 30px;
    width: 0%;
    height: 0%;
}
.HFil {
    margin-left: 10px;
    width: 0%;
    height: 0%;
    display: inline-block;
}
.Hss {
    width: 0%;
    height: 0%;
    display: inline-block;
}
.hkern {
    display: inline-block;
}
.HFill {
    margin-left: 30px;
    width: 0%;
    height: 0%;
    display: inline-block;
}
.br {
    flex-basis:100%;
    height:0;
}
math {
    width:max-content;
    height:max-content;
    /*font-size:85%;*/
}
.displaymath {
    align-self: center;
}
.displaymathcontainer {
    text-align:center;
    display:flex;
    justify-content:center;
    align-self:center;
}

.font-normal {
    font-family: STIXgeneral, Times, Symbol, cmr10, CMSY10, CMEX10, serif;
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
}
  </style>
</head>
<body>
<vscode-text-field size="50" id="searchfield">Search sTeX Content<span slot="start" class="codicon codicon-search"></span></vscode-text-field>
<br/>
<vscode-radio-group id="searchtype">
  <vscode-radio id="searchall" value="all" checked/>Anywhere</vscode-radio>
  <vscode-radio id="searchdefs" value="defs"/>Definitions</vscode-radio>
  <vscode-radio id="searchass" value="ass"/>Assertions</vscode-radio>
  <vscode-radio id="searchex" value="ex"/>Examples</vscode-radio>
</vscode-radio-group>
<div id="stex-searchresults">
</div>

<script>
let oldmj = MathJax;
MathJax = {
  startup: {
      ready() {
          MathJax.startup.defaultReady();
          const MML = MathJax.startup.document.inputJax[0];
          const adaptor = MML.adaptor;
          MML.mmlFilters.add(function ({math, document, data}) {
              for (const mtext of data.querySelectorAll('mtext')) {
                  const child = mtext.firstElementChild;
                  if (child && child.namespaceURI === 'http://www.w3.org/1999/xhtml') {
                      const semantics = adaptor.node('semantics', {}, [
                          adaptor.node('annotation-xml', {encoding: 'application/xhtml+xml'}, mtext.childNodes)
                      ]);
                      mtext.parentNode.replaceChild(semantics, mtext);
                  }
              }
          });
      }
  }
}

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
window.addEventListener('message', event => {
  const msg = event.data;
  resultfield.innerHTML = msg.html;
  oldmj.typeset();
})
</script>

</body>
</html>
        `;
}