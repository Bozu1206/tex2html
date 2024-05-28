import * as vscode from 'vscode';
import * as path from 'path';
import { execCommand } from './utils/execUtils';
import { openHtmlInWebview } from './webviewManager';

async function preprocessFile(texFilePath: string, outputFormat: string, context: vscode.ExtensionContext, progressCallback?: (message: string, increment?: number) => void) {
    const scriptPath = path.join(__dirname, '..', 'out', 'preprocessor.py');
    const ret = await execCommand(`python "${scriptPath}" "${texFilePath}" ${outputFormat}`);
    const [tempFilePath, lang, bib_filename, bib_engine, figuresInVSCode] = ret.split(" ").map(part => part.trim());
    const bib_file_path = path.join(path.dirname(texFilePath), bib_filename);    
    return { tempFilePath, lang, bib_filename, bib_engine, figuresInVSCode, bib_file_path };
}

export async function convertTexToHtml(texFilePath: string, context: vscode.ExtensionContext) {
    const htmlFilePath = texFilePath.replace('.tex', '.html');
    const { tempFilePath, lang, bib_filename, bib_engine, figuresInVSCode, bib_file_path } = await preprocessFile(texFilePath, 'html', context);

    const cslFilePath = path.join(__dirname, '..', 'out', 'citation.csl');
    const headerFilePath = path.join(__dirname, '..', 'out', 'mathjax-config.html');
    const ref = lang === "fr" ? "Références" : "References";

    const pandocCommand = `pandoc -s "${tempFilePath}" -M link-citations=true ${bib_engine !== "?" && bib_filename !== "?" ? `--bibliography="${bib_file_path}" --citeproc --csl="${cslFilePath}"` : ''} --metadata lang="${lang}" --metadata reference-section-title="${ref}" --mathjax --include-in-header "${headerFilePath}" -t html -N -o "${htmlFilePath}"`;

    await execCommand(pandocCommand);
    
    openHtmlInWebview(htmlFilePath, context, figuresInVSCode === "True");
}

export async function convertTexToPDF(texFilePath: string, context: vscode.ExtensionContext) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Generating final PDF",
        cancellable: true
    }, async (progress, token) => {
        token.onCancellationRequested(() => {
            vscode.window.showInformationMessage('User canceled the PDF conversion');
        });

        const { tempFilePath, lang, bib_filename, bib_engine, bib_file_path } = await preprocessFile(texFilePath, 'pdf', context, message => progress.report({ message }));

        let effectiveBibEngine = bib_engine === "biblatex" ? "biber" : "bibtex";

        if (bib_engine !== "?" && bib_filename !== "?") {
            const pdf = path.basename(texFilePath, '.tex');
            const latexCommand = `pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`;

            progress.report({ increment: 20, message: "Running LaTeX..." });
            await execCommand(latexCommand);

            progress.report({ increment: 30, message: "Running bibliography..." });
            await execCommand(`cd "${path.dirname(texFilePath)}" && ${effectiveBibEngine} "${pdf}"`);

            progress.report({ increment: 20, message: "Finalizing PDF..." });
            await execCommand(latexCommand);
            await execCommand(latexCommand);
        } else {
            vscode.window.showWarningMessage("Please add a bibliography file to your .tex file.");
        }

        progress.report({ increment: 10, message: "Opening PDF..." });
        const pdfFilePath = path.join(path.dirname(texFilePath), path.basename(texFilePath, '.tex') + '.pdf');
        const pdfFileUri = vscode.Uri.file(pdfFilePath);
        await vscode.commands.executeCommand('vscode.open', pdfFileUri);
    });
}
