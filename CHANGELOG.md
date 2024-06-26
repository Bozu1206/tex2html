# Change Log

All notable changes to the `tex2html` extension will be documented in this file.

## Released

### 0.0.21 - 0.0.22

- Provide extra assistance for dependency solving.
- Support custom settings, including custom LaTeX compiler.

### 0.0.17 - 0.0.20

- Fix Minor bugs
- Add handling of different math environments (align, align*, equation, equation*)
- Improve references handling

### 0.0.16

- Improve the referencing of equations
- Add possibility to changes figures using %![VSCODE]

### 0.0.15

- Add proper referencing of equations and figures (sections not yet supported)
- Cleaner user interaction
- Hopefully fix the language detection bug 

### 0.0.14

- Add detection of language in `\documentclass` command

### 0.0.13

- Correct a bug regarding the language
- Re-add the equation number (removed in 0.0.11)

### 0.0.12

- Fix minor bugs

### 0.0.11

- Fixing bugs with commented lines in the preprocessor
- Add title to references section with Pandoc
- Add progress bar during the conversion TEX -> HTML
- Remove numbers in the equation references but keep the links (Test)

### 0.0.10

- Fixing minor bugs
- Extension icon

### 0.0.9

- Handling of commented lines during the preprocessing
- Handling of bibliography (bibtex and natbib)

### 0.0.8

- Handling of VERY basic Tikz picture (using TikzJax.js)

### 0.0.7

- Basic handling of \makeatletter command (to be validated)
- Add keyboard shortcut and icon button
- Handling of dark theme for the WebView panel

### 0.0.1

- Handling of the \begin{equation} environment
- Add extension