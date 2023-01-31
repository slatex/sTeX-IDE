import { IWizardWorkflowManager, PerformFinishResponse, SEVERITY, BUTTONS, ValidatorResponse, WebviewWizard, WizardDefinition, IWizardPage } from "@redhat-developer/vscode-wizard";
import { STeXContext } from "../shared/context";
import { spawn } from "child_process";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";


export function getMathhubEnvConfigPath(): string {
    return path.join((process.env.HOME || process.env.USERPROFILE) as string, ".stex", "mathhub.path");
}

export function getMathHub(): string | undefined {
    const mathhub = process.env.MATHHUB;
    if (mathhub) {
        return mathhub;
    }
    const mathhubEnvConfig = getMathhubEnvConfigPath();
    if (fs.existsSync(mathhubEnvConfig)) {
        return fs.readFileSync(mathhubEnvConfig).toString().trim();
    }
    return undefined;
}

export function getJarPath(): string | undefined {
    const config = vscode.workspace.getConfiguration("stexide");
    return config.get<string>("mmt.jarPath")?.trim();
}

function setMathHub(mathhubPath: string) {
    const mathhubEnvConfig = getMathhubEnvConfigPath();
    fs.mkdirSync(path.dirname(mathhubEnvConfig), { recursive: true });
    fs.mkdirSync(mathhubPath, { recursive: true });
    fs.writeFileSync(mathhubEnvConfig, mathhubPath);
}

async function call_cmd(cmd:string,args:string[]) : Promise<string | undefined> {
    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        const resolveWithResult = () => stdout.trim().length > 0
            ? resolve(stdout.trim())
            : reject(stderr);
        const env = process.env;
        const proc = spawn(cmd, args, { env })
            .on("error", reject)
            .on("exit", resolveWithResult)
            .on("close", resolveWithResult);
        proc.stdout.on("data", (data) => { stdout += data; });
        proc.stderr.on("data", (data) => { stderr += data; });
    });
}

async function getMMTVersion(jarPath: string, javaHome?: string): Promise<string | undefined> {
    return call_cmd("java",["-cp", jarPath, "info.kwarc.mmt.api.frontend.Run", "--version"]);
}

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

async function validateJarPath(parameters: WorkflowData): Promise<ValidatorResponse> {
    const jarPath = parameters.jarPath?.trim();
    if (!jarPath) {
        return wizardWarning("jarPath", "May not be empty");
    } else if (!fs.existsSync(jarPath)) {
        return wizardError("jarPath", "File does not exist");
    }
    return getMMTVersion(jarPath, parameters.javaHome).then((version) => {
        return wizardInfo("jarPath", `MMT Version: ${version}`);
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

async function validateJavaHome(parameters: WorkflowData): Promise<ValidatorResponse> {
    const javaHome = parameters.javaHome?.trim();
    if (!javaHome) {
        let which : string | undefined = undefined;
        if (process.platform.startsWith("win")) {
            which = (await call_cmd("cmd",["/C","\"where java\""]))?.trim();
            if (!which || !which.endsWith("java.exe")) {
                return wizardError("javaHome", "Could not find <code>java</code> executable");
            }
            which = which.slice(0,-9)
        } else {
            which = await call_cmd("which",["java"]);
            if (which) which = which.trim();
            if (!which || !which.endsWith("java")) {
                return wizardError("javaHome", "Could not find <code>java</code> executable");
            }
            which = which.slice(0,-5)
        };
        parameters.javaHome = which;
        return { items: [] };
    } else if (javaHome && !hasFileAccess(path.join(javaHome, "bin", "java"), ["X_OK"])) {
        return wizardError("javaHome", "Could not find <code>java</code> executable");
    }
    return { items: [] };
}

export async function setup(stexc: STeXContext): Promise<void> {
    const jarPath = getJarPath();
    const mathhub = getMathHub();
    if (jarPath && mathhub) {
        return;
    }
    return new Promise<void>((resolve) => {
        const def = <WizardDefinition>{
            title: "sTeX Setup",
            description: "",
            buttons: [{ id: BUTTONS.FINISH, label: "Finish" }],
            pages: [{
                title: "",
                asyncValidator: (parameters: WorkflowData, previousParameters: WorkflowData) => [
                    validateJarPath(parameters),
                    validateMathhubPath(parameters),
                    validateJavaHome(parameters)
                ],
                fields: [
                    {
                        id: "java-section",
                        label: "Java",
                        description: "Java is required. Could not find <code>JAVA_HOME</code> in environment " +
                            "variables.<br>Please select the Java installation directory.",
                        childFields: [{
                            id: "javaHome",
                            label: "Select directory",
                            type: "file-picker",
                            dialogOptions: {
                                canSelectFiles: false,
                                canSelectFolders: true
                            },
                            initialState: {
                                visible: !process.env.JAVA_HOME
                            }
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
                    return !!data.jarPath && !!data.mathhubPath;
                },
                performFinish(wizard: WebviewWizard, data: WorkflowData): Promise<PerformFinishResponse | null> {
                    if (!mathhub && data.mathhubPath) {
                        setMathHub(data.mathhubPath);
                    }
                    const configStore = vscode.workspace.getConfiguration("stexide");
                    const returnObject = Promise.all([
                        configStore.update("mmt.jarPath", data.jarPath, vscode.ConfigurationTarget.Global),
                        configStore.update("mmt.javaHome", data.javaHome ?? "", vscode.ConfigurationTarget.Global),
                    ])
                        .then(() => vscode.commands.executeCommand("setContext", "stex:enabled", true))
                        .then(() => resolve());
                    return Promise.resolve({
                        close: true,
                        success: true,
                        returnObject,
                        templates: []
                    });
                }
            }
        };
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
