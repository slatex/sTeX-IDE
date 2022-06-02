
import * as vscode from 'vscode';
import { launchWebRemote } from './client';
import {registerCommands} from '../shared/commands';
import { STeXContext } from '../shared/context';

export function activate(context: vscode.ExtensionContext) {
	let stexc = new STeXContext(context);
	registerCommands(stexc);
	launchWebRemote(stexc);
}

export function deactivate() {}

