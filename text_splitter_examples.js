const { processTextForChat, createContextFromChunks, findRelevantChunks, createTextSummary } = require('./text_splitter_tools');

/**
 * Examples và Use Cases cho Text Splitter
 */

// Example 1: Xử lý file văn bản dài
console.log('=== EXAMPLE 1: Xử lý file văn bản dài ===\n');

const longDocument = `
# Hướng dẫn sử dụng ChatBot AI

## Giới thiệu
ChatBot AI là một hệ thống thông minh được thiết kế để tương tác với người dùng thông qua ngôn ngữ tự nhiên. Hệ thống này có khả năng hiểu và phản hồi các câu hỏi, yêu cầu của người dùng một cách chính xác và hữu ích.

## Cài đặt và Cấu hình

### Yêu cầu hệ thống
- Node.js version 14 trở lên
- RAM tối thiểu 4GB
- Kết nối internet ổn định
- Ollama đã được cài đặt và cấu hình

### Các bước cài đặt
1. Tải source code từ repository
2. Chạy lệnh npm install để cài đặt dependencies
3. Cấu hình file .env với các thông số phù hợp
4. Khởi động Ollama service
5. Chạy lệnh npm start để khởi động server

## Tính năng chính

### Chat cơ bản
Tính năng chat cơ bản cho phép người dùng trò chuyện với AI một cách tự nhiên. Hệ thống có thể:
- Trả lời câu hỏi thường gặp
- Cung cấp thông tin hỗ trợ
- Thực hiện các tác vụ đơn giản

### Chat với Tools
Tính năng chat với tools mở rộng khả năng của chatbot bằng cách tích hợp các công cụ bên ngoài:
- Đọc và phân tích file
- Tìm kiếm thông tin trong filesystem
- Thực hiện các tác vụ phức tạp

### Quản lý lịch sử
Hệ thống lưu trữ và quản lý lịch sử chat, giúp:
- Theo dõi các cuộc trò chuyện trước đó
- Duy trì context trong các phiên chat
- Cung cấp trải nghiệm nhất quán

## API Reference

### Endpoint /api/chat
- Method: POST
- Purpose: Gửi tin nhắn chat cơ bản
- Request body: { "message": "string" }
- Response: { "reply": "string" }

### Endpoint /api/chat-with-tools
- Method: POST
- Purpose: Gửi tin nhắn chat với tools support
- Request body: { "message": "string" }
- Response: { "reply": "string" }

### Endpoint /api/history
- Method: GET
- Purpose: Lấy lịch sử chat
- Response: { "history": [array] }

## Troubleshooting

### Lỗi kết nối Ollama
Nếu gặp lỗi kết nối tới Ollama:
1. Kiểm tra Ollama service có đang chạy không
2. Xác nhận port 11434 không bị chặn
3. Kiểm tra cấu hình trong file .env

### Lỗi memory
Nếu gặp lỗi memory:
1. Tăng memory limit cho Node.js
2. Tối ưu hóa model parameters
3. Giảm batch size nếu có thể

### Lỗi permissions
Nếu gặp lỗi permissions:
1. Kiểm tra quyền truy cập file system
2. Chạy với elevated permissions nếu cần
3. Cấu hình proper file permissions

## Best Practices

### Optimizing Performance
- Sử dụng model size phù hợp với hardware
- Implement proper caching mechanisms
- Monitor memory usage thường xuyên

### Security Considerations
- Không expose sensitive information
- Validate input data thoroughly
- Implement rate limiting
- Use HTTPS in production

### Maintenance
- Regular backup của chat history
- Monitor log files for errors
- Update dependencies regularly
- Performance testing định kỳ

## Kết luận
ChatBot AI là một công cụ mạnh mẽ và linh hoạt cho việc tự động hóa tương tác với người dùng. Với các tính năng phong phú và khả năng mở rộng cao, nó có thể được tùy chỉnh để phù hợp với nhiều use cases khác nhau.
`;

// Process document với different strategies
const result1 = processTextForChat(longDocument, 1000, 'basic');
console.log(`Strategy: Basic | Chunks: ${result1.chunkCount} | Original: ${result1.originalLength} chars`);

const result2 = processTextForChat(longDocument, 1000, 'section');
console.log(`Strategy: Section | Chunks: ${result2.chunkCount} | Original: ${result2.originalLength} chars`);

const result3 = processTextForChat(longDocument, 1000, 'smart');
console.log(`Strategy: Smart | Chunks: ${result3.chunkCount} | Original: ${result3.originalLength} chars`);

// Example 2: Tìm kiếm thông tin liên quan
console.log('\n=== EXAMPLE 2: Tìm kiếm thông tin liên quan ===\n');

const query = "cài đặt và cấu hình";
const relevantChunks = findRelevantChunks(result3.chunks, query);
console.log(`Tìm thấy ${relevantChunks.length} chunks liên quan đến "${query}"`);

relevantChunks.forEach((chunk, index) => {
    console.log(`\nChunk ${index + 1}:`);
    console.log(chunk.substring(0, 200) + '...');
});

// Example 3: Tạo context cho AI
console.log('\n=== EXAMPLE 3: Tạo context cho AI ===\n');

const context = createContextFromChunks(relevantChunks, 2);
console.log('Context được tạo cho AI:');
console.log(context);

// Example 4: Tạo summary
console.log('\n=== EXAMPLE 4: Tạo summary ===\n');

const summary = createTextSummary(longDocument, 300);
console.log('Summary của document:');
console.log(summary);

// Example 5: Use case thực tế - Xử lý file PDF content
console.log('\n=== EXAMPLE 5: Xử lý file content thực tế ===\n');

function simulateFileProcessing(content, userQuery) {
    console.log('1. Xử lý và chia nhỏ content...');
    const processed = processTextForChat(content, 800, 'smart');
    
    console.log('2. Tìm kiếm thông tin liên quan...');
    const relevant = findRelevantChunks(processed.chunks, userQuery);
    
    console.log('3. Tạo context cho AI...');
    const context = createContextFromChunks(relevant, 2);
    
    console.log('4. Kết quả:');
    console.log(`- Chia thành ${processed.chunkCount} chunks`);
    console.log(`- Tìm thấy ${relevant.length} chunks liên quan`);
    console.log(`- Context length: ${context.length} chars`);
    
    return context;
}

const userQuery = "làm thế nào để cài đặt";
const finalContext = simulateFileProcessing(longDocument, userQuery);
console.log('\nContext cuối cùng:');
console.log(finalContext.substring(0, 500) + '...');

// Example 6: Batch processing nhiều files
console.log('\n=== EXAMPLE 6: Batch processing ===\n');

const files = [
    { name: 'readme.txt', content: 'This is a readme file with installation instructions.' },
    { name: 'guide.txt', content: 'This is a comprehensive guide for using the application.' },
    { name: 'troubleshooting.txt', content: 'Common issues and their solutions are listed here.' }
];

files.forEach(file => {
    const result = processTextForChat(file.content, 200, 'smart');
    console.log(`${file.name}: ${result.chunkCount} chunks, ${result.originalLength} chars`);
});
