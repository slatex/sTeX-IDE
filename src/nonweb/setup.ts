import { IWizardWorkflowManager, PerformFinishResponse, SEVERITY, BUTTONS, ValidatorResponse, WebviewWizard, WizardDefinition, IWizardPage } from "@redhat-developer/vscode-wizard";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { launchLocal } from "./launches";
import { add_exe, JAVAVERSION, LocalSTeXContext, MMTVERSION, STEXVERSION } from "../extension";
import { call_cmd, openHTML } from "../util/utils";

function singleValidationResponse(id: string, content: string, severity: SEVERITY): ValidatorResponse {
    return { items: [{ severity, template: { id, content } }] };
}

function wizardError(id: string, content: string): ValidatorResponse {
    return singleValidationResponse(id, content, SEVERITY.ERROR);
}

function wizardWarning(id: string, content: string): ValidatorResponse {
    return singleValidationResponse(id, content, SEVERITY.WARN);
}

function wizardInfo(id: string, content: string): ValidatorResponse {
    return singleValidationResponse(id, content, SEVERITY.INFO);
}

async function validateJarPath(parameters: WorkflowData,ctx:LocalSTeXContext): Promise<ValidatorResponse> {
    const jarPath = parameters.jarPath?.trim();
    ctx.reset();
    if (!jarPath) {
        return wizardWarning("jarPath", "May not be empty");
    } else if (!fs.existsSync(jarPath)) {
        return wizardError("jarPath", "File does not exist");
    }
    await vscode.workspace.getConfiguration("stexide").update("mmt.jarPath", jarPath, vscode.ConfigurationTarget.Global);
    return ctx.mmtversion().then((version) => {
        if (!version) {
            return wizardError("jarPath", "An unknown error occurred! Could not get version");
        }
        if (version.newer_than(MMTVERSION)) {
            return wizardInfo("jarPath", `MMT Version: ${version.toString()}`);
        }
        parameters.jarPath = undefined;
        return wizardError("jarPath", `MMT Version ${version.toString()} is outdated. Please download at least version ${MMTVERSION.toString()}!`);
    }).catch((error) => {
        if (error.code === "ENOENT") {
            return wizardError("jarPath", "Could not execute <code>java</code>");
        }
        return wizardError("jarPath", "An unknown error occurred! Could not get version");
    });
}

type FileAccess = "F_OK" | "R_OK" | "W_OK" | "X_OK";

function hasFileAccess(path: string, access: FileAccess[]): boolean {
    try {
        fs.accessSync(path, access.reduce((p, c) => p | fs.constants[c], 0));
        return true;
    } catch {
        return false;
    }
}

async function validateMathhubPath(parameters: WorkflowData): Promise<ValidatorResponse> {
    const mathhubPath = parameters.mathhubPath?.trim();
    if (!mathhubPath) {
        return wizardWarning("mathhubPath", "May not be empty");
    } else if (!fs.existsSync(mathhubPath)) {
        return wizardWarning("mathhubPath", "Path does not exist but will be created");
    } else if (!fs.statSync(mathhubPath).isDirectory()) {
        return wizardError("mathhubPath", "Path is not a directory");
    } else if (!hasFileAccess(mathhubPath, ["R_OK", "W_OK"])) {
        return wizardError("mathhubPath", "Missing read or write permissions");
    }
    return { items: [] };
}



async function validateJavaHome(parameters: WorkflowData,ctx:LocalSTeXContext): Promise<ValidatorResponse> {
    const javaHome = parameters.javaHome?.trim();
    if (!javaHome) {
        ctx.javaPath().then(r => {
            if (r) {
                parameters.javaHome = r;
                return wizardInfo("javaHome", `Path: ${r}`);
            } else {
                return wizardError("javaHome", "Could not find <code>java</code> executable");
            }
        });
    } else if (!hasFileAccess(add_exe(path.join(javaHome, "java")), ["X_OK"])) {
        return wizardError("javaHome", "Could not find <code>java</code> executable");
    } else {
        parameters.javaHome = javaHome;
        await vscode.workspace.getConfiguration("stexide").update("mmt.javaHome", javaHome, vscode.ConfigurationTarget.Global);
        const version = await ctx.javaVersion();
        if (!version) return wizardError("javaHome","Could not determine java version");
        if (version < JAVAVERSION) {
            return wizardError("javaHome",`Java Version ${version} is outdated; this extension requires java version ${JAVAVERSION} or higher.`);
        }
        return wizardInfo("javaHome", `Path: ${add_exe(path.join(javaHome,"java"))}; Version: ${version}`);
    }
    return wizardError("javaHome", "Could not find <code>java</code> executable");
}

export async function setup(stexc: LocalSTeXContext): Promise<void> {
    const jarPath = stexc.jarPath;
    const mathhub = stexc.mathhub;
    var java_home = await stexc.javaPath();
    const hasLatex = await stexc.hasLatex();
    const hasSTeX = await stexc.hasSTeX();
    const stexv = await stexc.stexversion();
    const tex_works = hasLatex && hasSTeX && (stexv ? stexv.newer_than(STEXVERSION) : false);
    if (java_home) {
        if (process.platform.startsWith("win")) {
            java_home = java_home.slice(0,-9);
        } else {
            java_home = java_home.slice(0,-5);
        }
    }
    async function validateTeX() {
        if (!hasLatex) return wizardError("latex","Could not find LaTeX on your system. Please install LaTeX")
        return { items: [] };
    }
    async function validatesTeX() {
        if (!hasSTeX) return wizardError("stex","Could not find sTeX on your system. Please make sure your LaTeX distribution is up to date and the sTeX package is installed.")
        return { items: [] };
    }
    async function validatesTeXVersion() {
        if (!stexv) return wizardError("stexversion","Could not determine you sTeX version");
        if (!stexv.newer_than(STEXVERSION))
            return wizardError("stexversion",`Extension requires at least sTeX Version` + STEXVERSION.toString() + ".\nPlease update your sTeX package.")
        return { items: [] };
    }
    return new Promise<void>((resolve) => {
        const def = <WizardDefinition>{
            title: "sTeX Setup",
            description: "",
            buttons: [{ id: BUTTONS.FINISH, label: "Finish" }],
            pages: [{
                title: "",
                asyncValidator: (parameters: WorkflowData, previousParameters: WorkflowData) => [
                    validateJarPath(parameters,stexc),
                    validateMathhubPath(parameters),
                    validateJavaHome(parameters,stexc),
                    validateTeX(),validatesTeX(),validatesTeXVersion()
                ],
                fields: [
                    {
                        id:"tex-section",
                        label: "sTeX",
                        childFields: [
                            {
                                id:"latex",
                                label:"LaTeX found",
                                type:"checkbox",
                                initialState: { enabled: false },
                                initialValue: hasLatex
                            },
                            {
                                id:"stex",
                                label:"sTeX found",
                                type:"checkbox",
                                initialState: { enabled: false },
                                initialValue: hasSTeX
                            },
                            {
                                id:"stexversion",
                                label:"sTeX Version " + (stexv ? stexv.toString() : "could not be determined!"),
                                type:"checkbox",
                                initialState: { enabled: false },
                                initialValue: (stexv ? stexv.newer_than(STEXVERSION) : false)
                            },
                        ]
                    },
                    {
                        id: "java-section",
                        label: "Java",
                        description: "Please select the Java installation directory.",
                        childFields: [{
                            id: "javaHome",
                            label: "Select directory",
                            type: "file-picker",
                            dialogOptions: {
                                canSelectFiles: false,
                                canSelectFolders: true
                            },
                            initialValue: java_home? java_home : ""
                        }]
                    },
                    {
                        id: "mmt-section",
                        label: "MMT",
                        description: "This Plugin needs to know the location of your MMT.jar, which you can " +
                            "download <a href='https://github.com/UniFormal/MMT/releases'>here</a>.",
                        childFields: [{
                            id: "jarPath",
                            label: "Select <code>MMT.jar</code>",
                            initialValue: jarPath,
                            placeholder: "/path/to/mmt.jar",
                            type: "file-picker",
                        }]
                    },
                    {
                        id: "mathhub-section",
                        label: "MathHub",
                        description: "It also needs to know the location of you MathHub directory" +
                            "(MathHub/MMT archives are stored there).<br><i>Can be a new (empty) directory.</i>",
                        childFields: [{
                            id: "mathhubPath",
                            label: "Select directory",
                            type: "file-picker",
                            dialogOptions: {
                                canSelectFiles: false,
                                canSelectFolders: true
                            },
                            placeholder: "/path/to/mathhub-directory",
                            initialValue: mathhub,
                            initialState: { enabled: !mathhub },
                        }]
                    }
                ]
            }],
            workflowManager: <GenericWizardWorkflowManager<WorkflowData>>{
                canFinish(wizard: WebviewWizard, data: WorkflowData): boolean {
                    return tex_works && !!data.jarPath && !!data.mathhubPath;
                },
                performFinish(wizard: WebviewWizard, data: WorkflowData): Promise<PerformFinishResponse | null> {
                    if (data.mathhubPath && data.mathhubPath != mathhub) {
                        stexc.setMathHub(data.mathhubPath);
                    }
                    return stexc.isValid().then(valid => {
                        if (valid) {
                            const configStore = vscode.workspace.getConfiguration("stexide");
                            const returnObject = Promise.all([
                                configStore.update("mmt.jarPath", data.jarPath, vscode.ConfigurationTarget.Global),
                                configStore.update("mmt.javaHome", data.javaHome ?? "", vscode.ConfigurationTarget.Global),
                            ])
                                .then(() => {vscode.commands.executeCommand("setContext", "stex:enabled", true)})
                                .then(() => resolve())
                                .then(() => launchLocal(stexc))
                                .then(() => {
                                    const remote = configStore.get<string>("remoteMathHub");
                                    openHTML(remote + "/fullhtml?archive=sTeX/Documentation&filepath=tutorial/full.en.xhtml");
                                });
                            return {
                                close: true,
                                success: true,
                                returnObject,
                                templates: []
                            };
                        } else {
                            return {
                                close:false,
                                success:false,
                                returnObject:null,
                                templates:[]
                            }
                        }
                    });
                }
            }
        };
        vscode.commands.executeCommand("setContext", "stex:enabled", false);
        const wizard = new WebviewWizard("stexsetup", "stexsetup", stexc.vsc, def, new Map());
        wizard.open();
    });
}

type WorkflowData = {
    mathhubPath?: string,
    jarPath?: string,
    javaHome?: string
};

interface GenericWizardWorkflowManager<T> extends IWizardWorkflowManager {
    canFinish?(wizard: WebviewWizard, data: T): boolean;
    performFinish(wizard: WebviewWizard, data: T): Promise<PerformFinishResponse | null>;
    getNextPage?(page: IWizardPage, data: T): IWizardPage | null;
    getPreviousPage?(page: IWizardPage, data: T): IWizardPage | null;
    performCancel?(): void;
}
