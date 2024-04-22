import * as vscode from 'vscode';
import * as path from 'path';
import { execCommand } from './utils/execUtils';
import { openHtmlInWebview } from './webviewManager';

export async function convertTexToHtml(texFilePath: string, context: vscode.ExtensionContext) {
    const scriptPath = path.join(__dirname, '..', 'out', 'preprocessor.py');
    const htmlFilePath = texFilePath.replace('.tex', '.html');
    
    // Preprocess .tex file
    const ret = await execCommand(`python "${scriptPath}" "${texFilePath}"`);
    const tempFilePath = ret.split(" ")[0].trim();
    const lang = ret.split(" ")[1].trim();

    
    // Convert to HTML
    await execCommand(`pandoc "${tempFilePath}" -M link-citations=true --metadata lang="${lang}" --mathjax -t html -N -s -o "${htmlFilePath}"`);
    
    // Display in webview
    openHtmlInWebview(htmlFilePath, context);
}

export async function convertTexToPDF(texFilePath: string, context: vscode.ExtensionContext) {
    const scriptPath = path.join(__dirname, '..', 'out', 'preprocessor.py');

    // Get the name of the .tex file
    const pdf = path.basename(texFilePath).replace('.tex', '');

    
    // Preprocess .tex file
    const ret = await execCommand(`python "${scriptPath}" "${texFilePath}"`);
    const tempFilePath = ret.split(" ")[0].trim();
    const lang = ret.split(" ")[1].trim();
   
    // Convert to PDF
    await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
    await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
    
    // Display pdf main window
    const pdfFilePath = path.join(path.dirname(texFilePath), `${pdf}.pdf`);
    const pdfFileUri = vscode.Uri.file(pdfFilePath);
    await vscode.commands.executeCommand('vscode.open', pdfFileUri);
}