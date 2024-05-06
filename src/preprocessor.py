import re
import sys
import os
import tempfile


def get_iso_language_code(language_name: str) -> str:
    language_map = {
        "Anglais": "en",
        "German": "de",
        "Allemand": "de",
        "Francais": "fr",
        "English": "en",
        "French": "fr",
        "Spanish": "es",
        "Ngerman": "de",
        "Chinese": "zh",
    }

    normalized_language_name = language_name.capitalize()
    return language_map.get(normalized_language_name, "en")


def resolve_language(tex_content):
    language_pattern = re.compile(r"\\usepackage\[(.*?)\]{babel}")
    language_match = language_pattern.search(tex_content)

    if language_match:
        language = language_match.group(1)
        return get_iso_language_code(language)

    return "en"


def resolve_inputs(tex_content, base_path):
    input_pattern = re.compile(
        r"^\\input{([^}]+?)(\.tex|\.sty)?}(?!.*%.*\1)", re.MULTILINE
    )

    def replacer(match):
        file_name = match.group(1)
        file_extension = match.group(2) if match.group(2) else ".tex"
        file_path = os.path.join(base_path, f"{file_name}{file_extension}")

        try:
            with open(file_path, "r") as file:
                file_base_path = os.path.dirname(file_path)
                return resolve_inputs(file.read(), file_base_path)
        except FileNotFoundError:
            print(
                f"Warning: {file_name}{file_extension} not found in {base_path}",
                file=sys.stderr,
            )
            return ""

    return re.sub(input_pattern, replacer, tex_content)


def convert_makeatletter_to_comment(latex_content):
    pattern = re.compile(r"\\makeatletter(.*?)\\makeatother", re.DOTALL)

    def comment_replacer(match):
        commented_content = "% " + "\n% ".join(match.group(1).split("\n"))
        return f"\\makeatletter\n{commented_content}\n\\makeatother"

    return pattern.sub(comment_replacer, latex_content)


def convert_tikz_to_verbatim(tex_content):
    tikz_pattern = re.compile(r"\\begin{tikzpicture}.*?\\end{tikzpicture}", re.DOTALL)

    def wrap_in_verbatim(match):
        tikz_content = match.group(0)
        return f"\\begin{{verbatim}}{tikz_content}\\end{{verbatim}}"

    result_lines = []
    in_comment_block = False

    for line in tex_content.splitlines():
        if line.strip().startswith("%"):
            in_comment_block = True
            result_lines.append(line)
        else:
            if in_comment_block:
                in_comment_block = False

            line = tikz_pattern.sub(wrap_in_verbatim, line)
            result_lines.append(line)

    return "\n".join(result_lines)


def find_bib_info(latex_content):
    bib_package = "?"
    if re.search(r"\\usepackage.*{natbib}", latex_content):
        bib_package = "natbib"
    elif re.search(r"\\usepackage.*{biblatex}", latex_content):
        bib_package = "biblatex"
    else:
        if re.search(r"\\bibliography{", latex_content):
            bib_package = "bibtex"

    bib_file = "?"
    bib_file_match = re.search(r"\\bibliography{(.+?)}", latex_content)
    if bib_file_match:
        bib_file = bib_file_match.group(1) + ".bib"
    else:
        bib_file_match = re.search(r"\\addbibresource{(.+?\.bib)}", latex_content)
        if bib_file_match:
            bib_file = bib_file_match.group(1)

    return (bib_file, bib_package)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python preprocessor.py <path_to_main_tex_file>")
        sys.exit(1)

    main_tex_file_path = sys.argv[1]
    format = sys.argv[2]
    base_path = os.path.dirname(main_tex_file_path)

    bibliography = ("?", "?")

    try:
        with open(main_tex_file_path, "r") as main_tex_file:
            resolved_content = resolve_inputs(main_tex_file.read(), base_path)

            if format == "html":
                resolved_content = convert_makeatletter_to_comment(resolved_content)
                resolved_content = convert_tikz_to_verbatim(resolved_content)

            bibliography = find_bib_info(resolved_content)
            language = resolve_language(resolved_content)

        with tempfile.NamedTemporaryFile(
            delete=False, mode="w", suffix=".tex"
        ) as tmpfile:
            tmpfile.write(resolved_content)
            print(tmpfile.name, language, bibliography[0], bibliography[1])

    except Exception as e:
        print(f"Error processing {main_tex_file_path}: {e}", file=sys.stderr)
        sys.exit(1)
