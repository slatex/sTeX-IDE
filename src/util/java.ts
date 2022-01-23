import locateJavaHome from "locate-java-home";
import * as fs from "fs";
import * as path from "path";
import { workspace, OutputChannel } from "vscode";
import { parse } from "shell-quote";

function jvmOpts(outputChannel: OutputChannel): string[] {
  if (workspace.workspaceFolders) {
    const jvmoptsPath = path.join(
      workspace.workspaceFolders[0].uri.fsPath,
      ".jvmopts"
    );
    if (fs.existsSync(jvmoptsPath)) {
      outputChannel.appendLine("Using JVM options set in " + jvmoptsPath);
      const raw = fs.readFileSync(jvmoptsPath, "utf8");
      return raw.match(/[^\r\n]+/g) || [];
    }
  }
  return [];
}

function javaOpts(outputChannel: OutputChannel): string[] {
  function expandVariable(variable: string | undefined): string[] {
    if (variable) {
      outputChannel.appendLine("Using JAVA options set in JAVA_OPTS");
      return parse(variable).filter(
        (entry): entry is string => {
          if (typeof entry === "string") {
            return true;
          } else {
            outputChannel.appendLine(
              `Ignoring unexpected JAVA_OPTS token: ${entry}`
            );
            return false;
          }
        }
      );
    } else {
      return [];
    }
  }
  const javaOpts = expandVariable(process.env.JAVA_OPTS);
  const javaFlags = expandVariable(process.env.JAVA_FLAGS);
  return javaOpts.concat(javaFlags);
}

export function getJavaOptions(outputChannel: OutputChannel): string[] {
  const combinedOptions = [
    ...javaOpts(outputChannel),
    ...jvmOpts(outputChannel)
  ];
  const options = combinedOptions.reduce(
    (options, line) => {
      if (
        line.startsWith("-") &&
        // We care most about enabling options like HTTP proxy settings.
        // We don't include memory options because Metals does not have the same
        // memory requirements as for example the sbt build.
        !line.startsWith("-Xms") &&
        !line.startsWith("-Xmx") &&
        !line.startsWith("-Xss")
      ) {
        return [...options, line];
      }
      return options;
    },
    [] as string[]
  );
  return options;
}

export function getJavaHome(): Promise<string> {
  const userJavaHome = workspace.getConfiguration("metals").get("javaHome");
  if (typeof userJavaHome === "string" && userJavaHome.trim() !== "") {
    return Promise.resolve(userJavaHome);
  } else {
    return new Promise((resolve, reject) => {
      locateJavaHome({}, (err, javaHomes) => {
        if (err) {
          reject(err);
        } else if (!javaHomes || javaHomes.length === 0) {
          reject(new Error("No suitable Java version found"));
        } else {
          javaHomes.sort((a, b) => {
            return b.security - a.security;
          });
          const jdkHome = javaHomes.find(j => j.isJDK);
          if (jdkHome) {
            resolve(jdkHome.path);
          } else {
            resolve(javaHomes[0].path);
          }
        }
      });
    });
  }
}

import {STeXContext} from '../extension';
import * as vscode from 'vscode';

export function javaErr(context : STeXContext) {
	const message =
	"Unable to find Java home. To fix this problem, update the 'Java Home' setting to point to a Java 11 home directory";
  	context.outputChannel.appendLine(message);
  	vscode.window.showErrorMessage(message, context.openSettingsAction).then(choice => {
		if (choice === context.openSettingsAction) {
	  	vscode.commands.executeCommand("workbench.action.openSettings");
		}
  	});
}