import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';

import * as cheerio from 'cheerio';

function transformMathHTML(html: string): string {
    const $ = cheerio.load(html);
    let alignCount = 0;

    $('span.math.display').each((index, element) => {
        let content = $(element).text();
        if (content.includes('\\begin{align}') && content.includes('\\end{align}')) {
            content = content.replace(/\\\[\\begin{align}/, '').replace(/\\end{align}\\]/, '');
            const equations = content.split('\\\\');
            $(element).empty(); // Clear the original content

            const outerId = `dont_count_me_${alignCount++}`;
            $(element).attr('id', outerId); // Assign the new ID to the outer span

            equations.forEach((eq, idx) => {
                const labelMatch = eq.match(/\\label{([^}]+)}/);
                const id = labelMatch ? labelMatch[1] : null;
                let equationWithoutLabelAndAmpersands = eq.replace(/\\label{[^}]+}/, '').trim();
                equationWithoutLabelAndAmpersands = equationWithoutLabelAndAmpersands.replace(/&/g, ' ').trim(); // Remove all '&'

                if (equationWithoutLabelAndAmpersands) {
                    const newElement = `<span class="math display" ${id ? `id="${id}"` : ''}>
                        \\[
                        \\begin{equation}
                        ${equationWithoutLabelAndAmpersands}
                        \\end{equation}
                        \\]
                    </span>`;
                    $(element).append(newElement);
                }
            });
        }
    });

    return $.html();
}



function updateEquationIds(htmlContent: string): string {
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

function updateEquationReferences(htmlContent: string): string {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    //<a href="#eq:trigonometric" data-reference-type="ref" data-reference="eq:trigonometric">[eq:trigonometric]</a>
    const links = Array.from(document.querySelectorAll('a[data-reference-type="ref"][data-reference]'));
        
    const spans = document.querySelectorAll('span.math.display');

    const labelMap = new Map<string, number>();
    let counter = 1; 
    spans.forEach(span => {
        if (span.id.includes("dont_count_me")) {
            return;
        }

        if (span.textContent?.includes("equation*") || span.textContent?.includes("align*")) {
            return;
        }

        if (span.textContent?.includes("\\nonumber")) {
            return;
        }
        
        labelMap.set(span.id, counter);
        counter++;
    });

    // Debugging purposes
    // console.log(labelMap);

    links.forEach(link => {
        const reference = link.getAttribute('data-reference') || '';
        const referenceId = link.getAttribute('href') || '';
        const equationNumber = labelMap.get(reference);
        
        // do nothing
        if (equationNumber === undefined) {
            return;
        }

        link.className = "eq-ref-link";
        link.textContent = `(${equationNumber})`;
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
    const isDarkTheme = vscode.window.activeColorTheme.kind !== vscode.ColorThemeKind.Light;
    const regexA = new RegExp(`a\\s*{[^}]*color:\\s*#1a1a1a;[^}]*}`, 'g');
    const regexVisited = new RegExp(`a:visited\\s*{[^}]*color:\\s*#1a1a1a;[^}]*}`, 'g');

    if (isDarkTheme) {
        htmlContent = htmlContent.replace(
            /html\s*{\s*color:\s*#1a1a1a;\s*background-color:\s*#fdfdfd;\s*}/g,
            'html { color: #ffffff; background-color: #1a1a1a; }\n .citation>a {color: white;}\n a {color: white;}\n a:visited {color: white;}'
        );

        htmlContent = htmlContent.replace(regexA, match => match.replace("#1a1a1a", "#ffffff"));
        htmlContent = htmlContent.replace(regexVisited, match => match.replace("#1a1a1a", "#ffffff"));
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


function transformEquations(htmlScript: string): string {
    // This regular expression matches the LaTeX equations that start with \[equation or \[equation*
    // and captures everything up to the closing \] tag.
    const regex = /\\\[equation(\*?)\s+((?:.|\n)*?)\\\]/gm;

    // Replace the matched text with the new format using the captured groups
    const updatedHtml = htmlScript.replace(regex, (_, starred, content) => {
        const tag = starred ? 'equation*' : 'equation';
        return `\\[\\begin{${tag}}\n${content}\n\\end{${tag}}\\]`;
    });

    return updatedHtml;
}

function transformAlignedEquations(htmlScript: string): string {
    // This regular expression matches the LaTeX blocks that start with \[\begin{aligned}
    // and captures the keyword ("align" or "align*") immediately after, as well as the content
    // until the closing \].
    const regex = /\\\[\\begin{aligned}\s+(align\*?)\s+((?:.|\n)*?)\\end{aligned}\\\]/gm;

    // Replace the matched text with the new format using the captured groups
    const updatedHtml = htmlScript.replace(regex, (_, alignType, content) => {
        return `\\[\\begin{${alignType}}\n${content.trim()}\n\\end{${alignType}}\\]`;
    });

    return updatedHtml;
}


export function openHtmlInWebview(htmlFilePath: string, context: vscode.ExtensionContext, figuresInVSCode: boolean) {
    const panel = vscode.window.createWebviewPanel('texToHtmlView', 'TEX Preview', vscode.ViewColumn.Two, { enableScripts: true });
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

    // Question: How to inform user that LaTeX packages are missing in MathJax?
    htmlContent = handleTheme(htmlContent);    
    htmlContent = htmlContent.replace(/max-width: 36em;/g, 'max-width: 50em;');
    htmlContent = updateHtmlTitle(htmlContent, path.basename(htmlFilePath, '.html') || 'TEX Preview');
    
    htmlContent = transformEquations(htmlContent);
    htmlContent = transformAlignedEquations(htmlContent);
    htmlContent = transformMathHTML(htmlContent);
    htmlContent = updateEquationIds(htmlContent);
    // htmlContent = replaceEquationNotation(htmlContent); 
    htmlContent = updateEquationReferences(htmlContent);
    htmlContent = convertTikZInHTML(htmlContent);
    // htmlContent = replaceVerbatimInHTML(htmlContent);
    // htmlContent = retrievesAlign(htmlContent);
    
    // Convert image paths to vscode-resource URIs
    if (figuresInVSCode) {
        htmlContent = htmlContent.replace(/img src="([^"]+)"/g, (_, p1) => {
            let imagePath = path.resolve(path.dirname(htmlFilePath), p1);
            let vscodeResourcePath = panel.webview.asWebviewUri(vscode.Uri.file(imagePath));
            return `img src="${vscodeResourcePath}"`;
        });
    }

    fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
    vscode.window.showWarningMessage(
        'Pandoc is using MathJax to render equations. \
         Please note that MathJax does not support all LaTeX commands. \
         For more information, visit https://docs.mathjax.org/en/latest/input/tex/extensions/index.html.'
    );

    panel.webview.html = htmlContent;
}

