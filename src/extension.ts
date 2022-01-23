// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as language from 'vscode-languageclient';
import {STeXLanguageClient, launchLocal,launchRemote} from './client/client';
import { viewer } from './xhtmlviewer/viewer';

function registerCommands() {
	vscode.commands.registerCommand('stexide.info', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('sTeX info here!');
	});
	vscode.commands.registerCommand('stexide.viewer', () => {
		viewer();
	});
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "stexide" is now active!');

	registerCommands();

	const thiscontext = new STeXContext(context);

	//launchLocal(thiscontext);
	launchRemote(thiscontext);
	console.log("Blubb");
}

// this method is called when your extension is deactivated
export function deactivate() {}

const outputChannel = vscode.window.createOutputChannel("sTeX");

export class STeXContext {
	outputChannel = outputChannel;
	openSettingsAction = "Open settings";
	openSettingsCommand = "workbench.action.openSettings";
	clientOptions: language.LanguageClientOptions = {
		documentSelector: [{ scheme: "file", language: "tex" },{ scheme: "file", language: "latex" }],
		synchronize: {
		  configurationSection: "stexide"
		},
		revealOutputChannelOn: language.RevealOutputChannelOn.Info,
		outputChannel: this.outputChannel
	};
	context : vscode.ExtensionContext;
	constructor(context : vscode.ExtensionContext) {
		this.context = context;
	}
	javaHome : string = "";
	client : STeXLanguageClient | undefined = undefined;
}