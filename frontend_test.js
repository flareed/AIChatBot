const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require(path.join(__dirname, "load_env.js"));
const {
    sendChat_Tool,
    sendChat_ToolResponse,
    toolHandlers,
    startNewConversation,
    loadConversation,
    getCurrentConversation,
    listConversations,
    deleteConversation
} = require('./chatbot_core');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start a new conversation
app.post('/api/chat/new', async (req, res) => {
    try {
        console.log('Starting new conversation...');
        const conversationId = await startNewConversation();
        console.log('New conversation created:', conversationId);
        res.json({ conversationId });
    } catch (err) {
        console.error('Error starting new conversation:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Get chat history
app.get('/api/chat/history', async (req, res) => {
    try {
        console.log('Fetching chat history...');
        const conversations = await listConversations();
        console.log('Found conversations:', conversations);
        res.json(conversations);
    } catch (err) {
        console.error('Error getting chat history:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Load specific conversation
app.get('/api/chat/:conversationId', async (req, res) => {
    try {
        console.log('Loading conversation:', req.params.conversationId);
        const conversation = await loadConversation(req.params.conversationId);

        if (!conversation || !conversation.messages) {
            console.log('Conversation not found or invalid');
            return res.status(404).json({ error: 'Conversation not found' });
        }

        console.log('Loaded conversation:', JSON.stringify(conversation, null, 2));

        // Ensure the response has the correct structure
        const response = {
            id: conversation.id || req.params.conversationId,
            messages: Array.isArray(conversation.messages) ? conversation.messages.map(msg => ({
                role: msg.role || 'system',
                content: msg.content || '',
                ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {})
            })) : []
        };

        res.json(response);
    } catch (err) {
        console.error('Error loading conversation:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Delete conversation
app.delete('/api/chat/:conversationId', async (req, res) => {
    try {
        console.log('Deleting conversation:', req.params.conversationId);
        const success = await deleteConversation(req.params.conversationId);
        if (success) {
            console.log('Conversation deleted successfully');
            res.json({ success: true });
        } else {
            console.log('Conversation not found for deletion');
            res.status(404).json({ error: 'Conversation not found' });
        }
    } catch (err) {
        console.error('Error deleting conversation:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    console.log('Received chat message:', message);

    try {
        // Get current conversation or start a new one
        let currentConversation = await getCurrentConversation();
        if (!currentConversation) {
            console.log('No active conversation, starting new one...');
            const conversationId = await startNewConversation();
            currentConversation = { id: conversationId, messages: [] };
        }
        console.log('Using conversation:', currentConversation.id);

        // Add user message to conversation
        const toolCall = await sendChat_Tool(message);

        if (!toolCall) {
            const lastMsg = require('./chatbot_core').getLastBotMessage();
            console.log('No tool call, returning last message:', lastMsg);
            return res.json({
                reply: lastMsg,
                conversationId: currentConversation.id
            });
        }

        const functionName = toolCall.function?.name;
        const args = toolCall.function?.arguments;
        console.log('Tool call:', functionName, 'with args:', args);

        if (toolHandlers[functionName]) {
            const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
            const resultText = toolHandlers[functionName](parsedArgs);
            const reply = await sendChat_ToolResponse(resultText, functionName);
            console.log('Tool call handled, reply:', reply);
            return res.json({
                reply,
                conversationId: currentConversation.id
            });
        } else {
            console.log('No handler found for tool:', functionName);
            const reply = await sendChat_ToolResponse(`No such tool`, functionName);
            return res.json({
                reply,
                conversationId: currentConversation.id
            });
        }
    } catch (err) {
        console.error('Error in chat endpoint:', err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
});

// Log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Environment:', {
        HOST: process.env.HOST,
        PORT: process.env.PORT,
        MODEL: process.env.MODEL
    });
});
