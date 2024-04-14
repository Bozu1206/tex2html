import re
import sys
import os
import tempfile


def get_iso_language_code(language_name: str) -> str:
    """
    Returns the ISO 639-1 code for a given language name.

    Parameters:
    language_name (str): The name of the language.

    Returns:
    str: The ISO 639-1 code of the language, or an empty string if not found.
    """
    language_map = {
        "English": "en",
        "French": "fr",
        "Spanish": "es",
        "German": "de",
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


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python preprocessor.py <path_to_main_tex_file>")
        sys.exit(1)

    main_tex_file_path = sys.argv[1]
    base_path = os.path.dirname(main_tex_file_path)

    try:
        with open(main_tex_file_path, "r") as main_tex_file:
            resolved_content = resolve_inputs(main_tex_file.read(), base_path)
            language = resolve_language(resolved_content)
        with tempfile.NamedTemporaryFile(
            delete=False, mode="w", suffix=".tex"
        ) as tmpfile:
            tmpfile.write(resolved_content)
            print(tmpfile.name, language)

    except Exception as e:
        print(f"Error processing {main_tex_file_path}: {e}", file=sys.stderr)
        sys.exit(1)
