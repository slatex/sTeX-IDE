import * as weblanguage from 'vscode-languageclient/browser';
import * as language from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import { MathHubTreeProvider } from './mathhub';

let outputChannel : vscode.OutputChannel;
function getoutputChannel() {
	if (outputChannel) {
		return outputChannel;
	} else {
		outputChannel = vscode.window.createOutputChannel("sTeX");
		return outputChannel;
	}
}

export class STeXContext {
	vsc: vscode.ExtensionContext;
	outputChannel = getoutputChannel();
	client? : language.LanguageClient | weblanguage.LanguageClient;
	constructor(context: vscode.ExtensionContext) {
		this.vsc = context;
	}
	mathhub? : MathHubTreeProvider;
}