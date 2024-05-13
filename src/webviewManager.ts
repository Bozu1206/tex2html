import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';

export function updateEquationIds(htmlContent: string): string {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const spans = document.querySelectorAll('span.math.display');

    spans.forEach(span => {
        const equationContent = span.textContent || '';
        const labelMatch = equationContent.match(/\\label\{([^}]+)\}/);
        if (labelMatch) {
            const label = labelMatch[1];
            span.id = label;
        }
    });

    return dom.serialize();
}

function replaceLinks(htmlContent: string): string {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const figures = document.querySelectorAll('figure');
    const figureIds = new Set(Array.from(figures).map(fig => fig.id));
    const links = document.querySelectorAll('a[data-reference-type="ref"][data-reference]');

    links.forEach(link => {
        const label = link.getAttribute('data-reference');
        if (label && !figureIds.has(label)) {  
            const eqrefNode = document.createTextNode(`$\\eqref{${label}}$`);
            link.replaceWith(eqrefNode);
        }
    });

    return dom.serialize();
}


function replaceEquationNotation(htmlContent: string): string {
    const pattern = /\\\[(.*?)\\\]/gs;
    
    const ignorePattern = /displayMath: \[\["\$\$", "\$\$"\], \["\\\\\[", "\\\\\]"\]\]/;

    if (ignorePattern.test(htmlContent)) {
        const parts = htmlContent.split(ignorePattern);
        return parts.map(part => {
            if (ignorePattern.test(part)) {
                return part;
            } else {
                return part.replace(pattern, (match, equationContent) => {
                    return `\\[\\begin{equation}${equationContent}\\end{equation}\\]`;
                });
            }
        }).join('displayMath: [["$$", "$$"], ["\\\\[", "\\\\]"]]'); // Rejoin parts with the original ignored line
    } else {
        return htmlContent.replace(pattern, (match, equationContent) => {
            return `\\[\\begin{equation}${equationContent}\\end{equation}\\]`;
        });
    }
}
  

function handleTheme(htmlContent: string) {
    const isDarkTheme = vscode.window.activeColorTheme.kind !== vscode.ColorThemeKind.Light

    if (isDarkTheme) {
        htmlContent = htmlContent.replace(
            /html\s*{\s*color:\s*#1a1a1a;\s*background-color:\s*#fdfdfd;\s*}/g,
            'html { color: #ffffff; background-color: #1a1a1a; }\n .citation>a {color: skyblue;}'
        );
    }
    return htmlContent;
}

function convertTikZInHTML(htmlString: string): string {
    const tikzRegex = /<pre>\s*<code>(\s*\\begin{tikzpicture}[\s\S]*?\\end{tikzpicture}\s*)<\/code>\s*<\/pre>/g;

    const replaceWithScript = (match: string, tikzContent: string) => {
        return `<script type="text/tikz">${tikzContent}</script>`;
    };

    return htmlString.replace(tikzRegex, replaceWithScript);
}

function updateHtmlTitle(htmlContent: string, title: string): string {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    document.title = title;
    return dom.serialize();
}
  
export function openHtmlInWebview(htmlFilePath: string, context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel('texToHtmlView', 'TEX Preview', vscode.ViewColumn.Two, { enableScripts: true });
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

    // Question: How to inform user that LaTeX packages are missing in MathJax?
    htmlContent = handleTheme(htmlContent);    
    htmlContent = htmlContent.replace(/max-width: 36em;/g, 'max-width: 50em;');
    htmlContent = updateHtmlTitle(htmlContent, path.basename(htmlFilePath, '.html') || 'TEX Preview');
    
    // htmlContent = updateEquationIds(htmlContent);
    htmlContent = replaceLinks(htmlContent);
    htmlContent = replaceEquationNotation(htmlContent); 
    htmlContent = convertTikZInHTML(htmlContent);
    
    // Convert image paths to vscode-resource URIs
    htmlContent = htmlContent.replace(/img src="([^"]+)"/g, (_, p1) => {
        let imagePath = path.resolve(path.dirname(htmlFilePath), p1);
        let vscodeResourcePath = panel.webview.asWebviewUri(vscode.Uri.file(imagePath));
        return `img src="${vscodeResourcePath}"`;
    });

    fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
    vscode.window.showWarningMessage(
        'Pandoc is using MathJax to render equations. \
         Please note that MathJax does not support all LaTeX commands. \
         For more information, visit https://docs.mathjax.org/en/latest/input/tex/extensions/index.html.'
    );

    panel.webview.html = htmlContent;
}

