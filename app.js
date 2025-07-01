const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');

require(path.join(__dirname, "load_env.js")); // dot.env
const chatbox = require('./chatbot_core');

/* Express initializing */
const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

/* Site 
    User sends a message -> site sends to chatbox 
    -> chatbox replies -> site displays to user the reply
*/
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const response = await chatbox.sendChat_Tool(userMessage);

    if (!response) {
        const lastMsg = chatbox.getLastBotMessage();
        console.log(`No tool call, returning last message: ${lastMsg}`);
        return res.json({ reply: lastMsg });
    }

    const functionName = response.function?.name;
    const args = response.function?.arguments;

    const toolHandlers = chatbox.toolHandlers;
    if (toolHandlers[functionName]) {
        const resultText = toolHandlers[functionName](args);
        const reply = await chatbox.sendChat_ToolResponse(resultText, functionName);
        console.log(`Tool call handled: ${functionName}`);
        console.log(`Raw args from tool call:`, args);
        return res.json({ reply });
    } else {
        const reply = await sendChat_ToolResponse(`No such tool`, functionName);
        console.log(`No handler for tool: ${functionName}`);
        return res.json({ reply });
    }

});

app.listen(process.env.SITE_PORT, () => {
    console.log(`Server running at http://localhost:${process.env.SITE_PORT}`);
});
