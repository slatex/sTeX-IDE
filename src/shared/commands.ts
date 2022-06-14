import * as vscode from 'vscode';
import * as language from 'vscode-languageclient/node';
import { STeXContext } from './context';
import { MathHubTreeProvider, MHTreeItem } from './mathhub';
import { SearchPanel } from './search';

interface InstallMessage {
	archive: string
}

interface BuildMessage {
	file:string
}

export function registerCommands(context: STeXContext) {
    context.vsc.subscriptions.push(vscode.commands.registerCommand('stexide.info', () => {
		vscode.window.showInformationMessage('Hello World from sTeXWeb!');
	}));
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.openFile", arg => {
		vscode.window.showTextDocument(arg);
	}));
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.mathhub.install", arg => {
		if (context.mathhub) {context.mathhub.roots = []; context.mathhub.update();}
		context.client?.sendNotification(new language.ProtocolNotificationType<InstallMessage,void>("sTeX/installArchive"),{archive:(<MHTreeItem>arg).path});
	}));
	vscode.window.registerTreeDataProvider("stexidemathhub",new MathHubTreeProvider(context));
	vscode.window.registerWebviewViewProvider("stexidesearch",new SearchPanel(context));

	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.build", arg => {
		context.client?.sendNotification(new language.ProtocolNotificationType<BuildMessage,void>("sTeX/buildFile"),
			{file:(<vscode.Uri>arg).toString()});
	}));
}