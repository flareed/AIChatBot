const fs = require('fs').promises;
const path = require('path');

class ChatHistory {
    constructor(filename = 'chat_history.json') {
        this.filename = filename;
        this.buffer = [];
    }

    // Load buffer from JSON file
    async load() {
        try {
            const data = await fs.readFile(this.filename, 'utf8');
            this.buffer = JSON.parse(data);
            return this.buffer;
        } catch (error) {
            // If file doesn't exist, return empty buffer
            this.buffer = [];
            return this.buffer;
        }
    }

    // Save buffer to JSON file
    async save(buffer) {
        this.buffer = buffer;
        await fs.writeFile(
            this.filename,
            JSON.stringify(buffer, null, 2),
            'utf8'
        );
    }
}

module.exports = ChatHistory; 