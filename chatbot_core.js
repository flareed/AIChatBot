const path = require('path');
require(path.join(__dirname, "load_env.js"));
const { generateConversationId, saveConversation, loadConversation, listConversations, deleteConversation } = require('./chat_history_db');

let currentConversation = null;
let lastBotMessage = '';

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

async function startNewConversation() {
    const conversationId = generateConversationId();
    currentConversation = {
        id: conversationId,
        messages: [{
            role: 'system',
            content: 'You are a helpful assistant. Only call a function if the user explicitly asks for a calculation, date difference, or string analysis. For all other questions, answer directly without using any tool.'
        }]
    };
    await saveConversation(conversationId, currentConversation.messages);
    return conversationId;
}

async function switchToConversation(conversationId) {
    try {
        const conversation = await require('./chat_history_db').loadConversation(conversationId);
        if (conversation && conversation.messages) {
            currentConversation = {
                id: conversationId,
                messages: conversation.messages
            };
            return conversation;
        }
        return null;
    } catch (err) {
        console.error('Error loading conversation:', err);
        return null;
    }
}

async function getCurrentConversation() {
    return currentConversation;
}

function getLastBotMessage() {
    return lastBotMessage;
}

async function sendChat_Tool(message) {
    if (!currentConversation) {
        await startNewConversation();
    }

    // Add user message to conversation
    currentConversation.messages.push({
        role: 'user',
        content: message
    });

    // Save conversation after adding user message
    await saveConversation(currentConversation.id, currentConversation.messages);

    const ollama_url = `http://${process.env.HOST}:${process.env.PORT}`;
    const model = process.env.MODEL;

    // Make API call to Ollama
    const response = await fetch(`${ollama_url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            messages: currentConversation.messages,
            tools: tools_list,
            stream: false,
        })
    });

    if (!response.ok) {
        console.error("HTTP error:", response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    const botMessage = responseData.message;

    if (botMessage.tool_calls) {
        currentConversation.messages.push({
            role: botMessage.role,
            content: "",
            tool_calls: botMessage.tool_calls
        });
        await saveConversation(currentConversation.id, currentConversation.messages);
        return botMessage.tool_calls[0];
    }

    currentConversation.messages.push({
        role: botMessage.role,
        content: botMessage.content
    });
    lastBotMessage = botMessage.content;
    await saveConversation(currentConversation.id, currentConversation.messages);
    return null;
}

async function sendChat_ToolResponse(response, toolName) {
    if (!currentConversation) {
        throw new Error('No active conversation');
    }

    // Add tool response to conversation
    currentConversation.messages.push({
        role: 'tool',
        name: toolName,
        content: response
    });

    const ollama_url = `http://${process.env.HOST}:${process.env.PORT}`;
    const model = process.env.MODEL;

    // Make API call to Ollama with tool response
    const ollama_response = await fetch(`${ollama_url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            messages: currentConversation.messages,
            tools: tools_list,
            stream: false
        })
    });

    if (!ollama_response.ok) {
        throw new Error(`HTTP error! status: ${ollama_response.status}`);
    }

    const responseData = await ollama_response.json();
    const botMessage = responseData.message;

    // Add assistant response to conversation
    currentConversation.messages.push({
        role: botMessage.role,
        content: botMessage.content
    });
    lastBotMessage = botMessage.content;

    // Save conversation after adding all messages
    await saveConversation(currentConversation.id, currentConversation.messages);

    return botMessage.content;
}

module.exports = {
    sendChat_Tool,
    sendChat_ToolResponse,
    toolHandlers,
    startNewConversation,
    getCurrentConversation,
    getLastBotMessage
};