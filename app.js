const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');

require(path.join(__dirname, "lib_load_env.js")); // dot.env
const chatbot = require(path.join(__dirname, "lib_chatbot_core.js"));
const mcp = require(path.join(__dirname, "lib_mcp.js"));

/* Express initializing */
const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

/* Initialize chat history when starting server */
(async () => {
    try {
        await chatbot.initializeHistory();
        console.log('Chat history loaded successfully');
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
})();

/* Get chat history */
app.get('/api/history', async (req, res) => {
    try {
        const history = await chatbot.chatHistory.load();
        res.json({ history });
    } catch (error) {
        console.error('Error loading history:', error);
        res.status(500).json({ error: 'Failed to load history' });
    }
});

/* Clear chat history */
app.post('/api/clear-history', async (req, res) => {
    try {
        await chatbot.clearBuffer();
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
    const response = await chatbot.sendChat_Tool(userMessage);
    if (response.isError) {
        console.log(`Error: ${response.message}`);
        return res.json({ reply: `${response.message}, please try again` });
    }

    /* Check if is tool call */
    const isToolUse = response.isToolUse;
    if (isToolUse) {
        const tools = response.message;

        const tool = tools[0];
        const functionName = tool.function.name;
        const args = tool.function.arguments;

        let content = "";
        switch (functionName) {
            case "readFile":
                const filepath_readfile = args.filepath;
                content = await mcp.readFile(filepath_readfile);
                break;
            case "categorizeFile":
                const filepath_categorizefile = args.filepath;
                const filecontent = await mcp.readFile(filepath_categorizefile);
                content = await chatbot.sendPrompt(`Categorize the following content, return it as follow: $CATEGORY$ (without the $) \n\'${filecontent.message}\'`)
                break;
            case "listDirectory":
                const rootpath = args.rootpath;
                content = await mcp.listDirectory(rootpath);
                break;
            default:
                return res.json({ reply: "Model supplied unknown tool" });
        }
        chatbot.addToolResponseToBuffer(content.message, functionName);
        chatbot.addAssistantMessageToBuffer(content.message);
        await chatbot.saveBuffer();
        return res.json({ reply: content.message });

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
