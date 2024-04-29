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


def resolve_inputs(tex_content, base_path):
    input_pattern = re.compile(r"\\input{([^}]+?)(\.tex|\.sty)?}")

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
    tikz_pattern = r"\\begin{tikzpicture}.*?\\end{tikzpicture}"

    def wrap_in_verbatim(match):
        tikz_content = match.group(0)
        return f"\\begin{{verbatim}}{tikz_content}\\end{{verbatim}}"

    converted_content = re.sub(
        tikz_pattern, wrap_in_verbatim, tex_content, flags=re.DOTALL
    )

    return converted_content


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python preprocessor.py <path_to_main_tex_file>")
        sys.exit(1)

    main_tex_file_path = sys.argv[1]
    format = sys.argv[2]
    base_path = os.path.dirname(main_tex_file_path)

    try:
        with open(main_tex_file_path, "r") as main_tex_file:
            resolved_content = resolve_inputs(main_tex_file.read(), base_path)
            resolved_content = convert_makeatletter_to_comment(resolved_content)

            if format == "html":
                resolved_content = convert_tikz_to_verbatim(resolved_content)

            language = resolve_language(resolved_content)
        with tempfile.NamedTemporaryFile(
            delete=False, mode="w", suffix=".tex"
        ) as tmpfile:
            tmpfile.write(resolved_content)
            print(tmpfile.name, language)

    except Exception as e:
        print(f"Error processing {main_tex_file_path}: {e}", file=sys.stderr)
        sys.exit(1)
