const path = require('path');
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

const filesystem_js_path = path.join(__dirname, "MCP Server", "filesystem.js");
const resource_dir_path = path.join(__dirname, "resources");
const transport = new StdioClientTransport({
    command: "node",
    args: [filesystem_js_path, resource_dir_path]
    // args: [filesystem_js_path, "./resources"]
});

const client = new Client({
    name: "example-client",
    version: "1.0.0"
});

async function connectClient() {
    await client.connect(transport);
}

async function closeClient() {
    client.close();
}

/*
    filepath: relative path from resource dir
*/
async function readFile(filepath) {
    const response = await client.callTool({
        name: "read_file",
        arguments: {
            path: path.join(resource_dir_path, filepath)
        }
    });
    // console.log(path.join(resource_dir_path, filepath));

    let isError = false;
    if ("isError" in response) {
        isError = true;
        // console.log(`Error!!!`)
        // console.log(`Info: ${response.content[0].text}`)
    }
    // else {
    //     console.log("File content");
    //     console.log(response.content[0].text);
    // }

    // return response.content[0].text;
    return { isError: isError, message: response.content[0].text };
}

/*
    rootpath: where to start searching from (relative path from resource dir)
*/
async function listDirectory(rootpath = "/") {
    const response = await client.callTool({
        name: "list_directory",
        arguments: {
            path: path.join(resource_dir_path, rootpath)
        }
    });
    // console.log(path.join(resource_dir_path, rootpath));

    let isError = false;
    if ("isError" in response) {
        isError = true;
        // console.log(`Error!!!`)
        // console.log(`Info: ${response.content[0].text}`)
    }
    // else {
    //     console.log("File content");
    //     console.log(response.content[0].text);
    // }

    // return response.content[0].text;
    return { isError: isError, message: response.content[0].text };
}

/*
    rootpath: where to start searching from (relative path from resource dir)
    pattern: string (what to search)
    excludePatterns: array of what to not match
*/
async function searchFiles(rootpath, pattern, excludePatterns) {
    const response = await client.callTool({
        name: "search_files",
        arguments: {
            path: path.join(resource_dir_path, rootpath),
            pattern: pattern,
            excludePatterns,
        }
    });
    // console.log(path.join(resource_dir_path, rootpath));

    let isError = false;
    if ("isError" in response) {
        isError = true;
        // console.log(`Error!!!`)
        // console.log(`Info: ${response.content[0].text}`)
    }
    // else {
    //     console.log("List file");
    //     console.log(response.content[0].text);
    // }

    return { isError: isError, message: response.content[0].text };
}

(async () => {
    // const response = await client.listTools()
    // const tools = response.tools;
    // tools.forEach(tool => {
    //     console.log(tool);
    // })
    await connectClient();

    // await readFile("test.pdf");

    // await listDirectory("/Level 1 Directory");

    // await searchFiles("/", "fi");
})();

module.exports =
{
    readFile,
    listDirectory, searchFiles,
    connectClient, closeClient,
}