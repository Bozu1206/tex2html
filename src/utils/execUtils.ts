import * as cp from 'child_process';

export function execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        cp.exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

