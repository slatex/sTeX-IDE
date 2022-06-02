
import * as vscode from 'vscode';
import {registerCommands} from './shared/commands';
import { launchLocal, launchRemote } from './nonweb/launches';
import { STeXContext } from './shared/context';
import { getJarpath, getMathHub, setup } from './nonweb/setup';

export function activate(context: vscode.ExtensionContext) {
	let stexc = new STeXContext(context);
	registerCommands(stexc);
	if (getMathHub() && getJarpath()) {
		launchLocal(stexc);
	} else {
		setup(stexc);
	}
	//launchRemote(stexc);
}

export function deactivate() {}