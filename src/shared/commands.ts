import * as vscode from 'vscode';
import * as language from 'vscode-languageclient/node';
import { STeXContext } from './context';
import { MathHubTreeProvider, MHTreeItem } from './mathhub';

interface InstallMessage {
	archive: string
}

export function registerCommands(context: STeXContext) {
    context.vsc.subscriptions.push(vscode.commands.registerCommand('stexide.info', () => {
		vscode.window.showInformationMessage('Hello World from sTeXWeb!');
	}));
	context.vsc.subscriptions.push(vscode.commands.registerCommand("stexide.mathhub.install", arg => {
		context.client?.sendNotification(new language.ProtocolNotificationType<InstallMessage,void>("sTeX/installArchive"),{archive:(<MHTreeItem>arg).path});
	}));
	vscode.window.registerTreeDataProvider("stexidemathhub",new MathHubTreeProvider(context));
}