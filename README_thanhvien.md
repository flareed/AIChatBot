# 0.5 Cần nodejs (đang dùng node 20)
- Tải nodejs & cài

- Tải project về -> giải nén

- Mở CMD ở thư mục vừa giải nén, rồi chạy:

>npm install

# 1. Cài Ollama
- Cài Ollama xong tải model về (không cần run model)

- Miễn nó chạy ở tray icon là được (port Ollama là 11434)

# 2. Nodejs <-> Ollama (tương tác giữa 2 cái)
## 2.1 Prompt
```
// ollama_url: 127.0.0.1:11434
// model = "mistral:7b"
// text = "What is a bot?"
const response = await fetch(`${ollama_url}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        model: model,
        prompt: text, # have this
        stream: false,
    })
});
```

## 2.2 Chat (khác biệt với prompt là có lịch sử (context) chia thành nhiều message)
```
// ollama_url: 127.0.0.1:11434
// model = "mistral:7b"
// messages = [ {role: "", content : ""}, {role: "", content : ""}]
const response = await fetch(`${ollama_url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        model: model,
        messages: messages, # messages instead of prompt 
        stream: false,
    })
});
```

## 2.3 Tool calling (là chat nhưng cung cấp thêm function để model trả lời mình nên dùng gì)
Model không tự gọi function. Mình nhận câu trả lời rồi tự gọi, xong đưa kết quả cho model
```
tools_list = [
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Calculate the profit when depositing at a bank after x months",
            "parameters": {
                "type": "object",
                "properties": {
                    "money": {
                        "type": "number",
                        "description": "Can be a decimal or float or double value"
                    },
                    "month": {
                        "type": "number",
                        "description": "If not specified then it is 1 month"
                    },
                    "bank": {
                        "type": "string",
                        "description": "Bank name (Vietcombank, A Chau Bank, etc)"
                    }
                },
                "required": ["money", "month", "bank"]
            }
        }
    }
]
```
```
// ollama_url: 127.0.0.1:11434
// model = "mistral:7b"
// messages = [ {role: "", content : ""}, {role: "", content : ""}]
const response = await fetch(`${ollama_url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        model: model,
        messages: messages,
        tools: tools_list, # have this
        stream: false,
    })
});
```

# 3. How to test
- Dùng VSCode/VSCodium rồi xem Debug Console khi Run (hoặc IDE/Editor nào khác)

- Hoặc dùng CMD, chạy `node <file>`
>node test.js

(hiện tại nó đang chạy VD của tool calling)

- Với T cũng có VD vài response mẫu của model ở thư mục responses
>Muốn biết thêm: https://github.com/ollama/ollama/blob/main/docs/api.md
