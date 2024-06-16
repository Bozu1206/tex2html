# Dependency error

I've installed the required dependencies (`pandoc` and `python3`), but the extension still asks me to install.

## Why this happened?

The extension cannot execute the command `pandoc` and/or `python3` correctly, this is most likely because the paths to the dependencies' executables are not added to the `PATH` environment variable. \
On Windows, the default command for python may be `python`, instead of `python3`, which may also cause this problem.

## How to solve this problem?

#### Try restarting vscode first, especially if you just installed the dependencies.

Two solutions apply: 

### Solution 1: Manually add the paths of these dependencies to `PATH`.

This requires some knowledge. Make sure you don't destroy the existing `PATH` when adding them manually. It's recommended to have a backup of the existing `PATH`.

### Solution 2: Modify extension settings (recommended)
In Settings (`Ctrl` + `,`) > Extension > Tex2HTML, specify the paths of these dependencies with a file picker. \
If the problem comes from the difference in commands (e.g. `python` and `python3`), simply specify the correct command in the setting.