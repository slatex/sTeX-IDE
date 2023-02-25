import * as weblanguage from 'vscode-languageclient/browser';
import * as language from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import { MathHubTreeProvider } from './mathhub';
import { HtmlPreviewWindow } from './viewer';

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
	get mathhub():string {
		return ""
	}
	private _outputChannel: vscode.OutputChannel | undefined;
	vsc: vscode.ExtensionContext;
	client? : language.LanguageClient | weblanguage.LanguageClient;
	htmlPreview = new HtmlPreviewWindow();

	constructor(context: vscode.ExtensionContext) {
		this.vsc = context;
	}
	mathhubtreeprovider? : MathHubTreeProvider;

	get outputChannel(): vscode.OutputChannel {
		if(this._outputChannel === undefined) {
			this._outputChannel = this.client?.outputChannel || getoutputChannel();
		}
		return this._outputChannel;
	}
}