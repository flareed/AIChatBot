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
        // Lọc lịch sử: chỉ trả về user hoặc assistant có content khác rỗng
        const filteredHistory = history.filter(msg => {
            if (msg.role === 'user') return true;
            if (msg.role === 'assistant' && msg.content && msg.content.trim() !== '') return true;
            return false;
        });
        res.json({ history: filteredHistory });
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

/* For normal chat */
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    /* */
    const response = await chatbot.sendChat(userMessage);
    if (response.isError) {
        console.log(`Error: ${response.message}`);
        return res.json({ reply: `${response.message}, please try again` });
    }

    /* */
    return res.json({ reply: response.message });
});

/* For tool chat */
app.post('/api/chat-with-tools', async (req, res) => {
    const userMessage = req.body.message;

    /* */
    const response = await chatbot.sendChat_Tool(userMessage);
    if (response.isError) {
        console.log(`Error: ${response.message}`);
        return res.json({ reply: `${response.message}, please try again` });
    }

    /* */
    const tools = response.message;
    const tool = tools[0];
    const functionName = tool.function.name;
    const args = tool.function.arguments;

    console.log(tools);

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
            const filepath_listdirectory = args.rootpath;
            content = await mcp.listDirectory(filepath_listdirectory);
            break;
        case "readMultipleFiles":
            const filepaths = args.filepaths;
            content = await mcp.readMultipleFiles(filepaths);
            break;
        case "summarizeFile":
            const filepath = args.filepath;
            const fileContentResult = await mcp.readFile(filepath);
            if (fileContentResult.isError) return res.json({ reply: fileContentResult.message });
            content = await chatbot.sendPrompt(`Summarize the following document:\n\n${fileContentResult.message}`);
            break;
        case "searchFiles":
            const { rootpath, pattern, excludePatterns = [] } = args;
            content = await mcp.searchFiles(rootpath, pattern, excludePatterns);
            break;
        default:
            chatbot.addAssistantMessageToBuffer("Model supplied unknown tool");
            return res.json({ reply: "Model supplied unknown tool" });
    }
    chatbot.addToolResponseToBuffer(content.message, functionName);
    chatbot.addAssistantMessageToBuffer(content.message);
    await chatbot.saveBuffer();

    /* */
    return res.json({ reply: content.message });
}
);

/* For displaying tool list on the right side */
app.get('/api/tools', (req, res) => {
    res.json({ tools: chatbot.getToolsList() });
});

app.listen(process.env.SITE_PORT, () => {
    console.log(`Server running at http://localhost:${process.env.SITE_PORT}`);
});
