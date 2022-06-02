
import * as vscode from 'vscode';
import {registerCommands} from './shared/commands';
import { launchLocal, launchRemote } from './nonweb/launches';
import { STeXContext } from './shared/context';
import { getJarpath, getMathHub, setup } from './nonweb/setup';

let stexc : STeXContext;

export function activate(context: vscode.ExtensionContext) {
	stexc = new STeXContext(context);
	registerCommands(stexc);
	if (getMathHub() && getJarpath()) {
		launchLocal(stexc);
	} else {
		setup(stexc);
	}
	//launchRemote(stexc);
}

export function deactivate() {
	if (stexc.client) {
		stexc.client.stop();
	}
}