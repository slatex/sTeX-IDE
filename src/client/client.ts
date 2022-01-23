import { OutputChannel } from 'vscode';
import * as language from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import * as net from 'net';
import {getJavaHome, javaErr, getJavaOptions } from '../util/java';
import { STeXContext } from '../extension';

export class STeXLanguageClient extends language.LanguageClient {
	public languageId = "tex";

	constructor(serverOptions:language.ServerOptions,clientOptions:language.LanguageClientOptions) {
		super("stex","sTeX",serverOptions,clientOptions);
	}
}

export class STeXFeatures implements language.StaticFeature {

	client : language.LanguageClient;

	constructor(cl:language.LanguageClient) {
		this.client = cl;
	}

	fillInitializeParams(params: language.InitializeParams): void {
	  if (!params.capabilities.experimental) {
		params.capabilities.experimental = {};
	  }
	}
	fillClientCapabilities(): void {}
	initialize(capabilities: language.ServerCapabilities): void {
		this.client.outputChannel.append("");
	}
    dispose(): void {};
}

export function launchRemote(context: STeXContext) {
	// The server is a started as a separate app and listens on port 5007
    let connectionInfo = {
        port: 5007
    };
    let serverOptions = () => {
        // Connect to language server via socket
        let socket = net.connect(connectionInfo);
        let result: language.StreamInfo = {
            writer: socket,
            reader: socket
        };
        return Promise.resolve(result);
    };

	// Create the language client and start the client.	
	context.client = new STeXLanguageClient(
		serverOptions,
		context.clientOptions
	);
	handleClient(context);
}


export function launchLocal(context: STeXContext) {
	getJavaHome().catch(err => javaErr(context))
	.then(javaHome => {
		console.log("javaHome: " + javaHome);
		if (!javaHome) {
			javaErr(context);
			return;
		}
		context.javaHome = javaHome;
		launchSTeXServer(context);
	});
  vscode.commands.executeCommand("setContext", "stex:enabled", true);
}

import * as path from "path";
import { ClientRequest } from 'http';
import { TextDecoder } from 'util';

function launchSTeXServer(context: STeXContext) {
	/* if (!vscode.workspace.workspaceFolders) {
		const message =
			"MMT will not start because you've opened a single file and not a project directory.";
		context.outputChannel.appendLine(message);
		vscode.window.showErrorMessage(message, context.openSettingsAction).then(choice => {
		  if (choice === context.openSettingsAction) {
			vscode.commands.executeCommand("workbench.action.openSettings");
		  }
		});
	  return;
	} */

	const config = vscode.workspace.getConfiguration("stexide");
  
	context.outputChannel.appendLine(`Java home: ${context.javaHome}`);
	const javaPath = path.join(context.javaHome, "bin", "java");
	const jarPathO = config.get<string>("jarpath");
	if(!jarPathO) { 
		const message =
		"Path to MMT jar not set";
		context.outputChannel.appendLine(message);
		vscode.window.showErrorMessage(message, context.openSettingsAction).then(choice => {
	  		if (choice === context.openSettingsAction) {
				vscode.commands.executeCommand("workbench.action.openSettings");
	  		}
		});
  		return;
	}

	const mathhubO = config.get<string>("mathhub");
	if(!mathhubO) { 
		const message =
		"Path to MathHub not set";
		context.outputChannel.appendLine(message);
		vscode.window.showErrorMessage(message, context.openSettingsAction).then(choice => {
	  		if (choice === context.openSettingsAction) {
				vscode.commands.executeCommand("workbench.action.openSettings");
	  		}
		});
  		return;
	}
	const jarPath = jarPathO; 

	const serverProperties: string[] = config
	  .get<string>("serverProperties")!
	  .split(" ")
	  .filter(e => e.length > 0);
	  
  
	const javaOptions = getJavaOptions(context.outputChannel);

	const baseProperties = [
		"-Xmx8192m",
		"-classpath",
		jarPath,
		"info.kwarc.fomtex.Main",
		mathhubO
	  ];
	const launchArgs = baseProperties
		.concat(javaOptions);

	context.outputChannel.appendLine("Initializing sTeX LSP Server");

	const serverOptions: language.ServerOptions = {
		run: { command: javaPath, args: launchArgs },
		debug: { command: javaPath, args: launchArgs }
	};

	context.client = new STeXLanguageClient(
		serverOptions,
		context.clientOptions
	);
	handleClient(context);
}

import * as tex from '../util/tex';
import { HTMLUpdateMessage, updateHTML } from '../xhtmlviewer/viewer';

function handleClient(context: STeXContext) {
	if (!context.client) {return;}
	const features = new STeXFeatures(context.client);
	//const features = new FoMTeXFeatures(context.client);
	//context.client.registerFeature(features);

	function registerCommand(command: string, callback: (...args: any[]) => any) {
		context.context.subscriptions.push(vscode.commands.registerCommand(command, callback));
	}

	//const service = new MMTSemanticHighlightingService(client);
	//client.registerFeature(MMTSemanticHighlightingService.createNewFeature(service,client));

	context.context.subscriptions.push(context.client.start());

	context.outputChannel.appendLine("Done.");

	function send(s : string) {
		context.outputChannel.appendLine(s);
	}

	context.client.onReady().then(_ => {if (context.client) {
		context.client.onRequest("stex/getMainFile",_ => tex.getMainDoc());
		context.client.onRequest("stex/updateHTML",a => updateHTML(a as HTMLUpdateMessage));
	}});
	// client.onRequest("textDocument/semanticHighlighting",outputChannel.appendLine);
	//client.onNotification("textDocument/semanticHighlighting",outputChannel.appendLine);
}