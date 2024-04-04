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
        const scriptPath = path.join(__dirname, '..', 'src', 'preprocessor.py');
        const base_path = path.dirname(texFilePath);

        cp.exec(`python3 "${scriptPath}" "${texFilePath}"`, (err, stdout, stderr) => {
            if (err) {
                vscode.window.showErrorMessage('Failed to preprocess .tex file: ' + err);
                return;
            }
            
            const tempFilePath = stdout.trim();
            console.log(stderr.trim())
            console.log(tempFilePath)
            cp.exec(`pandoc "${tempFilePath}" --mathjax -t html -s -o "${htmlFilePath}"`, (err) => {
                if (err) {
                    vscode.window.showErrorMessage('Failed to convert .tex to HTML: ' + err);
                    return;
                }

                const panel = vscode.window.createWebviewPanel(
                    'texToHtmlView',
                    'TEX Preview',
                    vscode.ViewColumn.Two,
                    {
                        enableScripts: true,
                    }
                );

                const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
                panel.webview.html = htmlContent;
            });
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
