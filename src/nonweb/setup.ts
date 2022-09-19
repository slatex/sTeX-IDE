import { IWizardWorkflowManager, PerformFinishResponse, SEVERITY, BUTTONS, ValidatorResponse, WebviewWizard, WizardDefinition } from "@redhat-developer/vscode-wizard";
import { launchSTeXServerWithArgs } from "./launches";
import { STeXContext } from "../shared/context";
import { exec } from "child_process";
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
    const mathhubEnvConfig = getMathhubEnvConfigPath()
    if (fs.existsSync(mathhubEnvConfig)) {
        return fs.readFileSync(mathhubEnvConfig).toString().trim();
    }
    return undefined;
}

export function getJarpath(): string | undefined {
    const config = vscode.workspace.getConfiguration("stexide");
    return config.get<string>("jarpath")?.trim();
}

function setMathHub(mathhubPath: string) {
    const mathhubEnvConfig = getMathhubEnvConfigPath()
    fs.mkdirSync(path.dirname(mathhubEnvConfig), { recursive: true });
    fs.writeFileSync(mathhubEnvConfig, mathhubPath);
}

async function getMMTVersion(jarpath: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";

        const proc = exec(`java -classpath "${jarpath}" info.kwarc.mmt.api.frontend.Run "--version"`);
        proc.stdout?.on("data", (data) => { stdout += data });
        proc.stderr?.on("data", (data) => { stderr += data });

        const resolveWithResult = () => stdout.trim().length > 0
            ? resolve(stdout)
            : reject(stderr);
        proc.addListener("error", reject);
        proc.addListener("exit", resolveWithResult);
        proc.addListener("close", resolveWithResult);
    });
}

function singleValidationResponse(id: string, content: string, severity: SEVERITY): ValidatorResponse {
    return { items: [{ severity, template: { id, content } }] }
}

function wizardError(id: string, content: string): ValidatorResponse {
    return singleValidationResponse(id, content, SEVERITY.ERROR)
}

function wizardWarning(id: string, content: string): ValidatorResponse {
    return singleValidationResponse(id, content, SEVERITY.WARN)
}

function wizardInfo(id: string, content: string): ValidatorResponse {
    return singleValidationResponse(id, content, SEVERITY.INFO)
}

async function validateJarPath(parameters: any): Promise<ValidatorResponse> {
    const jarPath = parameters.jarpath?.trim();
    if (!jarPath) {
        return wizardWarning("jarpathValidation", "May not be empty");
    } else if (!jarPath.toUpperCase().endsWith("/MMT.JAR")) {
        return wizardError("jarpathValidation", "Filename must be 'mmt.jar'");
    } else if (!fs.existsSync(jarPath)) {
        return wizardError("jarpathValidation", "File does not exist.");
    }
    return getMMTVersion(jarPath).then((version) => {
        return wizardInfo("jarpathValidation", `MMT Version: ${version}`);
    }).catch((error) => {
        return wizardWarning("jarpathValidation", "Could not get version, is Java installed?")
    });
}

function canReadAndWrite(path: string): boolean {
    try {
        fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch {
        return false;
    }
}

async function validateMathhubPath(parameters: any): Promise<ValidatorResponse> {
    const mathhubPath = parameters.mathhub?.trim();
    if (!mathhubPath) {
        return wizardWarning("mathhubValidation", "May not be empty");
    } else if (!fs.existsSync(mathhubPath)) {
        return wizardError("mathhubValidation", "Path does not exist.");
    } else if (!fs.statSync(mathhubPath).isDirectory()) {
        return wizardError("mathhubValidation", "Path is not a directory.");
    } else if (!canReadAndWrite(mathhubPath)) {
        return wizardError("mathhubValidation", "Missing read or write permissions.");
    }
    return { items: [] };
}

export function setup(stexc: STeXContext) {
    const jarpath = getJarpath();
    const mathhub = getMathHub();
    if (jarpath && mathhub) {
        return;
    }
    const def = <WizardDefinition>{
        title: 'sTeX Setup',
        description: "",
        buttons: [{ id: BUTTONS.FINISH, label: "Finish" }],
        pages: [{
            title: "",
            id: "stexsetup",
            description: "",
            asyncValidator: (parameters: any, previousParameters: any): Promise<ValidatorResponse>[] => [
                validateJarPath(parameters),
                validateMathhubPath(parameters)
            ],
            fields: [
                {
                    id: "jarsection",
                    label: "MMT",
                    description: "This Plugin needs to know the location of your MMT.jar, which you can download" +
                        " <a href='https://github.com/UniFormal/MMT/releases'>here</a>",
                    childFields: [{
                        id: "jarpath",
                        label: "MMT.jar",
                        initialValue: jarpath,
                        placeholder: "/path/to/mmt.jar",
                        type: "file-picker",
                        description: ""
                    }]
                },
                {
                    id: "mathhubsection",
                    label: "MathHub Path",
                    description: "It also needs to know the location of you MathHub-Directory",
                    childFields: [{
                        id: "mathhub",
                        label: "MathHub",
                        type: "file-picker",
                        dialogOptions: {
                            canSelectFiles: false,
                            canSelectFolders: true
                        },
                        placeholder: "/path/to/mathhub-directory",
                        initialValue: mathhub,
                        initialState: { enabled: !mathhub },
                        description: "<br>The directory where all MathHub/MMT archives are stored.<br><i>Can be a new (empty) directory.</i>"
                    }]
                }
            ]
        }],
        workflowManager: <IWizardWorkflowManager>{
            canFinish(wizard: WebviewWizard, data: any): boolean {
                return data.jarpath && data.mathhub;
            },
            performFinish(wizard: WebviewWizard, data: any): Promise<PerformFinishResponse | null> {
                if (!mathhub && data.mathhub) {
                    setMathHub(data.mathhub);
                }
                const returnObject = vscode.workspace.getConfiguration("stexide")
                    .update("jarpath", data.jarpath, vscode.ConfigurationTarget.Global)
                    .then(() => {
                        launchSTeXServerWithArgs(stexc, data.jarpath, data.mathhub);
                        vscode.commands.executeCommand("setContext", "stex:enabled", true);
                    })
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
}

