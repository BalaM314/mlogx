const fs = require("fs");
function compileMlogxToMlog(data) {
    return removeComments(data);
}
function removeComments(data) {
    return data.filter(line => !line.startsWith("#"));
}
function main() {
    if (!fs.existsSync(process.cwd() + "/src")) {
        console.error("No src directory found!");
        return;
    }
    if (!fs.existsSync(process.cwd() + "/target")) {
        fs.mkdirSync(process.cwd() + "/target");
    }
    let filelist = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlogx$/));
    console.log("Files to compile: ", filelist);
    for (var filename of filelist) {
        console.log(`Compiling file ${filename}`);
        let data = fs.readFileSync(`src/${filename}`, 'utf-8').split("\r\n");
        fs.writeFileSync(`target/${filename.slice(0, -1)}`, compileMlogxToMlog(data).join("\r\n"));
    }
}
main();
