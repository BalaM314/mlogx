import { exec, execSync } from "child_process";
import path from "path";
import * as fs from "fs";
import * as fsP from "node:fs/promises";
import chalk from "chalk";
import { fileURLToPath } from "url";
import * as https from "https";
function cleanBuildDirectory() {
    return new Promise((resolve, reject) => {
        fs.rm("build", { recursive: true }, (e) => {
            if (e)
                reject(e);
            fs.mkdir("build", (e) => {
                if (e)
                    reject(e);
                resolve();
            });
        });
    });
}
export function updateCaches() {
    const cacheFiles = [
        [`https://raw.githubusercontent.com/Anuken/Mindustry/master/core/assets/icons/icons.properties`, `compiler/cache/icons.properties`]
    ];
    return Promise.all(cacheFiles.map(([source, filepath]) => downloadFile(source, filepath)));
}
function downloadFile(url, output) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode == 404) {
                reject(`File does not exist.`);
            }
            else if (res.statusCode != 200) {
                reject(`Expected status code 200, got ${res.statusCode}`);
            }
            const file = fs.createWriteStream(output);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve("File downloaded!");
            });
        });
    });
}
async function copyFiles(version) {
    const filesToCopy = [
        ["compiler/cli.js", "build/cli.js"],
        ["License", "build/License"],
        ["gpl.txt", "build/gpl.txt"],
        ["lgpl.txt", "build/lgpl.txt"],
        ["README.md", "build/README.md"],
        ["compiler/cache", "build/cache"],
        ["stdlib", "build/stdlib"],
    ];
    try {
        execSync("tsc -p tsconfig-build.json");
    }
    catch (err) {
        console.error(err?.output[1]?.toString("utf-8"));
        throw err;
    }
    await Promise.all(filesToCopy.map(([src, dest]) => copy(src, dest)));
    const packageJsonData = JSON.parse(await fsP.readFile("package.json", "utf-8"));
    const modifiedPackageJsonData = {
        ...packageJsonData,
        version: version ? `${version}-beta` : packageJsonData.version
    };
    const buildPackageJsonData = {
        ...packageJsonData,
        main: "./index.js",
        bin: {
            mlogx: "./cli.js"
        },
        version: version ?? packageJsonData.version
    };
    await fsP.writeFile("build/package.json", JSON.stringify(buildPackageJsonData, null, `\t`) + "\r\n");
    await fsP.writeFile("package.json", JSON.stringify(modifiedPackageJsonData, null, `\t`) + "\r\n");
}
async function copy(src, dest) {
    if ((await fsP.lstat(src)).isDirectory()) {
        await fsP.mkdir(dest);
        await Promise.all((await fsP.readdir(src))
            .map(item => copy(path.join(src, item), path.join(dest, item))));
    }
    else {
        await fsP.copyFile(src, dest);
    }
}
;
function publish() {
    return new Promise((resolve, reject) => {
        exec("npm publish ./build/", (e) => {
            if (e)
                reject(e);
            resolve();
        });
    });
}
async function print(message) {
    process.stdout.write(chalk.cyan(message));
}
async function main(argv) {
    process.chdir(path.join(fileURLToPath(import.meta.url), "..", ".."));
    let version = process.argv.find(arg => arg.match(/version=(\d\.\d\.\d)/))?.match(/version=(\d\.\d\.\d)/)[1];
    print(version ? `\nBuilding MLOGX v${version}\n` : "\nBuilding MLOGX\n");
    print("Cleaning build directory...");
    await cleanBuildDirectory();
    print("done\n");
    print("Updating caches...");
    await updateCaches();
    print("done\n");
    print("Copying files...");
    await copyFiles(version);
    print("done\n");
    if (process.argv.includes("--publish")) {
        print("Publishing...");
        await publish();
        print("done\n");
    }
}
main(process.argv);
