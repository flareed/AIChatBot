const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create/connect to SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'chat_history.db'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    console.log('Initializing database tables...');
    db.serialize(() => {
        // Conversations table
        db.run(`
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                timestamp INTEGER,
                system_prompt TEXT
            )
        `, (err) => {
            if (err) {
                console.error('Error creating conversations table:', err);
            } else {
                console.log('Conversations table ready');
            }
        });

        // Messages table
        db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT,
                role TEXT,
                content TEXT,
                timestamp INTEGER,
                tool_calls TEXT,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating messages table:', err);
            } else {
                console.log('Messages table ready');
            }
        });
    });
}

// Generate a unique conversation ID
function generateConversationId() {
    const id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Generated new conversation ID:', id);
    return id;
}

// Save a conversation and its messages
async function saveConversation(conversationId, messages) {
    console.log('Saving conversation:', conversationId);
    console.log('Messages to save:', messages);

    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const systemPrompt = messages.find(m => m.role === 'system')?.content || '';

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Insert or update conversation
            db.run(
                `INSERT OR REPLACE INTO conversations (id, timestamp, system_prompt) VALUES (?, ?, ?)`,
                [conversationId, timestamp, systemPrompt],
                function (err) {
                    if (err) {
                        console.error('Error saving conversation:', err);
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    console.log('Saved conversation to conversations table');
                }
            );

            // Delete existing messages for this conversation
            db.run('DELETE FROM messages WHERE conversation_id = ?', [conversationId], function (err) {
                if (err) {
                    console.error('Error deleting existing messages:', err);
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                }
            });

            // Insert new messages - let SQLite handle the IDs
            const stmt = db.prepare(
                'INSERT INTO messages (conversation_id, role, content, timestamp, tool_calls) VALUES (?, ?, ?, ?, ?)'
            );

            // Insert messages in order
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                const toolCallsJson = msg.tool_calls ? JSON.stringify(msg.tool_calls) : null;
                stmt.run(
                    [conversationId, msg.role, msg.content, timestamp, toolCallsJson],
                    function (err) {
                        if (err) {
                            console.error('Error saving message:', err);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                    }
                );
            }

            stmt.finalize();

            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Error committing transaction:', err);
                    db.run('ROLLBACK');
                    reject(err);
                } else {
                    console.log('Successfully saved conversation and messages');
                    resolve();
                }
            });
        });
    });
}

// Load a specific conversation
async function loadConversation(conversationId) {
    console.log('Loading conversation:', conversationId);

    return new Promise((resolve, reject) => {
        // First check if the conversation exists
        db.get(
            'SELECT id, system_prompt FROM conversations WHERE id = ?',
            [conversationId],
            (err, conversation) => {
                if (err) {
                    console.error('Error checking conversation:', err);
                    reject(err);
                    return;
                }

                if (!conversation) {
                    console.log('Conversation not found:', conversationId);
                    // Return a valid structure even when conversation is not found
                    resolve({
                        id: conversationId,
                        messages: [{
                            role: 'system',
                            content: 'You are a helpful assistant.'
                        }]
                    });
                    return;
                }

                // If conversation exists, get its messages
                db.all(
                    `SELECT role, content, timestamp, tool_calls 
                     FROM messages 
                     WHERE conversation_id = ? 
                     ORDER BY id ASC`,
                    [conversationId],
                    (err, rows) => {
                        if (err) {
                            console.error('Error loading conversation messages:', err);
                            reject(err);
                            return;
                        }

                        console.log('Found messages:', rows?.length || 0);

                        // Initialize with system message
                        const messages = [{
                            role: 'system',
                            content: conversation.system_prompt || 'You are a helpful assistant.'
                        }];

                        // Add other messages if they exist
                        if (Array.isArray(rows)) {
                            rows.forEach(row => {
                                if (!row.role || !row.content) return;

                                let message = {
                                    role: row.role,
                                    content: row.content || ''
                                };

                                if (row.tool_calls) {
                                    try {
                                        message.tool_calls = JSON.parse(row.tool_calls);
                                    } catch (e) {
                                        console.error('Error parsing tool_calls:', e);
                                    }
                                }

                                messages.push(message);
                            });
                        }

                        resolve({
                            id: conversationId,
                            messages: messages
                        });
                    }
                );
            }
        );
    });
}

// List all conversations
async function listConversations() {
    console.log('Listing all conversations...');

    return new Promise((resolve, reject) => {
        db.all(
            `SELECT c.id, c.timestamp, m.content as preview
             FROM conversations c
             LEFT JOIN messages m ON m.conversation_id = c.id
             WHERE m.id IN (
                 SELECT MIN(id) 
                 FROM messages 
                 WHERE role != 'system' 
                 GROUP BY conversation_id
             )
             ORDER BY c.timestamp DESC`,
            [],
            (err, rows) => {
                if (err) {
                    console.error('Error listing conversations:', err);
                    reject(err);
                    return;
                }

                console.log('Found conversations:', rows.length);
                console.log('Conversations:', rows);

                resolve(rows.map(row => ({
                    id: row.id,
                    timestamp: row.timestamp,
                    preview: row.preview || 'Empty conversation'
                })));
            }
        );
    });
}

// Delete a conversation
async function deleteConversation(conversationId) {
    console.log('Deleting conversation:', conversationId);

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run('DELETE FROM messages WHERE conversation_id = ?', [conversationId], function (err) {
                if (err) {
                    console.error('Error deleting messages:', err);
                } else {
                    console.log('Deleted messages for conversation');
                }
            });

            db.run('DELETE FROM conversations WHERE id = ?', [conversationId], function (err) {
                if (err) {
                    console.error('Error deleting conversation:', err);
                } else {
                    console.log('Deleted conversation');
                }
            });

            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Error committing delete transaction:', err);
                    reject(err);
                } else {
                    console.log('Successfully deleted conversation');
                    resolve(true);
                }
            });
        });
    });
}

// Clean up database connection when the application exits
process.on('exit', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
    });
});

module.exports = {
    generateConversationId,
    saveConversation,
    loadConversation,
    listConversations,
    deleteConversation
}; 