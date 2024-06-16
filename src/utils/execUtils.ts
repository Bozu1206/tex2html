import * as cp from 'child_process';
import * as vscode from 'vscode';
import { checkDependencies } from '../dependencyCheck';

export function execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        cp.exec(command, (err, stdout, stderr) => {
            if (err) { 
                vscode.window.showErrorMessage("ERROR: " + stderr.trim());
                checkDependencies();
                console.log(stderr.trim());
                reject(err);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

