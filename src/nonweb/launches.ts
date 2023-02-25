import * as net from "net";
import * as language from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import * as path from "path";
import { handleClient, languageclient} from "../client";
import { getJavaOptions } from "../util/java";
import { STeXContext } from "../shared/context";
import { LocalSTeXContext } from "../extension";

export function launchRemote(context: STeXContext) {
	// The server is started as a separate app and listens on port 5007
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
	context.client = languageclient(serverOptions);
	handleClient(context);
}


export function launchLocal(context: LocalSTeXContext) {
	/*getJavaHome().catch(err => javaErr(context))
	.then(javaHome => {
		console.log("javaHome: " + javaHome);
		if (!javaHome) {
			javaErr(context);
			return;
		}
		launchSTeXServer(context,javaHome);
	});*/
  launchSTeXServer(context);
  vscode.commands.executeCommand("setContext", "stex:enabled", true);
}

export function launchSTeXServerWithArgs(context: STeXContext,jarPath:string,mathhub:string) {
	const config = vscode.workspace.getConfiguration("stexide");
	const portO = config.get<string>("mmt.port");
	if(!portO) { 
		const message =
		"Port not set";
		context.outputChannel.appendLine(message);
		vscode.window.showErrorMessage(message, "Open settings").then(choice => {
	  		if (choice === "Open settings") {
				vscode.commands.executeCommand("workbench.action.openSettings");
	  		}
		});
  		return;
	}
	  
  
	const javaOptions = getJavaOptions(context.outputChannel);

	const baseProperties = [
		"-Xmx4096m",
		"-classpath",
		jarPath,
		"info.kwarc.mmt.stex.lsp.Main",
		mathhub,portO
	  ];
	const launchArgs = baseProperties
		.concat(javaOptions);

	context.outputChannel.appendLine("Initializing sTeX LSP Server");

	const serverOptions: language.ServerOptions = {
		run: { command: "java", args: launchArgs },
		debug: { command: "java", args: launchArgs }
	};

	context.client = languageclient(serverOptions);
	handleClient(context);
}

function launchSTeXServer(context: LocalSTeXContext/*,javaHome: string*/) {
	if(!context.jarPath) { 
		const message =
		"Path to MMT jar not set";
		context.outputChannel.appendLine(message);
		vscode.window.showErrorMessage(message, "Open settings").then(choice => {
	  		if (choice === "Open settings") {
				vscode.commands.executeCommand("workbench.action.openSettings");
	  		}
		});
  		return;
	}

	if(!context.mathhub) { 
		const message =
		"Path to MathHub not set";
		context.outputChannel.appendLine(message);
		vscode.window.showErrorMessage(message, "Open settings").then(choice => {
	  		if (choice === "Open settings") {
				vscode.commands.executeCommand("workbench.action.openSettings");
	  		}
		});
  		return;
	}
	launchSTeXServerWithArgs(context,context.jarPath,context.mathhub);
}