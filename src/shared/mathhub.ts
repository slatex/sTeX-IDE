import * as fs from 'fs';
import path = require('path');
import {ProtocolNotificationType} from 'vscode-languageclient/node';
import * as vscode from 'vscode';
import { ProtocolRequestType0 } from 'vscode-languageclient';
import { InstallMessage } from './commands';
import { STeXContext } from './context';

export class FileStat implements vscode.FileStat {

	constructor(private fsStat: fs.Stats) { }

	get type(): vscode.FileType {
		return this.fsStat.isFile() ? vscode.FileType.File : this.fsStat.isDirectory() ? vscode.FileType.Directory : this.fsStat.isSymbolicLink() ? vscode.FileType.SymbolicLink : vscode.FileType.Unknown;
	}

	get isFile(): boolean | undefined {
		return this.fsStat.isFile();
	}

	get isDirectory(): boolean | undefined {
		return this.fsStat.isDirectory();
	}

	get isSymbolicLink(): boolean | undefined {
		return this.fsStat.isSymbolicLink();
	}

	get size(): number {
		return this.fsStat.size;
	}

	get ctime(): number {
		return this.fsStat.ctime.getTime();
	}

	get mtime(): number {
		return this.fsStat.mtime.getTime();
	}
}

export interface Repository {
    id: string,
    deps: string[],
    isLocal:boolean,
    localPath:string
}

export interface RepoGroup {
    id: string,
    isLocal:boolean,
    children: MHEntry[]
}

export type MHEntry = Repository | RepoGroup;


export class MHTreeItem extends vscode.TreeItem {
    constructor(public mh : MHEntry,parent?:MHTreeItem) {
        let asgroup = <RepoGroup>mh;
        var state : vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;
        var cv = "repository";
        var iconPath = undefined;
        if (asgroup.children !== undefined) {
            cv = asgroup.isLocal? "repogroup": "remote";
            iconPath = asgroup.isLocal ? new vscode.ThemeIcon("library") : path.join(__filename,"..","..","img","MathHub.svg");
            state = vscode.TreeItemCollapsibleState.Collapsed;
        } else {
            cv = mh.isLocal? "repository": "remote";
            iconPath = asgroup.isLocal ? new vscode.ThemeIcon("book") : path.join(__filename,"..","..","img","MathHub.svg");
            if (asgroup.isLocal) {
                state = vscode.TreeItemCollapsibleState.Collapsed;
            }
        }
        super(mh.id,state);
        this.contextValue = cv;
        if (parent) {
            this.path = parent.path + "/" + mh.id;
        } else {
            this.path = mh.id;
        }
        this.iconPath = iconPath;
    }
    path:string;
    children:MHTreeItem[] = [];
}

interface FileEntry {
    uri:vscode.Uri;
    type:vscode.FileType;
}

export class MathHubTreeProvider implements vscode.TreeDataProvider<MHTreeItem|FileEntry> {

    getTreeItem(element: MHTreeItem|FileEntry): vscode.TreeItem | Thenable<vscode.TreeItem> {
        if (element instanceof MHTreeItem) {
            return element;
        }
        let ret = new vscode.TreeItem(element.uri,element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        if (element.type === vscode.FileType.File) {
            ret.contextValue = "file";
            ret.command = {
                command:"stexide.openFile",
                title:"Open File",
                arguments:[element.uri]
            };
            ret.iconPath = new vscode.ThemeIcon("file");
        } else {
            ret.iconPath = new vscode.ThemeIcon("file-directory");
        }
        return ret;
    }

    async getChildren(element?: MHTreeItem|FileEntry): Promise<(MHTreeItem|FileEntry)[]> {
        if (!element) {
            return Promise.resolve(this.roots);
        }
        if (element instanceof MHTreeItem) {
            if ((<RepoGroup>element.mh).children !== undefined) {
                return Promise.resolve(element.children);
            }
            const uri = vscode.Uri.file((<Repository>element.mh).localPath);
            const children = await this.readdir(uri.fsPath);
            const result : FileEntry[] = [];
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (
                    child !== "content" &&
                    child !== "errors" &&
                    child !== "narration" &&
                    child !== "relational" &&
                    child !== "bin" &&
                    child !== "xhtml" &&
                    child !== "buildresults" &&
                    child !== "export" &&
                    child !== ".git"
                ) {
                    const stat = new FileStat(await this.filestat(path.join(uri.fsPath, child)));
                    result.push({
                        uri:vscode.Uri.file(path.join(uri.fsPath,child)),
                        type:stat.type
                    });
                }
            }
            return Promise.resolve(result);
        } else {
            const uri = element.uri;
            const children = await this.readdir(uri.fsPath);
            const result : FileEntry[] = [];
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const stat = new FileStat(await this.filestat(path.join(uri.fsPath, child)));
                result.push({
                    uri:vscode.Uri.file(path.join(uri.fsPath,child)),
                    type:stat.type
                });
            }
            return Promise.resolve(result);
        }
    }

    private readdir(s : string) : Promise<string[]> {
        return new Promise((resolve,reject) => {
            fs.readdir(s,(error,children) => this.handleResult(resolve,reject,error,children));
        });
    }

    private filestat(s : string) : Promise<fs.Stats> {
        return new Promise((resolve,reject) => {
            fs.stat(s, (error,stat) => this.handleResult(resolve,reject,error,stat));
        });
    }

    private handleResult<T>(resolve: (result:T) => void,reject: (error:Error) => void, error:Error|null|undefined, result:T): void {
        if(error){reject(error);} else {resolve(result);}
    }

    roots: MHTreeItem[] = [];
    populate(ti:MHTreeItem) {
        let asgroup = <RepoGroup>ti.mh;
        if (asgroup.children !== undefined) {
            for (const c of asgroup.children) {
                let nti = new MHTreeItem(c,ti);
                ti.children.push(nti);
                this.populate(nti);
            }
        }
    }

    private _onUpdated = new vscode.EventEmitter<void>();
    private _onDidChangeTreeData = new vscode.EventEmitter<MHTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData?: vscode.Event<void | MHTreeItem | MHTreeItem[] | null | undefined> | undefined =
        this._onDidChangeTreeData.event;
    
    installArchive(archive: string) {
        this.showProgressUntilUpdated();
        this.context.client?.sendNotification(new ProtocolNotificationType<InstallMessage, void>("sTeX/installArchive"), { archive });
        const setDisabledContextValueRec = (mhti: MHTreeItem) => {
            mhti.contextValue = "disabled";
            mhti.children?.forEach(setDisabledContextValueRec);
        };
        this.roots.forEach(setDisabledContextValueRec);
        this._onDidChangeTreeData.fire();
    }

    updateRemote() {
        this.context.client
            ?.sendRequest(new ProtocolRequestType0<MHEntry[], any, any, any>("sTeX/getMathHubContent"))
            ?.then((ls) => {
                const newRoots: MHTreeItem[] = [];
                for (const mh of ls) {
                    let ti = new MHTreeItem(mh);
                    newRoots.push(ti);
                    this.populate(ti);
                }
                this.roots.splice(0, this.roots.length, ...newRoots ?? []);
                this._onDidChangeTreeData.fire();
                this._onUpdated.fire();
            });
    }

    showProgressUntilUpdated(): void {
        vscode.window.withProgress({ location: { viewId: "stexidemathhub" } }, () => new Promise((r) => this._onUpdated.event(r)));
    }

    constructor(private context: STeXContext) {
        context.mathhub = this;
        this.showProgressUntilUpdated();
        this.updateRemote();
    }
}