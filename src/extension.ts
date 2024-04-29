import * as vscode from 'vscode';
import { checkDependencies } from './dependencyCheck';
import { tex2htmlCommand, tex2PDFCommand } from './commandHandler';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.convertTexToHtml', () => tex2htmlCommand(context));
    let generatePDF = vscode.commands.registerCommand('extension.generatePDF', () => tex2PDFCommand(context));

    context.subscriptions.push(disposable, generatePDF);
    
    // Check for dependencies on activation
    checkDependencies();
}

export function deactivate() {}
