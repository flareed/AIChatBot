const { textSplitter, splitBySection, createChunkSummary } = require('./lib_text_splitter');

/**
 * Text Splitter Tools cho AI Chatbot
 * Cung cấp các function tiện ích để xử lý văn bản dài
 */

/**
 * Xử lý văn bản dài cho AI chat
 * @param {string} text - Văn bản cần xử lý
 * @param {number} maxTokens - Giới hạn tokens (ước tính 1 token = 4 chars)
 * @param {string} strategy - Chiến lược chia: 'basic', 'section', 'smart'
 * @returns {object} Kết quả xử lý
 */
function processTextForChat(text, maxTokens = 2000, strategy = 'smart') {
    const charLimit = maxTokens * 4; // Rough estimation: 1 token ≈ 4 chars
    let chunks = [];
    
    switch (strategy) {
        case 'basic':
            chunks = textSplitter(text, charLimit);
            break;
        case 'section':
            chunks = splitBySection(text, charLimit);
            break;
        case 'smart':
        default:
            // Thử section trước, nếu không có section thì dùng basic
            chunks = splitBySection(text, charLimit);
            if (chunks.length === 1 && chunks[0].length > charLimit) {
                chunks = textSplitter(text, charLimit, {
                    overlap: 100,
                    preserveSentences: true,
                    preserveParagraphs: true
                });
            }
            break;
    }
    
    return {
        originalLength: text.length,
        chunkCount: chunks.length,
        chunks: chunks,
        summary: createChunkSummary(chunks),
        strategy: strategy
    };
}

/**
 * Tạo context từ nhiều chunks cho AI
 * @param {array} chunks - Mảng các chunks
 * @param {number} maxChunks - Số lượng chunks tối đa để kết hợp
 * @returns {string} Context đã được kết hợp
 */
function createContextFromChunks(chunks, maxChunks = 3) {
    const selectedChunks = chunks.slice(0, maxChunks);
    return selectedChunks.map((chunk, index) => {
        return `--- Phần ${index + 1} ---\n${chunk}\n`;
    }).join('\n');
}

/**
 * Tìm chunks liên quan đến query
 * @param {array} chunks - Mảng các chunks
 * @param {string} query - Câu hỏi/từ khóa cần tìm
 * @param {number} maxResults - Số lượng kết quả tối đa
 * @returns {array} Mảng chunks liên quan
 */
function findRelevantChunks(chunks, query, maxResults = 3) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    const scoredChunks = chunks.map((chunk, index) => {
        const chunkLower = chunk.toLowerCase();
        let score = 0;
        
        // Tính điểm dựa trên số lần xuất hiện của từ khóa
        queryWords.forEach(word => {
            const matches = (chunkLower.match(new RegExp(word, 'g')) || []).length;
            score += matches;
        });
        
        // Bonus nếu query xuất hiện nguyên cụm
        if (chunkLower.includes(queryLower)) {
            score += 10;
        }
        
        return {
            chunk: chunk,
            index: index,
            score: score
        };
    });
    
    // Sắp xếp theo điểm và lấy top results
    return scoredChunks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map(item => item.chunk);
}

/**
 * Tạo summary cho văn bản dài
 * @param {string} text - Văn bản cần tóm tắt
 * @param {number} maxSummaryLength - Độ dài tối đa của summary
 * @returns {string} Summary đã tạo
 */
function createTextSummary(text, maxSummaryLength = 500) {
    if (text.length <= maxSummaryLength) {
        return text;
    }
    
    // Tìm các câu quan trọng (có thể chứa keywords)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const importantSentences = sentences.filter(sentence => {
        const s = sentence.toLowerCase();
        return s.includes('quan trọng') || s.includes('chính') || s.includes('cơ bản') || 
               s.includes('đầu tiên') || s.includes('cuối cùng') || s.includes('kết luận');
    });
    
    // Nếu có câu quan trọng, ưu tiên chúng
    if (importantSentences.length > 0) {
        let summary = importantSentences.join('. ') + '.';
        if (summary.length <= maxSummaryLength) {
            return summary;
        }
    }
    
    // Nếu không, lấy phần đầu của văn bản
    return text.substring(0, maxSummaryLength) + '...';
}

/**
 * Validate và clean text trước khi split
 * @param {string} text - Văn bản cần validate
 * @returns {string} Văn bản đã được clean
 */
function validateAndCleanText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    // Loại bỏ các ký tự không mong muốn
    return text
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/\t/g, '    ')  // Convert tabs to spaces
        .replace(/\s{3,}/g, '  ') // Reduce excessive spaces
        .trim();
}

module.exports = {
    processTextForChat,
    createContextFromChunks,
    findRelevantChunks,
    createTextSummary,
    validateAndCleanText
};
