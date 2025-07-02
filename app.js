const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const { sendChat, sendChat_Tool, sendChat_ToolResponse, toolHandlers, initializeHistory, chatHistory } = require('./lib_chatbot_core');

require(path.join(__dirname, "lib_load_env.js")); // dot.env
const chatbox = require(path.join(__dirname, "lib_chatbot_core.js"));
const mcp = require(path.join(__dirname, "lib_mcp.js"));

/* Express initializing */
const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

/* Initialize chat history when starting server */
(async () => {
    try {
        await initializeHistory();
        console.log('Chat history loaded successfully');
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
})();

/* Get chat history */
app.get('/api/history', async (req, res) => {
    try {
        const history = await chatbox.chatHistory.load();
        res.json({ history });
    } catch (error) {
        console.error('Error loading history:', error);
        res.status(500).json({ error: 'Failed to load history' });
    }
});

/* Clear chat history */
app.post('/api/clear-history', async (req, res) => {
    try {
        await chatbox.clearBuffer();
        res.json({ success: true, message: 'Chat history cleared' });
    } catch (error) {
        console.error('Error clearing history:', error);
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

/* app.post: will only receive when user send a message
    1. Send user's message
    2. Receive message from chatbox
    3. Check if need tool call
        3.5 If tool call, call sendChat_Tool
    4. Send chatbot message
*/
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    /* */
    const response = await chatbox.sendChat(userMessage);
    if (response.isError) {
        console.log(`Error: ${response.message}`);
        return res.json({ reply: `${response.message}, please try again` });
    }

    /* Check if is tool call */
    const isToolCall = false;
    if (isToolCall) {
        // tools.forEach(tool => {
        //     const functionName = response.function?.name;
        //     const args = response.function?.arguments;

        //     const toolHandlers = chatbox.toolHandlers;
        //     if (toolHandlers[functionName]) {
        //         const resultText = toolHandlers[functionName](args);
        //         const reply = await chatbox.sendChat_ToolResponse(resultText, functionName);
        //         console.log(`Tool call handled: ${functionName}`);
        //         console.log(`Raw args from tool call:`, args);
        //         return res.json({ reply });
        //     } else {
        //         const reply = await sendChat_ToolResponse(`No such tool`, functionName);
        //         console.log(`No handler for tool: ${functionName}`);
        //         return res.json({ reply });
        //     }
        // });
    }

    /* */
    // const test_listdirectory = await mcp.listDirectory();
    // if (!test_listdirectory.isError)
    // {
    //     response.message = test_listdirectory.message;
    // }

    return res.json({ reply: response.message });
});

app.listen(process.env.SITE_PORT, () => {
    console.log(`Server running at http://localhost:${process.env.SITE_PORT}`);
});
