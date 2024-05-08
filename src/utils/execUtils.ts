import * as cp from 'child_process';
import * as vscode from 'vscode';

export function execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        cp.exec(command, (err, stdout, stderr) => {
            if (err) { 
                vscode.window.showErrorMessage("ERROR: ", stderr.trim());
                console.log(stderr.trim());
                reject(err);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

