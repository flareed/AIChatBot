const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');

require(path.join(__dirname, "lib_load_env.js")); // dot.env
const chatbox = require(path.join(__dirname, "lib_chatbot_core.js"));
const mcp = require(path.join(__dirname, "lib_mcp.js"));

/* Express initializing */
const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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
