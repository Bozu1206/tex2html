import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function openHtmlInWebview(htmlFilePath: string, context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel('texToHtmlView', 'TEX Preview', vscode.ViewColumn.Two, { enableScripts: true });
    
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');



    // Convert image paths to vscode-resource URIs
    htmlContent = htmlContent.replace(/img src="([^"]+)"/g, (_, p1) => {
        let imagePath = path.resolve(path.dirname(htmlFilePath), p1);
        let vscodeResourcePath = panel.webview.asWebviewUri(vscode.Uri.file(imagePath));
        return `img src="${vscodeResourcePath}"`;
    });

    // Option to include a custom font and other CSS directly
    // const fontFaceCSS = `
    // @import url("https://cdn.jsdelivr.net/gh/vsalvino/computer-modern@main/fonts/serif.css");
    // body {
    //     font-family: 'Computer Modern Serif', sans-serif;
    // }
    // `;
    // htmlContent = htmlContent.replace('</head>', `<style>${fontFaceCSS}</style></head>`);

    // Insert the <meta> tag for content security policy
    // const metaTag =`<meta http-equiv="Content-Security-Policy" content="default-src *; style-src 'unsafe-inline'; script-src *; img-src *;">`;
    // htmlContent = htmlContent.replace('<head>', `<head>\n\t${metaTag}`);

    // Debugging: Write the modified HTML back to the file system
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');

    panel.webview.html = htmlContent;
}

