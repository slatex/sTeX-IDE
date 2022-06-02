import * as weblanguage from 'vscode-languageclient/browser';
import * as language from 'vscode-languageclient/node';
import * as vscode from 'vscode';

export class STeXContext {
	vsc: vscode.ExtensionContext;
	outputChannel = vscode.window.createOutputChannel("sTeX");
	client? : language.LanguageClient | weblanguage.LanguageClient;
	constructor(context: vscode.ExtensionContext) {
		this.vsc = context;
	}
}