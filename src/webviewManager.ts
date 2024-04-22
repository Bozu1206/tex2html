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
    // Define the regular expression to match the pattern \[ ... \]
    // Using the 's' flag for dotAll mode, so '.' matches newline characters as well
    // The '?' in '.*?' makes the matching non-greedy
    const pattern = /\\\[(.*?)\\\]/gs;
  
    // Replace each match with the modified LaTeX equation format
    const updatedContent = htmlContent.replace(pattern, (match, equationContent) => {
      return `\\[\\begin{equation}${equationContent}\\end{equation}\\]`;
    });
  
    return updatedContent;
}
  
function replaceMathJaxScripts(htmlContent: string): string {
    // Define the regular expression to match the exact script tags
    const pattern = /<script src="https:\/\/cdnjs.cloudflare.com\/polyfill\/v3\/polyfill.min.js\?features=es6"><\/script>\s*<script\s+src="https:\/\/cdn.jsdelivr.net\/npm\/mathjax@3\/es5\/tex-chtml-full.js"\s+type="text\/javascript"><\/script>/gs;
  
    // Define the replacement string, which includes the new script configuration for MathJax
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
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>`;
  
    // Replace the matched pattern with the new script tags and configuration
    return htmlContent.replace(pattern, replacement); ;
}
  
export function openHtmlInWebview(htmlFilePath: string, context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel('texToHtmlView', 'TEX Preview', vscode.ViewColumn.Two, { enableScripts: true });
    
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    
    // Update equation IDs based on LaTeX labels
    htmlContent = updateEquationIds(htmlContent);

    // Replace "\[...\]" by "\[\begin{equation}...\end{equation}\]" for MathJax
    htmlContent = replaceEquationNotation(htmlContent);

    // Replace the MathJax script tags with a custom configuration
    htmlContent = replaceMathJaxScripts(htmlContent);
    
    // Convert image paths to vscode-resource URIs
    htmlContent = htmlContent.replace(/img src="([^"]+)"/g, (_, p1) => {
        let imagePath = path.resolve(path.dirname(htmlFilePath), p1);
        let vscodeResourcePath = panel.webview.asWebviewUri(vscode.Uri.file(imagePath));
        return `img src="${vscodeResourcePath}"`;
    });

    // Debugging: Write the modified HTML back to the file system
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
    panel.webview.html = htmlContent;
}

