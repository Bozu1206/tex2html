import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.convertTexToHtml', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active .tex file.');
            return;
        }

        const texFilePath = editor.document.fileName;
        const htmlFilePath = texFilePath.replace('.tex', '.html');
        const scriptPath = path.join(__dirname, '..', 'out', 'preprocessor.py');
        const base_path = path.dirname(texFilePath);

        cp.exec(`python "${scriptPath}" "${texFilePath}"`, (err, stdout, stderr) => {
            if (err) {
                vscode.window.showErrorMessage('Failed to preprocess .tex file: ' + err);
                return;
            }
            
            const tempFilePath = stdout.trim();
            cp.exec(`pandoc "${tempFilePath}" --mathjax -t html -s -o "${htmlFilePath}"`, (err) => {
                if (err) {
                    vscode.window.showErrorMessage('Failed to convert .tex to HTML: ' + err);
                    return;
                }

                // Create webview panel
                const panel = vscode.window.createWebviewPanel(
                    'texToHtmlView',
                    'TEX Preview',
                    vscode.ViewColumn.Two,
                    {
                        enableScripts: true,
                    }
                );

                let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

                // Convert image paths to vscode-resource URIs
                htmlContent = htmlContent.replace(/img src="([^"]+)"/g, (_, p1) => {
                    let imagePath = path.resolve(path.dirname(htmlFilePath), p1);
                    let vscodeResourcePath = panel.webview.asWebviewUri(vscode.Uri.file(imagePath));
                    return `img src="${vscodeResourcePath}"`;
                });

                // Insert the <meta> tag after the opening <head> tag
                const metaTag =`<meta http-equiv="Content-Security-Policy" content="default-src *; style-src 'unsafe-inline'; script-src *; img-src *;">`;
                htmlContent = htmlContent.replace('<head>', `<head>\n\t${metaTag}`);
                
                // Debugging purpose
                fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8')
                panel.webview.html = htmlContent;
            });
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
