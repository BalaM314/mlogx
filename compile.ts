const fs = require("fs");

function compileMlogxToMlog(data:String[]):String[] {
	
	//todo: add code for labels
	return removeComments(data);

}

function removeComments(data:String[]):String[] {

	return data.filter(line => 
		!line.startsWith("#")
	);

}

function main(){

	if(!fs.existsSync(process.cwd() + "/src")){
		console.error("No src directory found!");
		return;
	}
	if(!fs.existsSync(process.cwd() + "/target")){
		fs.mkdirSync(process.cwd() + "/target");
	}
	/**List of filenames ending in .mlogx in the src directory. */
	let filelist:String[] = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlogx$/));
	console.log("Files to compile: ", filelist);

	for(var filename of filelist){
		console.log(`Compiling file ${filename}`);
		let data:String[] = fs.readFileSync(`src/${filename}`, 'utf-8').split("\r\n");
		fs.writeFileSync(
			`target/${filename.slice(0,-1)}`,
			compileMlogxToMlog(data).join("\r\n")
		);
	}

}

main();
