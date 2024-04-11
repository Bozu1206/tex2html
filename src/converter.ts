import * as vscode from 'vscode';
import * as path from 'path';
import { execCommand } from './utils/execUtils';
import { openHtmlInWebview } from './webviewManager';

export async function convertTexToHtml(texFilePath: string, context: vscode.ExtensionContext) {
    const scriptPath =/*  */ path.join(__dirname, '..', 'out', 'preprocessor.py');
    const htmlFilePath = texFilePath.replace('.tex', '.html');
    
    // Preprocess .tex file
    const ret = await execCommand(`python "${scriptPath}" "${texFilePath}"`);
    const tempFilePath = ret.split(" ")[0].trim();
    const lang = ret.split(" ")[1].trim();
    
    // Convert to HTML
    await execCommand(`pandoc "${tempFilePath}" --metadata lang="${lang}" --mathjax -t html -s -o "${htmlFilePath}"`);
    
    // Display in webview
    openHtmlInWebview(htmlFilePath, context);
}
