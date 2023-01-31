
import * as vscode from 'vscode';
import {registerCommands} from './shared/commands';
import { launchLocal, launchRemote } from './nonweb/launches';
import { STeXContext } from './shared/context';
import { getJarPath, getMathHub, setup } from './nonweb/setup';

let stexc : STeXContext;

export async function activate(context: vscode.ExtensionContext) {
	stexc = new STeXContext(context);
	if (!getMathHub() || !getJarPath()) {
		await setup(stexc);
	} else {
		launchLocal(stexc)
	}
	//launchRemote(stexc);
}

export function deactivate() {
	if (stexc.client) {
		stexc.client.stop();
	}
}