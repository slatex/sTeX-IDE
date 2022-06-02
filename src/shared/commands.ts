import * as vscode from 'vscode';
import { STeXContext } from './context';

export function registerCommands(context: STeXContext) {
    context.vsc.subscriptions.push(vscode.commands.registerCommand('stexweb.info', () => {
		vscode.window.showInformationMessage('Hello World from sTeXWeb!');
	}));
}