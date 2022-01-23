import * as vscode from 'vscode';

// var latexworkshop : vscode.Extension | undefined = undefined;

export function getMainDoc() : MainFileMessage {
    const latexworkshop = vscode.extensions.getExtension("james-yu.latex-workshop");
    if (latexworkshop) {
        return new MainFileMessage("Test:Success");
        //const exports : WorkshopExports = latexworkshop.exports;
        //const ret = exports.manager.rootFile();
        //return new MainFileMessage(ret);
    } else {
        return new MainFileMessage("error");
    }
}

export class MainFileMessage {
    mainFile : string;

	constructor(file : string) {
		this.mainFile = file;
	}
}

interface WorkshopExports {
    manager : {
        rootFile() : string
        getContent(file?: string | undefined, fileTrace?: string[]): string
        getIncludedTeX(file?: string | undefined, includedTeX?: string[]): string[]
    }
}