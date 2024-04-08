import * as vscode from 'vscode';
import { checkDependencies } from './dependencyCheck';
import { activateCommand } from './commandHandler';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.convertTexToHtml', () => activateCommand(context));
    context.subscriptions.push(disposable);
    // Check for dependencies on activation
    checkDependencies();
}


export function deactivate() {}
