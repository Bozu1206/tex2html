import * as vscode from 'vscode';
import { convertTexToHtml, convertTexToPDF } from './converter';

export async function tex2htmlCommand(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active .tex file.');
        return;
    }

    await convertTexToHtml(editor.document.fileName, context);
}

export async function tex2PDFCommand(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active .tex file.');
        return;
    }

    await convertTexToPDF(editor.document.fileName, context);
}
