import * as vscode from 'vscode';
import { convertTexToHtml } from './converter';

export async function activateCommand(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active .tex file.');
        return;
    }

    await convertTexToHtml(editor.document.fileName, context);
}
