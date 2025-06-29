const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require(path.join(__dirname, "load_env.js"));
const { sendChat_Tool, sendChat_ToolResponse, toolHandlers } = require('./chatbot_core');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    try {
        const toolCall = await sendChat_Tool(userMessage);

        // If no tool was called, assume normal assistant response was already added
        if (!toolCall) {
            const lastMsg = require('./chatbot_core').getLastBotMessage();
            console.log(`No tool call, returning last message: ${lastMsg}`);
            return res.json({ reply: lastMsg });
        }

        const functionName = toolCall.function?.name;
        const args = toolCall.function?.arguments;

        if (toolHandlers[functionName]) {
            const resultText = toolHandlers[functionName](args);
            const reply = await sendChat_ToolResponse(resultText, functionName);
            console.log(`Tool call handled: ${functionName}`);
            console.log(`Raw args from tool call:`, args);
            return res.json({ reply });
        } else {
            const reply = await sendChat_ToolResponse(`No such tool`, functionName);
            console.log(`No handler for tool: ${functionName}`);
            return res.json({ reply });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
