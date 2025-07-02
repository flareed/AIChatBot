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
    content: "Only call a function if the user explicitly asks for a calculation, date difference, or string analysis. For all other questions, answer directly without using any tool."
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
            name: "add_numbers",
            description: "Add two numbers and return the result",
            parameters: {
                type: "object",
                properties: {
                    a: { type: "number", description: "The first number" },
                    b: { type: "number", description: "The second number" }
                },
                required: ["a", "b"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "days_until",
            description: "Calculate how many days until a given date (yyyy-mm-dd)",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "Future date in yyyy-mm-dd format" }
                },
                required: ["date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "string_length",
            description: "Return the length of a string",
            parameters: {
                type: "object",
                properties: {
                    input: { type: "string", description: "The string to measure" }
                },
                required: ["input"]
            }
        }
    }
];

const toolHandlers = {
    add_numbers: (args) => {
        const result = args.a + args.b;
        return `The sum of ${args.a} and ${args.b} is ${result}`;
    },

    days_until: (args) => {
        const now = new Date();
        const target = new Date(args.date);
        const diffTime = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return `That date is ${Math.abs(diffDays)} days ago.`;
        } else if (diffDays === 0) {
            return `That is today!`;
        } else {
            return `There are ${diffDays} day(s) until ${args.date}.`;
        }
    },

    string_length: (args) => {
        const length = args.input.length;
        return `The length of the string "${args.input}" is ${length} character(s).`;
    }
};

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
        console.log("Unexpected response format from Ollama");
        return;
    }
    const message = data.message;

    /* Print content */
    console.log(JSON.stringify(data, null, 4));
    buffer.push({ role: message.role, content: message.content });

    // Kiểm tra và cắt bớt buffer nếu cần
    trimBufferIfNeeded();

    // Save buffer after each message
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
    buffer.push({ role: message.role, content: "", tool_calls: tool_calls })
    return createResponse(tool_calls, true);
}

/* Must provide context of the assisant tool_calls and reply the function result 
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
        // console.log("Unexpected response format from Ollama");
        return;
    }
    const message = data.message;

    /* Print content */
    // console.log(JSON.stringify(data, null, 4));
    buffer.push({ role: message.role, content: message.content })
    return createResponse(message);
}

function getLastBotMessage() {
    return lastBotMessage;
}

module.exports = {
    sendChat, sendChat_Tool, sendChat_ToolResponse,
    toolHandlers,
    getLastBotMessage,
    clearBuffer,
    initializeHistory,
    chatHistory
};