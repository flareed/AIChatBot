const path = require('path');
require(path.join(__dirname, "load_env.js"))
var buffers = [];
tools_list = [
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Calculate the profit when depositing at a bank after x months",
            "parameters": {
                "type": "object",
                "properties": {
                    "money": {
                        "type": "number",
                        "description": "Can be a decimal or float or double value"
                    },
                    "month": {
                        "type": "number",
                        "description": "If not specified then it is 1 month"
                    },
                    "bank": {
                        "type": "string",
                        "description": "Bank name (Vietcombank, A Chau Bank, etc)"
                    }
                },
                "required": ["money", "month", "bank"]
            }
        }
    }
]

/* Prompt doesn't have context of previous messages 
    No role needed
*/
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
        console.log(`Network error: ${err.message}`)
        return;
    }

    /* Error handling */
    if (!response.ok) {
        console.error("HTTP error:", response.status, response.statusText);
        return;
    }

    const data = await response.json();
    if (!data.response) {
        console.log("Unexpected response format from Ollama");
        return;
    }

    /* Print content */
    console.log(JSON.stringify(data, null, 4));
    console.log(`Response: ${data.response}`);
    return data.response;
}

/* Chat has context of previous messages if include when fetch 
    Can have multiple messages from the user before an assisant response  
        User -> user -> user -> assisant
        Not just user -> assisant -> user -> assiant
    role: user/assistant
*/
async function sendChat(text) {
    const ollama_url = `http://${process.env.OLLAMA_HOST}:${process.env.OLLAMA_PORT}`;
    const model = process.env.MODEL;
    buffers.push({ role: "user", content: text });

    /* Fetch */
    let response = {};
    try {
        response = await fetch(`${ollama_url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                messages: buffers,
                stream: false,
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
    console.log(JSON.stringify(data, null, 4));
    buffers.push({ role: message.role, content: message.content })
    console.log(`Response: ${message.content}`);
    return message.content;
}

/* Must provide context of the assisant tool_calls and reply the function result 
    Role: user/assistant/tool
        assistant: tool_calls context
        tool: function result
*/
async function sendChat_Tool(text) {
    const ollama_url = `http://${process.env.OLLAMA_HOST}:${process.env.OLLAMA_PORT}`;
    const model = process.env.MODEL;
    buffers.push({ role: "user", content: text });

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
                stream: false,
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

    if (!message.tool_calls) {
        console.log("No tool call to do this");
        return;
    }

    /* Print content */
    console.log(JSON.stringify(data, null, 4));
    const tool_calls = message.tool_calls;
    // buffers.push({ role: message.role, content: "", tool_calls: JSON.stringify(tool_calls, null, 2) })
    buffers.push({ role: message.role, content: "", tool_calls: tool_calls })
    return tool_calls[0];
}

/* Must provide context of the assisant tool_calls and reply the function result 
    Role: user/assistant/tool
        assistant: tool_calls context
        tool: function result
*/
async function sendChat_ToolResponse(text, function_name) {
    const ollama_url = `http://${process.env.OLLAMA_HOST}:${process.env.OLLAMA_PORT}`;
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
    console.log(JSON.stringify(data, null, 4));
    buffers.push({ role: message.role, content: message.content })
    console.log(`Response: ${message.content}`);
    return message.content;
}

function calculate(bank, money, month) {
    if (bank.toLowerCase() == "a chau bank") {
        return money * Math.pow(1.12, month);
    }
    else if (bank.toLowerCase() === "vietcombank") {
        return money * Math.pow(1.01, month);
    }
}

(async () => {
    // console.log("Prompt type");
    // await sendPrompt("What is a llama?");

    // console.log("Chat type");
    // buffers.push({ role: "system", content: "Welcome to the chatbot!!!" });
    // await sendChat("A = 5, B = 12");
    // console.log("\n");
    // await sendChat("Calculate A * B");
    // console.log(buffers);

    console.log("Tool calling type");
    buffers = [];
    buffers.push({
        role: "system",
        content: "Only call a function if the user explicitly asks for a calculation, date difference, or string analysis. For all other questions, answer directly without using any tool."
    });
    const temp = await sendChat_Tool("What is the temperature right now in the US?");
    // // console.log(temp);
    // console.log("\n");
    // if (temp.function.name == "calculate") {
    //     const args = temp.function.arguments;
    //     await sendChat_ToolResponse(`The result is: ${calculate(args.bank, args.money, args.month)}`, temp.function.name);
    // }
    // else {
    //     await sendChat_ToolResponse(`There is no such function available`, temp.function.name);
    // }
    // console.log(buffers);

    console.log();
})();