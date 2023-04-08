
import * as vscode from 'vscode';
import {registerCommands} from './shared/commands';
import { launchLocal, launchRemote } from './nonweb/launches';
import { STeXContext } from './shared/context';
import { setup } from './nonweb/setup';


let stexc : STeXContext;

export class Version {
	major : number
	minor : number
	revision: number
	constructor(s:string | [number,number,number]) {
		if (typeof(s) === "string") {
			const match = s.trim().split('.');
			if (match.length ==1 ) {
				[this.major,this.minor,this.revision] = [parseInt(match[0]),0,0];
			} else if (match.length == 2) {
				[this.major,this.minor,this.revision] = [parseInt(match[0]),parseInt(match[1]),0];
			} else {
				[this.major,this.minor,this.revision] = [parseInt(match[0]),parseInt(match[1]),parseInt(match[2])];
			}
		} else {
			[this.major,this.minor,this.revision] = s;
		}
	}
	toString() : string {
		return this.major.toString() + "." + this.minor.toString() + "." + this.revision.toString()
	}
	newer_than(that: Version):boolean {
		return this.major > that.major || (
			this.major == that.major && (
				this.minor > that.minor || (
					this.minor == that.minor && this.revision >= that.revision
				)
			)
		);
	}
}

export const MMTVERSION = new Version([24,1,0]);
export const STEXVERSION = new Version([3,3,0]);
export const JAVAVERSION = 11;

export async function activate(context: vscode.ExtensionContext) {
	local(context);
	//remote(context);
}

async function local(context: vscode.ExtensionContext) {
	stexc = new LocalSTeXContext(context);
	let local = <LocalSTeXContext>stexc;
	if (await local.isValid()) {
		launchLocal(local);
	} else {
		await setup(local);
	}

}

function remote(context: vscode.ExtensionContext) {
	class RemoteMathhub extends STeXContext {
		get mathhub() {return obtainMathHub();}
	}
	stexc = new RemoteMathhub(context);
	launchRemote(stexc);
}

export function deactivate() {
	if (stexc.client) {
		stexc.client.stop();
	}
}

import * as fs from "fs";
import * as path from "path";
import { call_cmd, getMathhubEnvConfigPath } from './util/utils';
import { integer } from 'vscode-languageclient';

const VERSION_REGEX = /\d+\.\d+(\.\d)?/

export class LocalSTeXContext extends STeXContext {
	private _mathhub: [string,boolean] | undefined
	private _mmtversion: Version | undefined
	private _javapath: string | undefined
	private _latex = false
	private _stexpath: string | undefined
	private _stexversion : Version | undefined

	async hasLatex(): Promise<boolean> {
		if (this._latex) return true;
		let res = await call_cmd("kpsewhich",["--version"]);
		this._latex = (res != undefined);
		return this._latex;
	}
	async hasSTeX(): Promise<boolean> {
		if (this._stexpath) return true;
		let res = await call_cmd("kpsewhich",["stex.sty"]);
		if (res) {
			this._stexpath = res.trim();
			this._latex = true;
			return true;
		}
		return false;
	}

	async isValid(): Promise<boolean> {
		let v = await this.mmtversion();
		let s = await this.stexversion();
		let j = await this.javaVersion();
		return v != undefined && s != undefined && v.newer_than(MMTVERSION) && s.newer_than(STEXVERSION) && j != undefined && j >= JAVAVERSION
	}
	/*{
		let v = await this.mmtversion();
		if (!v) return false;
		if (v.newer_than(MMTVERSION)) return true;
    await vscode.workspace.getConfiguration("stexide").update("mmt.jarPath", undefined, vscode.ConfigurationTarget.Global);
		return false;
	}*/
	reset() {
		this._mmtversion = undefined;
		this._javapath = undefined;
	}

	async stexversion(): Promise<Version | undefined> {
		if (this._stexversion) return this._stexversion
		await this.hasSTeX();
		if (this._stexpath) {
			let ret = fs.readFileSync(this._stexpath).toString();
			const regex = /\\message{\^\^J\*~This~is~sTeX~version~(\d+\.\d+\.\d+)~\*\^\^J}/
			const match = ret.match(regex);
			if (match) {
				const vstring = match[1];
				this._stexversion = new Version(vstring);
				return this._stexversion;
			}
		}
	}

	async mmtversion(): Promise<Version | undefined> {
		if (this._mmtversion) return this._mmtversion
		let jarPath = this.jarPath
		let javaPath = await this.javaPath();
		if (jarPath && javaPath) {
			var versionstr = await call_cmd(javaPath,["-cp", jarPath, "info.kwarc.mmt.api.frontend.Run", "--version"]);
			if (versionstr) {
				let match = versionstr.match(VERSION_REGEX);
				if (match) {
					this._mmtversion = new Version(match[0]);
				}
			}
		}
		return this._mmtversion;
	}

	override get mathhub(): [string,boolean] {
		if (!this._mathhub) {
			this._mathhub = obtainMathHub();
		}
		return this._mathhub;
	}

	get jarPath(): string | undefined {
		const config = vscode.workspace.getConfiguration("stexide");
		return config.get<string>("mmt.jarPath")?.trim();
	}

	async javaPath(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration("stexide");
		const jh = config.get<string>("mmt.javaHome")?.trim();
		if (jh) {
    	return add_exe(path.join(jh,"java"));
		} else if (this._javapath) {
    	return add_exe(path.join(this._javapath,"java"));
		} else {
			this._javapath = await getJavaHome();
			if (this._javapath) {
				return add_exe(path.join(this._javapath,"java"));
			}
		}
	}

	async javaVersion() : Promise<number | undefined> {
		const path = await this.javaPath();
		if (path){
			const out = await call_cmd(path,["-version","2>&1"]);
			if (out) {
				const vline = out.split('\n')[0].trim();
				const regex = /version "(\d+)\.(\d+)\..*"/;
				const match = vline.match(regex);
				if (match) {
					const major = parseInt(match[1]);
					const minor = parseInt(match[2]);
					return major + (minor / 10);
				} else {
					const regex = /version "(\d+)"/;
					const match = vline.match(regex);
					if (match) {
						const major = parseInt(match[1]);
						return major
					}
				}
			}
		}
	}

	setMathHub(mathhubPath: string) {
    const mathhubEnvConfig = getMathhubEnvConfigPath();
    fs.mkdirSync(path.dirname(mathhubEnvConfig), { recursive: true });
    fs.mkdirSync(mathhubPath, { recursive: true });
    fs.writeFileSync(mathhubEnvConfig, mathhubPath);
		this._mathhub = [mathhubPath,true];
	}
}

export function add_exe(s:string):string {
	if (process.platform.startsWith("win")) {
		return s + ".exe";
	} else return s;
}


async function getJavaHome(): Promise<string|undefined> {
	const env = process.env.JAVA_HOME;
	if (env) {
			return env + "/bin"
	} else {
			let which : string | undefined = undefined;
			if (process.platform.startsWith("win")) {
					which = (await call_cmd("cmd",["/C","\"where java\""]))?.trim();
					if (which && which.endsWith("java.exe")) {
							return which.slice(0,-9);
					}
					return undefined;
			} else {
					which = await call_cmd("which",["java"]);
					if (which) {
							which = which.trim();
							if (which.endsWith("java")) {
									return which.slice(0,-5)
							}
					}
					return undefined;
			};
	}
}

function obtainMathHub(): [string,boolean] {
	const mathhub = process.env.MATHHUB;
	if (mathhub) {
		return [mathhub,true];
	}
	const mathhubEnvConfig = getMathhubEnvConfigPath();
	if (fs.existsSync(mathhubEnvConfig)) {
		return [fs.readFileSync(mathhubEnvConfig).toString().trim(),true];
	}
	return [path.join((process.env.HOME || process.env.USERPROFILE) as string, "MathHub"),false];
}