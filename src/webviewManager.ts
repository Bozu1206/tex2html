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

function replaceEquationNotation(htmlContent: string): string {
    const pattern = /\\\[(.*?)\\\]/gs;
    const updatedContent = htmlContent.replace(pattern, (match, equationContent) => {
      return `\\[\\begin{equation}${equationContent}\\end{equation}\\]`;
    });
    return updatedContent;
}
  
function replaceMathJaxScripts(htmlContent: string): string {
    const pattern = /<script src="https:\/\/cdnjs.cloudflare.com\/polyfill\/v3\/polyfill.min.js\?features=es6"><\/script>\s*<script\s+src="https:\/\/cdn.jsdelivr.net\/npm\/mathjax@3\/es5\/tex-chtml-full.js"\s+type="text\/javascript"><\/script>/gs;
    const replacement = `<script>
          window.MathJax = {
            options: {
                enableMenu: true,
                menuOptions: {
                    settings: {
                        texHints: true,
                        semantics: false,
                        zoom: 'NoZoom',
                        zscale: '200%',
                        renderer: 'CHTML',
                        alt: false,
                        cmd: false,
                        ctrl: false,
                        shift: false,
                        scale: 1,
                        inTabOrder: true,
                        assistiveMml: true,
                        collapsible: false,
                        explorer: false
                    },
                    annotationTypes: {
                        TeX: ['TeX', 'LaTeX', 'application/x-tex'],
                        StarMath: ['StarMath 5.0'],
                        Maple: ['Maple'],
                        ContentMathML: ['MathML-Content', 'application/mathml-content+xml'],
                        OpenMath: ['OpenMath']
                    }
                }
            },
          tex: {
            tags: "ams", // This enables automatic equation numbering
            inlineMath: [["$", "$"], ["\\\\(", "\\\\)"]],
            displayMath: [["$$", "$$"], ["\\\\[", "\\\\]"]]
          },
          svg: {
              fontCache: 'global'
          },
          loader: {
              load: ['[tex]/ams']
          }
          };
      </script>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
      <link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
      <script src="https://tikzjax.com/v1/tikzjax.js"></script>`;
  
    return htmlContent.replace(pattern, replacement); ;
}

function handleTheme(htmlContent: string) {
    const isDarkTheme = vscode.window.activeColorTheme.kind !== vscode.ColorThemeKind.Light

    if (isDarkTheme) {
        htmlContent = htmlContent.replace(
            /html\s*{\s*color:\s*#1a1a1a;\s*background-color:\s*#fdfdfd;\s*}/g,
            'html { color: #ffffff; background-color: #1a1a1a; }'
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

    // TODO: Handle error and inform user in VSCode and in HTML 
    // Question: How to inform user that LaTeX packages are missing in MathJax?

    htmlContent = handleTheme(htmlContent);    
    htmlContent = htmlContent.replace(/max-width: 36em;/g, 'max-width: 50em;');
    htmlContent = updateHtmlTitle(htmlContent, path.basename(htmlFilePath, '.html') || 'TEX Preview');
    htmlContent = replaceEquationNotation(htmlContent);
    htmlContent = replaceMathJaxScripts(htmlContent);
    htmlContent = updateEquationIds(htmlContent);
    htmlContent = convertTikZInHTML(htmlContent);
    
    // Convert image paths to vscode-resource URIs
    htmlContent = htmlContent.replace(/img src="([^"]+)"/g, (_, p1) => {
        let imagePath = path.resolve(path.dirname(htmlFilePath), p1);
        let vscodeResourcePath = panel.webview.asWebviewUri(vscode.Uri.file(imagePath));
        return `img src="${vscodeResourcePath}"`;
    });

    // Debugging (feature ;-) ?): Write the modified HTML back to the file system
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');

    vscode.window.showInformationMessage(
        'Pandoc is using MathJax to render equations. \
         Please note that MathJax does not support all LaTeX commands. \
         For more information, visit https://docs.mathjax.org/en/latest/input/tex/extensions/index.html.'
    )

    panel.webview.html = htmlContent;
}

