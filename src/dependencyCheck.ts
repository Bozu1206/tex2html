import * as childProcess from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { fileDownload } from './fileDownload';
import { execCommand } from './utils/execUtils';

export function checkDependencies(): void {
    const pandocConfig = vscode.workspace.getConfiguration().get('tex2HTML.command.commandForPandoc');
    const pythonConfig = vscode.workspace.getConfiguration().get('tex2HTML.command.commandForPython');
    const platform = os.platform();
    childProcess.exec(`${pandocConfig} --version && ${pythonConfig} --version`, (error, stdout, stderr) => {
        if (error) {
            if (platform === 'win32') {
                vscode.window.showErrorMessage(
                    'Pandoc and Python3 are required for this extension. Please install them to continue.',
                    'Download & Install',
                    'I\'ve already installed',
                    'Install Guide',
                ).then(async selection => dependencyErrorSelection(selection));
            } else {
                vscode.window.showErrorMessage(
                    'Pandoc and Python3 are required for this extension. Please install them to continue.',
                    'Install Guide',
                    'I\'ve already installed'
                ).then(async selection => dependencyErrorSelection(selection));
            }
        } else {
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        }
    });
}

export async function dependencyErrorSelection(selection: string | undefined) {
    if (selection === 'Install Guide') {
        // Construct the path to the markdown file relative to this script file location
        const guidePath = path.join(__dirname, '../out', 'INSTALL.md');
        const guideUri = vscode.Uri.file(guidePath);
        
        // Open the markdown file in a new editor tab
        vscode.commands.executeCommand('markdown.showPreview', guideUri);
    }
    if (selection === 'I\'ve already installed') {
        const guidePath = path.join(__dirname, '../out', 'DEPENDENCYERROR.md');
        const guideUri = vscode.Uri.file(guidePath);

        vscode.commands.executeCommand('markdown.showPreview', guideUri);
    }
    if (selection === "Download & Install") {
        vscode.window.showInformationMessage(
            'Select what you want to install.',
            'Pandoc',
            'Python',
            'Both'
        ).then(async selection => downloadSelection(selection));
    }
}

export async function downloadSelection(selection: string | undefined) {
    if ((selection === "Pandoc") || (selection == "Both")) {
        try {
            await fileDownload("https://github.com/jgm/pandoc/releases/download/3.2/pandoc-3.2-windows-x86_64.msi", ".");
            await execCommand("pandoc-3.2-windows-x86_64.msi");
        } catch (error) {
            console.log(error);
        }
        await execCommand("del pandoc-3.2-windows-x86_64.msi");
    }
    if ((selection === "Python") || (selection == "Both")) {
        try {
            await fileDownload("https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe", ".");
            await execCommand("python-3.12.4-amd64.exe");
        } catch (error) {
            console.log(error);
        }
        await execCommand("del python-3.12.4-amd64.exe");
    }
}