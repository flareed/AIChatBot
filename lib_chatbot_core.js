const path = require('path');
require(path.join(__dirname, "lib_load_env.js"));
const ChatHistory = require('./lib_history');

/* */
const ollama_url = `http://${process.env.OLLAMA_HOST}:${process.env.OLLAMA_PORT}`;
const model = process.env.MODEL;

const ERR_MODEL_UNKNOWN_RESPONSE = "Something is wrong with the model, please try again";

/* System prompt - hướng dẫn cơ bản cho AI */
const SYSTEM_PROMPT = {
    role: "user",
    content: "Only call a function if the user explicitly asks for it"
};

// Giới hạn số lượng messages trong buffer để tránh quá token limit
const MAX_BUFFER_LENGTH = 20; // Có thể điều chỉnh số này

/* */
let buffer = [SYSTEM_PROMPT];
let lastBotMessage = "";

// Initialize chat history
const chatHistory = new ChatHistory();

// Load history at startup
async function initializeHistory() {
    const savedBuffer = await chatHistory.load();
    if (savedBuffer && savedBuffer.length > 0) {
        buffer = savedBuffer;
    }
}

// Save current buffer
async function saveBuffer() {
    await chatHistory.save(buffer);
}

const tools_list = [
    {
        type: "function",
        function: {
            name: "readFile",
            description: "Read the content of a file",
            parameters: {
                type: "object",
                properties: {
                    filepath: { type: "string", description: "The relative path to the file" },
                },
                required: ["filepath"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "categorizeFile",
            description: "Categorize a file on the hard drive",
            parameters: {
                type: "object",
                properties: {
                    filepath: { type: "string", description: "The relative path to the file" },
                },
                required: ["filepath"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "categorizeFiles",
            description: "Categorize a list of files on the hard drive",
            parameters: {
                type: "object",
                properties: {
                    filepaths:
                    {
                        type: "array",
                        "items": {
                            "type": "string"
                        },
                        description: "An array of filepaths, each element is a filepath"
                    },
                },
                required: ["filepaths"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "listDirectory",
            description: "List the files/directories from the rootpath (ex: \"C:/\" what folders & files inside it)",
            parameters: {
                type: "object",
                properties: {
                    rootpath: { type: "string", description: "The rootpath from which we list the content (default is \"/\"" },
                },
                required: ["rootpath"]
            }
        }
    },
];

// ------------------------ TOOL HANDLERS ------------------------
function createResponse(message, isToolUse = false, isError = false) {
    return { message: message, isToolUse: isToolUse, isError: isError };
}

function createErrorResponse(message, isToolUse = false) {
    return createResponse(message, isToolUse, true);
}

/* Reset buffer về trạng thái ban đầu với system prompt */
function clearBuffer() {
    buffer = [SYSTEM_PROMPT];
    saveBuffer(); // Save empty buffer
    console.log("Buffer has been cleared and reset to initial state");
}

/* Kiểm tra và cắt bớt buffer nếu quá dài */
function trimBufferIfNeeded() {
    if (buffer.length > MAX_BUFFER_LENGTH) {
        // Giữ system prompt và các tin nhắn gần nhất
        const trimmedBuffer = [
            SYSTEM_PROMPT,
            ...buffer.slice(-(MAX_BUFFER_LENGTH - 1))
        ];
        buffer = trimmedBuffer;
        saveBuffer();
        console.log(`Buffer was too long and has been trimmed to ${MAX_BUFFER_LENGTH} messages`);
    }
}

async function sendPrompt(text) {
    const ollama_url = `http://${process.env.OLLAMA_HOST}:${process.env.OLLAMA_PORT}`;
    const model = process.env.MODEL;

    /* Fetch */
    let response = {};
    try {
        response = await fetch(`${ollama_url}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                prompt: text,
                stream: false,
            })
        });
    }
    catch (err) {
        buffer.pop();
        console.log(`Network error: ${err.message}`)
        return createErrorResponse(`Site network error: ${err.message}`);
    }

    /* Error handling */
    if (!response.ok) {
        buffer.pop();
        return createErrorResponse(`HTTP error: ${response.status}, ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.response) {
        // console.log(ERR_MODEL_UNKNOWN_RESPONSE);
        return createErrorResponse(ERR_MODEL_UNKNOWN_RESPONSE);
    }

    /* Print content */
    // console.log(JSON.stringify(data, null, 4));
    // console.log(`Response: ${data.response}`);
    return createResponse(data.response, false);
}

async function sendChat(text) {
    // Check if user wants to clear context
    if (text.toLowerCase().includes('forget') || text.toLowerCase().includes('reset context')) {
        clearBuffer();
        return createResponse("Context has been reset. How can I help you?");
    }

    buffer.push({ role: "user", content: text });

    /* Fetch */
    let response = {};
    try {
        response = await fetch(`${ollama_url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                messages: buffer,
                stream: false,
            })
        });
    }
    catch (err) {
        buffer.pop();
        console.log(`Network error: ${err.message}`)
        return createErrorResponse(`Site network error: ${err.message}`);
    }

    /* Error handling */
    if (!response.ok) {
        buffer.pop();
        return createErrorResponse(`HTTP error: ${response.status}, ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.message) {
        // console.log(ERR_MODEL_UNKNOWN_RESPONSE);
        return createErrorResponse(ERR_MODEL_UNKNOWN_RESPONSE);
    }
    const message = data.message;

    /* Print content */
    console.log(JSON.stringify(data, null, 4));
    buffer.push({ role: "assistant", content: message.content });

    // Save buffer after each message
    trimBufferIfNeeded();
    await saveBuffer();

    return createResponse(message.content);
}

async function sendChat_Tool(text) {
    const ollama_url = `http://${process.env.OLLAMA_HOST}:${process.env.OLLAMA_PORT}`;
    const model = process.env.MODEL;
    buffer.push({ role: "user", content: text });

    /* Fetch */
    let response = {};
    try {
        response = await fetch(`${ollama_url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                messages: buffer,
                tools: tools_list,
                stream: false,
            })
        });
    }
    catch (err) {
        buffer.pop();
        // console.log(`Network error: ${err.message}`)
        return createErrorResponse(`Site network error: ${err.message}`);
    }

    /* Error handling */
    if (!response.ok) {
        buffer.pop();
        return createErrorResponse(`HTTP error: ${response.status}, ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.message) {
        // console.log(ERR_MODEL_UNKNOWN_RESPONSE);
        return createErrorResponse(ERR_MODEL_UNKNOWN_RESPONSE);
    }
    const message = data.message;

    /* Print content */
    // console.log(JSON.stringify(data, null, 4));
    const tool_calls = message.tool_calls;
    buffer.push({ role: "assistant", content: "", tool_calls: tool_calls })

    // Save buffer after each message
    trimBufferIfNeeded();
    await saveBuffer();

    return createResponse(tool_calls, true);
}

function addAssistantMessageToBuffer(text) {
    buffer.push({ role: "assistant", content: `The result is: ${text}}` });
}

function addToolResponseToBuffer(result, function_name) {
    buffer.push({ role: "tool", name: function_name, content: `The result is: ${result}}` });
}

/* Must provide context of the assistant tool_calls and reply the function result 
    Role: user/assistant/tool
        assistant: tool_calls context
        tool: function result
*/
async function sendChat_ToolResponse(text, function_name) {
    buffer.push({ role: "tool", name: function_name, content: text });

    /* Fetch */
    let response = {};
    try {
        response = await fetch(`${ollama_url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                messages: buffer,
                tools: tools_list,
                stream: false
            })
        });
    }
    catch (err) {
        buffer.pop();
        // console.log(`Network error: ${err.message}`)
        return createErrorResponse(`Site network error: ${err.message}`);
    }

    /* Error handling */
    if (!response.ok) {
        buffer.pop();
        return createErrorResponse(`HTTP error: ${response.status}, ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.message) {
        // console.log(ERR_MODEL_UNKNOWN_RESPONSE);
        return createErrorResponse(ERR_MODEL_UNKNOWN_RESPONSE);
    }
    const message = data.message;

    /* Print content */
    // console.log(JSON.stringify(data, null, 4));
    buffer.push({ role: "assistant", content: message.content })

    return createResponse(message);
}

function getLastBotMessage() {
    return lastBotMessage;
}

function getToolsList() {
    return tools_list;
}

module.exports = {
    sendPrompt, sendChat, sendChat_Tool, sendChat_ToolResponse,
    getLastBotMessage,
    saveBuffer, clearBuffer, addAssistantMessageToBuffer, addToolResponseToBuffer,
    initializeHistory, chatHistory,
    getToolsList,
};