const { textSplitter, splitBySection, createChunkSummary } = require('./lib_text_splitter');

// Test data - văn bản dài có nhiều section
const longText = `
# Giới thiệu về AI và Machine Learning

Trí tuệ nhân tạo (AI) là một lĩnh vực rộng lớn trong khoa học máy tính, tập trung vào việc tạo ra các hệ thống có thể thực hiện các nhiệm vụ thường yêu cầu trí tuệ con người. Machine Learning là một phần quan trọng của AI, cho phép máy tính học hỏi và cải thiện hiệu suất từ dữ liệu mà không cần được lập trình cụ thể.

## Các loại Machine Learning

### 1. Supervised Learning
Supervised Learning là phương pháp học máy sử dụng dữ liệu đã được gán nhãn để huấn luyện model. Trong phương pháp này, chúng ta có input data và output mong muốn. Model học cách mapping từ input đến output dựa trên các ví dụ được cung cấp.

Ví dụ về Supervised Learning:
- Phân loại email spam
- Dự đoán giá nhà
- Nhận dạng hình ảnh
- Dịch máy

### 2. Unsupervised Learning
Unsupervised Learning là phương pháp học máy sử dụng dữ liệu chưa được gán nhãn. Model phải tự tìm ra patterns, structures, hoặc relationships trong dữ liệu mà không có ground truth.

Các kỹ thuật Unsupervised Learning phổ biến:
- Clustering: Nhóm dữ liệu thành các cụm
- Dimensionality Reduction: Giảm số chiều của dữ liệu
- Association Rule Learning: Tìm ra mối quan hệ giữa các items
- Anomaly Detection: Phát hiện các điểm bất thường

### 3. Reinforcement Learning
Reinforcement Learning là phương pháp học thông qua tương tác với môi trường. Agent học cách hành động để maximize reward thông qua trial and error.

## Deep Learning

Deep Learning là một subset của Machine Learning, sử dụng neural networks với nhiều layers (deep neural networks) để học các patterns phức tạp từ dữ liệu.

### Neural Networks
Neural Networks được lấy cảm hứng từ cách não bộ con người hoạt động. Chúng bao gồm các nodes (neurons) được kết nối với nhau thành các layers.

### Convolutional Neural Networks (CNN)
CNN đặc biệt hiệu quả trong xử lý hình ảnh và computer vision. Chúng sử dụng convolution operations để extract features từ images.

### Recurrent Neural Networks (RNN)
RNN được thiết kế để xử lý sequential data như text, speech, hoặc time series. Chúng có khả năng "nhớ" thông tin từ các timesteps trước đó.

## Ứng dụng của AI trong thực tế

AI đang được ứng dụng rộng rãi trong nhiều lĩnh vực:

1. **Healthcare**: Chẩn đoán y khoa, phát hiện ung thư, drug discovery
2. **Finance**: Fraud detection, algorithmic trading, risk assessment
3. **Transportation**: Autonomous vehicles, traffic optimization
4. **Entertainment**: Recommendation systems, game AI
5. **Education**: Personalized learning, intelligent tutoring systems

## Thách thức và hạn chế

Mặc dù AI có nhiều tiềm năng, nhưng cũng đối mặt với các thách thức:

- **Data Quality**: AI cần dữ liệu chất lượng cao để hoạt động hiệu quả
- **Bias và Fairness**: AI có thể perpetuate hoặc amplify biases có trong training data
- **Interpretability**: Nhiều AI models hoạt động như "black boxes"
- **Privacy và Security**: Concerns về việc sử dụng personal data
- **Job Displacement**: AI có thể thay thế một số công việc của con người

## Tương lai của AI

Tương lai của AI rất hứa hẹn với nhiều breakthrough technologies đang được phát triển:

- **Artificial General Intelligence (AGI)**: AI có khả năng tương đương con người
- **Quantum Machine Learning**: Kết hợp quantum computing với ML
- **Explainable AI**: Tạo ra AI models có thể giải thích decisions
- **Edge AI**: Deploy AI models trên edge devices
- **AI Ethics**: Phát triển framework cho responsible AI

Kết luận: AI và Machine Learning đang transform cách chúng ta sống và làm việc. Việc hiểu rõ các concepts cơ bản và applications sẽ giúp chúng ta tận dụng tối đa tiềm năng của công nghệ này.
`;

console.log('=== TEST TEXT SPLITTER ===\n');

// Test 1: Basic text splitting
console.log('1. Basic Text Splitting (1000 chars):');
const chunks1 = textSplitter(longText, 1000);
chunks1.forEach((chunk, index) => {
    console.log(`Chunk ${index + 1} (${chunk.length} chars): ${chunk.substring(0, 80)}...`);
});
console.log(`Total chunks: ${chunks1.length}\n`);

// Test 2: Split by section
console.log('2. Split by Section (800 chars):');
const chunks2 = splitBySection(longText, 800);
chunks2.forEach((chunk, index) => {
    console.log(`Section ${index + 1} (${chunk.length} chars): ${chunk.substring(0, 80)}...`);
});
console.log(`Total sections: ${chunks2.length}\n`);

// Test 3: Create summary
console.log('3. Chunk Summary:');
const summary = createChunkSummary(textSplitter(longText, 1200));
summary.forEach(item => {
    console.log(`Chunk ${item.index + 1}: ${item.length} chars, ${item.wordCount} words`);
    console.log(`Preview: ${item.preview}\n`);
});

// Test 4: Different options
console.log('4. Custom Options (overlap=50, preserve sentences):');
const chunks4 = textSplitter(longText, 600, {
    overlap: 50,
    preserveSentences: true,
    preserveParagraphs: true
});
console.log(`Created ${chunks4.length} chunks with overlap`);
chunks4.slice(0, 3).forEach((chunk, index) => {
    console.log(`Chunk ${index + 1} (${chunk.length} chars): ${chunk.substring(0, 100)}...`);
});

// Test 5: Short text
console.log('\n5. Short Text Test:');
const shortText = "This is a short text that doesn't need splitting.";
const shortChunks = textSplitter(shortText, 1000);
console.log(`Short text chunks: ${shortChunks.length}`);
console.log(`Content: ${shortChunks[0]}`);
