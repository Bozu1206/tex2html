import re
import sys
import os
import tempfile


def resolve_inputs(tex_content, base_path):
    input_pattern = re.compile(r"\\input{([^}]+)}")

    def replacer(match):
        file_name = match.group(1)
        file_path = os.path.join(base_path, f"{file_name}.tex")
        try:
            with open(file_path, "r") as file:
                file_base_path = os.path.dirname(file_path)
                return resolve_inputs(file.read(), file_base_path)
        except FileNotFoundError:
            print(f"Warning: {file_name}.tex not found in {base_path}", file=sys.stderr)
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

        with tempfile.NamedTemporaryFile(
            delete=False, mode="w", suffix=".tex"
        ) as tmpfile:
            tmpfile.write(resolved_content)
            print(tmpfile.name)

    except Exception as e:
        print(f"Error processing {main_tex_file_path}: {e}", file=sys.stderr)
        sys.exit(1)
