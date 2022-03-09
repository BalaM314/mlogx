const fs = require("fs");
const programArgs = process.argv.slice(2);
if (process.cwd().match(/compiler$/gi)) {
    process.chdir("..");
}
function compileMlogxToMlog(data) {
    let outputData = [];
    for (var line of data) {
        if (line.startsWith("#") || line.startsWith("//")) {
        }
        else if (line.startsWith("call")) {
            if (!line.match(/^call [\w]+$/gi))
                throw new Error(`Compiler error: \`call\` used incorrectly\nat <${line}>\nFunction name can only be alphanumeric with underscore.\nExample: call function_name`);
            outputData.push("set _stack1 @counter");
            outputData.push("op add _stack1 _stack1 2");
            outputData.push(`jump ${line.split(" ")[1]} always`);
        }
        else if (line.startsWith("increment")) {
            if (!line.match(/^increment [\S]+ [\d]+$/gi))
                throw new Error(`Compiler error: \`increment\` used incorrectly\nat <${line}>\nExample of correct usage: increment variable_name 2`);
            outputData.push(`op add ${line.split(" ")[1]} ${line.split(" ")[1]} ${line.split(" ")[2]}`);
        }
        else if (line.startsWith("return")) {
            outputData.push("set @counter _stack1");
        }
        else if (line.startsWith("throw")) {
            if (!line.match(/^throw .+$/gi))
                throw new Error(`Compiler error: \`throw\` used incorrectly\nat <${line}>\nExample of correct usage: throw "Oh no!"`);
            outputData.push(`set _err ${line.split(" ").slice(1).join(" ")}`);
            outputData.push("jump _err always");
        }
        else {
            outputData.push(line);
        }
    }
    return outputData;
}
function main() {
    if (programArgs[0]) {
        console.log("Compiling in directory " + programArgs[0]);
        process.chdir(programArgs[0]);
    }
    if (!fs.existsSync(process.cwd() + "/src")) {
        console.error("No src directory found!");
        return;
    }
    if (!fs.existsSync(process.cwd() + "/build")) {
        fs.mkdirSync(process.cwd() + "/build");
    }
    let filelist_mlogx = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlogx$/));
    let filelist_mlog = fs.readdirSync(process.cwd() + "/src").filter(filename => filename.match(/.mlog$/));
    console.log("Files to compile: ", filelist_mlogx);
    let compiledData = {};
    let mainData = "";
    for (let filename of filelist_mlogx) {
        console.log(`Compiling file ${filename}`);
        let data = fs.readFileSync(`src/${filename}`, 'utf-8').split("\r\n");
        let outputData;
        try {
            outputData = compileMlogxToMlog(data).join("\r\n");
        }
        catch (err) {
            console.error(`Failed to compile file ${filename}!`);
            console.error(err.message);
            return;
        }
        fs.writeFileSync(`build/${filename.slice(0, -1)}`, outputData);
        if (filename != "main.mlogx") {
            compiledData[filename] = outputData;
        }
        else {
            mainData = outputData;
        }
    }
    for (let filename of filelist_mlog) {
        if (filename != "main.mlog") {
            compiledData[filename] = fs.readFileSync(`src/${filename}`, 'utf-8');
        }
        else {
            mainData = fs.readFileSync(`src/${filename}`, 'utf-8');
        }
    }
    console.log("Compiled all files successfully.");
    console.log("Assembling output:");
    fs.writeFileSync(`out.mlog`, mainData + "\r\nend\r\n\r\n" + Object.values(compiledData).join("\r\n\r\n"));
    console.log("Done!");
}
main();
