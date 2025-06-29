const path = require('path');
require(path.join(__dirname, "load_env.js"));

let buffers = [
  {
    role: "system",
    content: "You are a helpful assistant. Only call a function if the user explicitly asks for a calculation, date difference, or string analysis. For all other questions, answer directly without using any tool."
  }
];

let lastBotMessage = "";

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

// ------------------------ TOOL HANDLERS ------------------------

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

async function sendChat_Tool(text) {
    const ollama_url = `http://${process.env.HOST}:${process.env.PORT}`;
    const model = process.env.MODEL;
    buffers.push({ role: "user", content: text });

    const response = await fetch(`${ollama_url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            messages: buffers,
            tools: tools_list,
            stream: false,
        })
    });

    const data = await response.json();
    const message = data.message;

    if (message.tool_calls) {
        buffers.push({ role: message.role, content: "", tool_calls: message.tool_calls });
        return message.tool_calls[0];
    }

    buffers.push({ role: message.role, content: message.content });
    lastBotMessage = message.content;
    return null;
}

/* Must provide context of the assisant tool_calls and reply the function result 
    Role: user/assistant/tool
        assistant: tool_calls context
        tool: function result
*/
async function sendChat_ToolResponse(text, function_name) {
    const ollama_url = `http://${process.env.HOST}:${process.env.PORT}`;
    const model = process.env.MODEL;
    buffers.push({ role: "tool", name: function_name, content: text });

    /* Fetch */
    let response = {};
    try {
        response = await fetch(`${ollama_url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                messages: buffers,
                tools: tools_list,
                stream: false
            })
        });
    }
    catch (err) {
        console.log(`Network error: ${err.message}`)
        return;
    }

    /* Error handling */
    if (!response.ok) {
        console.error("HTTP error:", response.status, response.statusText);
        return;
    }

    const data = await response.json();
    if (!data.message) {
        console.log("Unexpected response format from Ollama");
        return;
    }
    const message = data.message;

    /* Print content */
    // console.log(JSON.stringify(data, null, 4));
    buffers.push({ role: message.role, content: message.content })
    console.log(`Response: ${message.content}`);
    return message.content;
}

function getLastBotMessage() {
    return lastBotMessage;
}

module.exports = {
    sendChat_Tool,
    sendChat_ToolResponse,
    toolHandlers,
    getLastBotMessage
};