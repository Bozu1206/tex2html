import * as vscode from 'vscode';
import * as path from 'path';
import { execCommand } from './utils/execUtils';
import { openHtmlInWebview } from './webviewManager';

export async function convertTexToHtml(texFilePath: string, context: vscode.ExtensionContext) {
    const scriptPath = path.join(__dirname, '..', 'out', 'preprocessor.py');
    const htmlFilePath = texFilePath.replace('.tex', '.html');
    
    // Preprocess .tex file
    const ret = await execCommand(`python "${scriptPath}" "${texFilePath}" html`);
    const tempFilePath = ret.split(" ")[0].trim();
    const lang = ret.split(" ")[1].trim();
    const bib_filename = ret.split(" ")[2].trim();
    const bib_engine = ret.split(" ")[3].trim(); 
    const bib_file_path = path.join(path.dirname(texFilePath), bib_filename);
    const cslFilePath = path.join(__dirname, '..', 'out', 'citation.csl');
    const ref = lang == "en" ? "References" : "Références";

    // Debugging purposes
    console.log(`tempFilePath: ${tempFilePath}`);
    console.log(`lang: ${lang}`);

    // Convert to HTML
    if (bib_engine != "?" && bib_filename != "?") {
        await execCommand(`pandoc "${tempFilePath}" -M link-citations=true --bibliography="${bib_file_path}" --citeproc --csl="${cslFilePath}" --metadata lang="${lang}" --metadata reference-section-title="${ref}" --mathjax -t html -N -s -o "${htmlFilePath}"`);
    } else {
        await execCommand(`pandoc "${tempFilePath}" -M link-citations=true --metadata lang="${lang}" --mathjax -t html -N -s -o "${htmlFilePath}"`);
    }
    
    // Display in webview
    openHtmlInWebview(htmlFilePath, context);
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

        const scriptPath = path.join(__dirname, '..', 'out', 'preprocessor.py');
        const pdf = path.basename(texFilePath).replace('.tex', '');

        // Preprocess .tex file
        progress.report({ increment: 10, message: "Preprocessing TEX file..." });
        const ret = await execCommand(`python "${scriptPath}" "${texFilePath}" pdf`);
        const tempFilePath = ret.split(" ")[0].trim();
        const lang = ret.split(" ")[1].trim();
        const bib_filename = ret.split(" ")[2].trim();
        let bib_engine = ret.split(" ")[3].trim();
        const bib_file_path = path.join(path.dirname(texFilePath), bib_filename);
        bib_engine == "biblatex" ? bib_engine = "biber" : bib_engine = "bibtex";

        if (bib_engine != "?" && bib_filename != "?") {
            // Convert to PDF
            progress.report({ increment: 20, message: "Running LaTeX..." });
            await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);

            progress.report({ increment: 30, message: "Running bibliography..." });
            await execCommand(`cd "${path.dirname(texFilePath)}" && ${bib_engine} "${pdf}"`);

            progress.report({ increment: 20, message: "Finalizing PDF..." });
            await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
            await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
        } else {
            // vscode.window.showWarningMessage("Please add a bibliography file to your .tex file.");
            progress.report({ increment: 50, message: "Running LaTeX without bibliography..." });
            await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
            await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
        }

        // Display pdf main window
        progress.report({ increment: 10, message: "Opening PDF..." });
        const pdfFilePath = path.join(path.dirname(texFilePath), `${pdf}.pdf`);
        const pdfFileUri = vscode.Uri.file(pdfFilePath);
        await vscode.commands.executeCommand('vscode.open', pdfFileUri);
    });
}
