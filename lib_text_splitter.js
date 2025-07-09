/**
 * Text Splitter Library
 * Chia văn bản dài thành các phần nhỏ hơn theo giới hạn ký tự
 * Ưu tiên giữ nguyên các section/paragraph và không cắt giữa từ
 */

/**
 * Chia văn bản thành các chunk dựa trên giới hạn ký tự
 * @param {string} text - Văn bản cần chia
 * @param {number} charLimit - Giới hạn ký tự cho mỗi chunk
 * @param {object} options - Tùy chọn bổ sung
 * @returns {array} Mảng các chunk đã được chia
 */
function textSplitter(text, charLimit, options = {}) {
    const {
        overlap = 100,           // Số ký tự trùng lặp giữa các chunk
        preserveSentences = true, // Có giữ nguyên câu không
        preserveParagraphs = true, // Có giữ nguyên đoạn văn không
        sectionSeparators = ['\n\n', '\n# ', '\n## ', '\n### '] // Các dấu phân cách section
    } = options;

    if (!text || typeof text !== 'string') {
        return [];
    }

    if (text.length <= charLimit) {
        return [text];
    }

    const chunks = [];
    let currentChunk = '';
    let remainingText = text;

    while (remainingText.length > 0) {
        // Nếu phần còn lại nhỏ hơn giới hạn, thêm vào chunk cuối
        if (remainingText.length <= charLimit) {
            if (currentChunk.length + remainingText.length <= charLimit) {
                currentChunk += remainingText;
                chunks.push(currentChunk.trim());
            } else {
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }
                chunks.push(remainingText.trim());
            }
            break;
        }

        // Tìm điểm cắt tối ưu
        const cutPoint = findOptimalCutPoint(remainingText, charLimit - currentChunk.length, {
            preserveSentences,
            preserveParagraphs,
            sectionSeparators
        });

        const textToCut = remainingText.substring(0, cutPoint);
        currentChunk += textToCut;

        // Thêm chunk vào danh sách
        chunks.push(currentChunk.trim());

        // Chuẩn bị cho chunk tiếp theo với overlap
        remainingText = remainingText.substring(cutPoint);
        
        // Tạo overlap cho chunk tiếp theo
        if (overlap > 0 && textToCut.length > overlap) {
            const overlapText = textToCut.substring(textToCut.length - overlap);
            currentChunk = overlapText;
        } else {
            currentChunk = '';
        }
    }

    return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Tìm điểm cắt tối ưu cho văn bản
 * @param {string} text - Văn bản cần tìm điểm cắt
 * @param {number} maxLength - Độ dài tối đa có thể cắt
 * @param {object} options - Tùy chọn
 * @returns {number} Vị trí cắt tối ưu
 */
function findOptimalCutPoint(text, maxLength, options = {}) {
    const { preserveSentences, preserveParagraphs, sectionSeparators } = options;

    if (maxLength >= text.length) {
        return text.length;
    }

    // Ưu tiên 1: Tìm section separator
    if (sectionSeparators && sectionSeparators.length > 0) {
        for (const separator of sectionSeparators) {
            const lastIndex = text.lastIndexOf(separator, maxLength);
            if (lastIndex > maxLength * 0.5) { // Chỉ chấp nhận nếu không quá ngắn
                return lastIndex + separator.length;
            }
        }
    }

    // Ưu tiên 2: Tìm paragraph break
    if (preserveParagraphs) {
        const paragraphBreak = text.lastIndexOf('\n\n', maxLength);
        if (paragraphBreak > maxLength * 0.5) {
            return paragraphBreak + 2;
        }
    }

    // Ưu tiên 3: Tìm sentence break
    if (preserveSentences) {
        const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
        let bestCutPoint = -1;
        
        for (const ender of sentenceEnders) {
            const lastIndex = text.lastIndexOf(ender, maxLength);
            if (lastIndex > bestCutPoint && lastIndex > maxLength * 0.5) {
                bestCutPoint = lastIndex + ender.length;
            }
        }
        
        if (bestCutPoint > -1) {
            return bestCutPoint;
        }
    }

    // Ưu tiên 4: Tìm word boundary
    const wordBoundary = text.lastIndexOf(' ', maxLength);
    if (wordBoundary > maxLength * 0.5) {
        return wordBoundary + 1;
    }

    // Ưu tiên 5: Tìm line break
    const lineBreak = text.lastIndexOf('\n', maxLength);
    if (lineBreak > maxLength * 0.5) {
        return lineBreak + 1;
    }

    // Cuối cùng: Cắt cứng tại giới hạn
    return maxLength;
}

/**
 * Chia văn bản thành các chunk dựa trên sections
 * @param {string} text - Văn bản cần chia
 * @param {number} charLimit - Giới hạn ký tự
 * @returns {array} Mảng các chunk đã chia theo section
 */
function splitBySection(text, charLimit) {
    const sections = [];
    const sectionRegex = /^(#{1,6}\s+.+)$/gm;
    let matches = [...text.matchAll(sectionRegex)];
    
    if (matches.length === 0) {
        return textSplitter(text, charLimit);
    }

    let lastIndex = 0;
    
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const nextMatch = matches[i + 1];
        
        const sectionStart = match.index;
        const sectionEnd = nextMatch ? nextMatch.index : text.length;
        
        // Thêm nội dung trước section đầu tiên
        if (i === 0 && sectionStart > lastIndex) {
            const preContent = text.substring(lastIndex, sectionStart).trim();
            if (preContent) {
                sections.push(...textSplitter(preContent, charLimit));
            }
        }
        
        // Thêm section hiện tại
        const sectionContent = text.substring(sectionStart, sectionEnd).trim();
        if (sectionContent.length <= charLimit) {
            sections.push(sectionContent);
        } else {
            sections.push(...textSplitter(sectionContent, charLimit));
        }
        
        lastIndex = sectionEnd;
    }
    
    return sections;
}

/**
 * Tạo summary cho mỗi chunk
 * @param {array} chunks - Mảng các chunk
 * @returns {array} Mảng objects chứa chunk và metadata
 */
function createChunkSummary(chunks) {
    return chunks.map((chunk, index) => ({
        index: index,
        content: chunk,
        length: chunk.length,
        wordCount: chunk.split(/\s+/).length,
        preview: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : '')
    }));
}

module.exports = {
    textSplitter,
    splitBySection,
    createChunkSummary,
    findOptimalCutPoint
};
