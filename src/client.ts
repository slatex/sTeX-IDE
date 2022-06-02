import * as language from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import { STeXContext } from './shared/context';
import { HTMLUpdateMessage, updateHTML } from './shared/viewer';
import { getMathHub } from './nonweb/setup';



export function languageclient(so : language.ServerOptions) : language.LanguageClient {
	return new language.LanguageClient("stex","sTeX",so,{
		documentSelector: [{scheme:"file", language:"tex"},{scheme:"file", language:"latex"}],
		synchronize: {}
	});
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

	context.client.onRequest("stex/updateHTML",a => {
		updateHTML(a as HTMLUpdateMessage);
	});
	context.client.onRequest("stex/getMathHub",a => {
		return {mathhub:getMathHub()};
});

	//context.client.onReady().then(_ => {if (context.client) {
		//context.client.onRequest("stex/getMainFile",_ => tex.getMainDoc());
		//context.client.onRequest("stex/updateHTML",a => updateHTML(a as HTMLUpdateMessage));
	//}});
	// client.onRequest("textDocument/semanticHighlighting",outputChannel.appendLine);
	//client.onNotification("textDocument/semanticHighlighting",outputChannel.appendLine);
}