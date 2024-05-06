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
    const scriptPath = path.join(__dirname, '..', 'out', 'preprocessor.py');
    const pdf = path.basename(texFilePath).replace('.tex', '');
    
    // Preprocess .tex file
    const ret = await execCommand(`python "${scriptPath}" "${texFilePath}" pdf`);
    const tempFilePath = ret.split(" ")[0].trim();
    const lang = ret.split(" ")[1].trim();
    const bib_filename = ret.split(" ")[2].trim();
    let bib_engine = ret.split(" ")[3].trim();
    const bib_file_path = path.join(path.dirname(texFilePath), bib_filename);
    bib_engine == "biblatex" ? bib_engine = "biber" : bib_engine = "bibtex";
    
    //TODO: DEBUG THIS WITH A WINDOW MACHINE
    if (bib_engine != "?" && bib_filename != "?") {
        // Convert to PDF
        await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
        await execCommand(`cd "${path.dirname(texFilePath)}" && ${bib_engine} "${pdf}"`);
        await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
        await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
    } else {
        vscode.window.showErrorMessage("Please add a bibliography file to your .tex file.");
        await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
        await execCommand(`pdflatex -output-directory="${path.dirname(texFilePath)}" -jobname="${pdf}" "${tempFilePath}"`);
    }

    // Display pdf main window
    const pdfFilePath = path.join(path.dirname(texFilePath), `${pdf}.pdf`);
    const pdfFileUri = vscode.Uri.file(pdfFilePath);
    await vscode.commands.executeCommand('vscode.open', pdfFileUri);
}