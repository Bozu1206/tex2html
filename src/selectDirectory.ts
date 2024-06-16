import * as vscode from 'vscode';
import * as path from 'path';

export async function selectDirectory(configKey: string) {
    console.log('select directory start!');

    if (!configKey) {
        vscode.window.showErrorMessage('Configuration key is missing.');
        return;
    }
    const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Select',
        canSelectFolders: false,
        canSelectFiles: true,
        filters: {
            'Executable': ['exe']
        }
    };
    const folderUri = await vscode.window.showOpenDialog(options);

    if (folderUri && folderUri[0]) {
        const config = vscode.workspace.getConfiguration();
        await config.update(configKey, folderUri[0].fsPath, vscode.ConfigurationTarget.Global);
    }
}