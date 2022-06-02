import { STeXContext } from "../shared/context";
import * as vscode from 'vscode';
import {PerformFinishResponse, WebviewWizard, WizardDefinition} from "vscode-wizard";
import * as fs from "fs";
import { getJavaHome, javaErr } from "../util/java";
import path = require("path");
import { exec, spawn } from "child_process";
import { launchLocal } from "./launches";
import { currentPanels } from "vscode-wizard/lib/pageImpl";

export function getMathHub(): string | undefined {
    let mathhub = process.env.MATHHUB;
    if (mathhub) {
        return mathhub;
    } else {
        let file = process.env.HOME + "/.stex/mathhub.path";
        if (fs.existsSync(file)) {
            return fs.readFileSync(file).toString().trim();
        } else {
            return undefined;
        }
    }
}

export function getJarpath() : string | undefined {
	let config = vscode.workspace.getConfiguration("stexide");
	return config.get("jarpath");
}

function setMathHub(path : string) {
    let file = process.env.HOME + "/.stex/mathhub.path";
    fs.writeFileSync(file,path);
}

async function getMMTVersion(stexc: STeXContext,jarpath: string): Promise<string | undefined> {
	return await getJavaHome().catch(err => {
        javaErr(stexc);
        return undefined;
    })
	.then(async javaHome => {
        if (!javaHome) {
            javaErr(stexc);
            return undefined;
        }
	    let javaPath = path.join(javaHome, "bin", "java");
        let out = "";
        let p = new Promise((resolve,reject) => {
            let e = exec(javaPath + " -classpath \"" + jarpath + "\" info.kwarc.mmt.api.frontend.Run \"--version\"").stdout?.on('data',data => {
                out += data;
            });
            e?.addListener("error", reject);
            e?.addListener("exit",resolve);
            e?.addListener("close",resolve);
        });
        await p;
        if (out === "") {
            return undefined;
        } else {
            return out;
        }
    });
}

export function setup(stexc: STeXContext) {
    let jarpath = getJarpath();
	if (!jarpath || jarpath === "") {
		let mathhub = getMathHub();
        let validjar = false;
        let currentjar = "";
		let def = {
			title: 'sTeX Setup',
			description: "",
			pages: [{
				title: "",
				id: "stexsetup",
				description:"",
				fields:[
				{
					id:"jarsection",
					label:"MMT",
					description:"This Plugin needs to know the location of your MMT.jar, which you can download" +
					" <a href='https://github.com/UniFormal/MMT/releases'>here</a>",
					childFields:[{
						id:"jarpath",
						label:"MMT.jar",
						type:"file-picker",
                        description:""
					}]
				},
				{
					id:"mathhubsection",
					label:"MathHub Path",
					description:"It also needs to know the location of you MathHub-Directory:",
					childFields:[{
						id:"mathhub",
						label:"MathHub",
						type:"textbox",
						initialValue:mathhub? mathhub : "/some/directory/path",
						initialState:{enabled:mathhub?false:true},
						description:mathhub?"MathHub path provided by environment variable or .mathhub-file":""
					}]
				}
			]
			}],
			workflowManager: {
				canFinish(wizard: WebviewWizard, data:any): boolean {
                    let jar : string | undefined = data.jarpath;
                    if (!jar || !jar.trim().toUpperCase().endsWith("MMT.JAR") || !fs.existsSync(jar.trim())) {return false;}
                    if (jar !== currentjar) {
                        currentjar = jar;
                        getMMTVersion(stexc,jar.trim()).then(version => {
                            if (version) {
                                validjar = true;
                                def.pages[0].fields[0].childFields[0].description = "MMT Version: " + version;
                                wizard.pages = [];
                                wizard.initialData.set("mathhub",data.mathhub).set("jarpath",data.jarpath);
                                wizard.open();
                            }
                        });
                        validjar = false;
                    }
                    return validjar && (mathhub !== undefined || data.mathhub !== undefined);
				},
				performFinish(wizard: WebviewWizard, data:any): Promise<PerformFinishResponse | null> {
                    if (!mathhub && data.mathhub) {
                        setMathHub(data.mathhub);
                    }

					return Promise.resolve({
                        close:true,
                        success:true,
                        returnObject:
                        vscode.workspace.getConfiguration("stexide").update("jarpath",data.jarpath,vscode.ConfigurationTarget.Global).then(() => launchLocal(stexc)),
                        templates:[]
                    });
				}
			}
		};
		let wiz:WebviewWizard = new WebviewWizard("stexsetup","stexsetup",stexc.vsc,def,new Map());
		wiz.open();
	}
}