import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export async function fileDownload(url: string, outputPath: string) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Downloading File",
        cancellable: true
    }, async (progress, token) => {
        token.onCancellationRequested(() => {
            console.log('User canceled the download');
        });

        return new Promise<void>((resolve, reject) => {
            const urlArray = url.split('/');
            const writer = fs.createWriteStream(outputPath + '\\' + urlArray[urlArray.length - 1]);
            let totalLength = 0;

            axios({
                method: 'get',
                url: url,
                responseType: 'stream'
            }).then(response => {
                totalLength = parseInt(response.headers['content-length'], 10);
                let downloadedLength = 0;

                response.data.on('data', (chunk: Buffer) => {
                    downloadedLength += chunk.length;
                    const percentage = (downloadedLength / totalLength) * 100;
                    progress.report({ increment: (chunk.length / totalLength) * 100, message: `${Math.round(percentage)}%` });
                });

                response.data.pipe(writer);

                writer.on('finish', () => {
                    vscode.window.showInformationMessage('File downloaded successfully!');
                    resolve();
                });

                writer.on('error', (err) => {
                    fs.unlinkSync(outputPath);
                    vscode.window.showErrorMessage('File download failed!');
                    reject(err);
                });
            }).catch(err => {
                vscode.window.showErrorMessage('Failed to start file download');
                reject(err);
            });
        });
    });
}

export function deactivate() {}
