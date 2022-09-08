/**
Copyright © <BalaM314>, 2022.
This file is part of mlogx.
The Mindustry Logic Extended Compiler(mlogx) is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
mlogx is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
You should have received a copy of the GNU Lesser General Public License along with mlogx. If not, see <https://www.gnu.org/licenses/>. 

Build script.
*/

import { exec, execSync } from "child_process";
import path from "path";
import * as fs from "fs";
import * as fsP from "node:fs/promises";
import chalk from "chalk";
import { fileURLToPath } from "url";
import * as https from "https";




function cleanBuildDirectory(){
	return new Promise<void>((resolve, reject) => {
		fs.rm("build", {recursive: true}, (e) => {
			if(e) reject(e);
			fs.mkdir("build", (e) => {
				if(e) reject(e);
				resolve();
			});
		});
	})
}
export function updateCaches(){
	const cacheFiles:[source:string, filepath:string][] = [
		[`https://raw.githubusercontent.com/Anuken/Mindustry/master/core/assets/icons/icons.properties`, `compiler/cache/icons.properties`]
	];
	return Promise.all(
		cacheFiles.map(([source, filepath]) => downloadFile(source, filepath))
		//Start downloading each file, then return once they're all downloaded
	);
}

function downloadFile(url:string, output:string){
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			if(res.statusCode == 404){
				reject(`File does not exist.`);
			} else if(res.statusCode != 200){
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
async function copyFiles(){
	const filesToCopy = [
		["compiler/index.js", "build/index.js"],
		["compiler/cli.js", "build/cli.js"],
		["License", "build/License"],
		["gpl.txt", "build/gpl.txt"],
		["lgpl.txt", "build/lgpl.txt"],
		["lgpl.txt", "build/lgpl.txt"],
		["README.md", "build/README.md"],
		["compiler/cache", "build/cache"],
		["stdlib", "build/stdlib"],
	];
	
	//Use TSC to compile all source files, producing .js and .d.ts files in build/src/
	execSync("tsc -p tsconfig-build.json");
	//Copy all other files such as cli.js and README.md
	await Promise.all(filesToCopy.map(([src, dest]) => copy(src, dest)));

	//Edit the package.json because index.js and cli.js are in / instead of compiler/
	const packageJsonData = JSON.parse(await fsP.readFile("package.json", "utf-8"));
	const modifiedPackageJsonData = {
		...packageJsonData,
		main: "./index.js",
		bin: {
			mlogx: "./cli.js"
		},
	};
	fsP.writeFile("build/package.json", JSON.stringify(modifiedPackageJsonData, null, `\t`));
	
}
/**Copies a file, or a directory recursively. */
async function copy(src:string, dest:string){
	if((await fsP.lstat(src)).isDirectory()) {
		await fsP.mkdir(dest);
		await Promise.all(
			(await fsP.readdir(src))
			.map(item =>
				copy(path.join(src, item), path.join(dest, item))
			)
		);
	} else {
		await fsP.copyFile(src, dest);
	}
};
function publish(){
	return new Promise<void>((resolve, reject) => {
		exec("npm publish build", (e) => {
			if(e) reject(e);
			resolve();
		});
	});
}

async function print(message:string){
	process.stdout.write(chalk.cyan(message));
}

async function main(argv:string[]){
	
	//Make sure the current working directory is the root directory of mlogx
	process.chdir(path.join(fileURLToPath(import.meta.url), "..", ".."));

	print("Cleaning build directory...");
	await cleanBuildDirectory();
	print("done\n");

	print("Updating caches...");
	await updateCaches();
	print("done\n");

	print("Copying files...");
	await copyFiles();
	print("done\n");

	if(process.argv.includes("--publish")){
		print("Publishing...")
		// await publish();
		print("NOT done\n");
	}
}

main(process.argv);
