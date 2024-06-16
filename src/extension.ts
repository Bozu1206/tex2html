import * as vscode from 'vscode';
import { checkDependencies } from './dependencyCheck';
import { tex2htmlCommand, tex2PDFCommand } from './commandHandler';
import { selectDirectory } from './selectDirectory';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.convertTexToHtml', () => tex2htmlCommand(context));
    let generatePDF = vscode.commands.registerCommand('extension.generatePDF', () => tex2PDFCommand(context));
    let selectDir = vscode.commands.registerCommand('extension.selectDirectory', async (configKey: string) => selectDirectory(configKey));

    context.subscriptions.push(disposable, generatePDF, selectDir);
    
    // Check for dependencies on activation
    checkDependencies();
}

export function deactivate() {}
