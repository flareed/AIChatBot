const path = require("path");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

const filesystem_js_path = path.join(__dirname, "MCP", "filesystem.js");
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

/*
    filepath: relative path
*/
async function readFile(client, filepath) {
    const response = await client.callTool({
        name: "read_file",
        arguments: {
            path: path.join(resource_dir_path, filepath)
        }
    });

    if ("isError" in response) {
        console.log(`Error!!!`)
        console.log(`Info: ${response.content[0].text}`)
    }
    else {
        console.log("File content");
        console.log(response.content[0].text);
    }

    response.content[0].text
}

/*
    rootpath: where to start searching from (relative path)
*/
async function listDirectory(client, rootpath) {
    const response = await client.callTool({
        name: "list_directory",
        arguments: {
            path: path.join(resource_dir_path, rootpath)
        }
    });

    if ("isError" in response) {
        console.log(`Error!!!`)
        console.log(`Info: ${response.content[0].text}`)
    }
    else {
        console.log("File content");
        console.log(response.content[0].text);
    }

    return response.content[0].text;
}

/*
    rootpath: where to start searching from (relative path)
    pattern: string (what to search)
    excludePatterns: array of what to not match
*/
async function searchFiles(client, rootpath, pattern, excludePatterns) {
    const response = await client.callTool({
        name: "search_files",
        arguments: {
            path: path.join(resource_dir_path, rootpath),
            pattern: pattern,
            excludePatterns,
        }
    });
    
    if ("isError" in response) {
        console.log(`Error!!!`)
        console.log(`Info: ${response.content[0].text}`)
    }
    else {
        console.log("List file");
        console.log(response.content[0].text);
    }

    return response.content[0].text;
}



(async () => {
    await client.connect(transport);

    // const response = await client.listTools()
    // const tools = response.tools;
    // tools.forEach(tool => {
    //     console.log(tool);
    // })

    await readFile(client, "test.pdf");

    await listDirectory(client, "/Level 1 Directory");

    await searchFiles(client, "/", "fi");

    client.close();
})();