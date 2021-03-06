import * as net from "net";
import * as language from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import * as path from "path";
import { handleClient, languageclient} from "../client";
import { getJavaOptions } from "../util/java";
import { STeXContext } from "../shared/context";
import { getMathHub } from "./setup";

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


export function launchLocal(context: STeXContext) {
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

function launchSTeXServer(context: STeXContext/*,javaHome: string*/) {

	const config = vscode.workspace.getConfiguration("stexide");
    /*
	context.outputChannel.appendLine(`Java home: ${javaHome}`);
	const javaPath = path.join(javaHome, "bin", "java");
	 */
	const jarPathO = config.get<string>("jarpath");
	if(!jarPathO) { 
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

	const mathhubO = getMathHub();
	if(!mathhubO) { 
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
	const jarPath = jarPathO; 
	const portO = config.get<string>("mmtport");
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
		"-Xmx8192m",
		"-classpath",
		jarPath,
		"info.kwarc.mmt.stex.lsp.Main",
		mathhubO,portO
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