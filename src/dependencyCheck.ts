import * as childProcess from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';

export function checkDependencies(): void {
    childProcess.exec('pandoc --version && python3 --version', (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(
                'Pandoc and Python3 are required for this extension. Please install them to continue.',
                'Install Guide'
            ).then(selection => {
                if (selection === 'Install Guide') {
                    // Construct the path to the markdown file relative to this script file location
                    const guidePath = path.join(__dirname, '../out', 'INSTALL.md');
                    const guideUri = vscode.Uri.file(guidePath);
                    
                    // Open the markdown file in a new editor tab
                    vscode.commands.executeCommand('markdown.showPreview', guideUri);
                }
            });
        } else {
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        }
    });
}
