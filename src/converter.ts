import * as vscode from 'vscode';
import * as path from 'path';
import { execCommand } from './utils/execUtils';
import { openHtmlInWebview } from './webviewManager';

export async function convertTexToHtml(texFilePath: string, context: vscode.ExtensionContext) {
    const scriptPath = path.join(__dirname, '..', 'out', 'preprocessor.py');
    const htmlFilePath = texFilePath.replace('.tex', '.html');
    
    // Preprocess .tex file
    const tempFilePath = await execCommand(`python "${scriptPath}" "${texFilePath}"`);
    
    // Convert to HTML
    await execCommand(`pandoc "${tempFilePath}" --mathjax -t html -s -o "${htmlFilePath}"`);
    
    // Display in webview
    openHtmlInWebview(htmlFilePath, context);
}
