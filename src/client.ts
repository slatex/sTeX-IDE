import * as language from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import { STeXContext } from './shared/context';
import { HTMLUpdateMessage } from './shared/viewer';
import { BuildMessage, registerCommands } from './shared/commands';
import { privateEncrypt } from 'crypto';



export function languageclient(so : language.ServerOptions) : language.LanguageClient {
	return new language.LanguageClient("stex","sTeX",so,{
		documentSelector: [{scheme:"file", language:"tex"},{scheme:"file", language:"latex"}],
		synchronize: {}
	});
}

interface NERMessage {
  jar:string,
  zip:string
}


//import * as tex from '../util/tex';
//import { HTMLUpdateMessage, updateHTML } from '../xhtmlviewer/viewer';

export function handleClient(context: STeXContext) {
	if (!context.client) {return;}

	function registerCommand(command: string, callback: (...args: any[]) => any) {
		context.vsc.subscriptions.push(vscode.commands.registerCommand(command, callback));
	}

	//const service = new MMTSemanticHighlightingService(client);
	//client.registerFeature(MMTSemanticHighlightingService.createNewFeature(service,client));

	context.client.start();

	context.outputChannel.appendLine("Done.");

	function send(s : string) {
		context.outputChannel.appendLine(s);
	}

	context.client.onRequest("stex/updateHTML", (a: HTMLUpdateMessage) => {
		context.htmlPreview.updateHtml(a);
	});
	context.client.onRequest("stex/openFile", (a: HTMLUpdateMessage) => {
		vscode.workspace.openTextDocument(vscode.Uri.parse(a.html)).then((document : vscode.TextDocument) => {
		  vscode.window.showTextDocument(document,vscode.ViewColumn.One,true);
		});
	});
	context.client.onRequest<string,string>("stex/ping", () => {
		return "yo";
	});
	interface LocalServerInterface {
		url:string
	}
	context.client.onNotification("stex/setLocalServer",(a:LocalServerInterface) => {
		context.localServer = a.url;
	});
	context.client.onNotification("stex/updateMathHub", () => context.mathhubtreeprovider?.updateRemote());
	interface MathHubMessage {
		mathhub:string,
		remote:string
	}
	function next() {
		registerCommands(context);
		vscode.workspace.onDidChangeTextDocument(e => {
			const conf = vscode.workspace.getConfiguration("stexide");
		if (isTeX(e.document) && conf.get("preview") == "on edit") {
			context.client?.sendNotification(new language.ProtocolNotificationType<BuildMessage,void>("sTeX/buildHTML"),
				{file:(<vscode.Uri>e.document.uri).toString()});
		}
		});
		vscode.workspace.onDidSaveTextDocument(doc => {
			const conf = vscode.workspace.getConfiguration("stexide");
		if (isTeX(doc) && conf.get("preview") == "on save") {
			context.client?.sendNotification(new language.ProtocolNotificationType<BuildMessage,void>("sTeX/buildHTML"),
				{file:(<vscode.Uri>doc.uri).toString()});
		}
		});

		const conf = vscode.workspace.getConfiguration("stexide");
		const jar = conf.get<string>("mmt.NERjarPath");
		const model = conf.get<string>("mmt.NERmodelPath");
		if (jar && model) {
			context.client?.sendNotification(new language.ProtocolNotificationType<NERMessage, void>("sTeX/initializeNER"), {
				jar:jar,zip:model
			});
			context.hasmodel = true;
		}
	}

	context.client.sendNotification(new language.ProtocolNotificationType<MathHubMessage,void>("sTeX/setMathHub"),{
		mathhub:context.mathhub[0],
		remote:vscode.workspace.getConfiguration("stexide").get("remoteMathHub")
	}).then(()=> next() );
};
function isTeX(doc:vscode.TextDocument): boolean {
	return doc.languageId == "tex" ||
		doc.languageId == "latex" ||
		doc.languageId == "latex-expl3"
}

	//context.client.onReady().then(_ => {if (context.client) {
		//context.client.onRequest("stex/getMainFile",_ => tex.getMainDoc());
		//context.client.onRequest("stex/updateHTML",a => updateHTML(a as HTMLUpdateMessage));
	//}});
	// client.onRequest("textDocument/semanticHighlighting",outputChannel.appendLine);
	//client.onNotification("textDocument/semanticHighlighting",outputChannel.appendLine);
