/**
 * Returns the current datetime for the message creation.
 */
function getCurrentTimestamp() {
	return new Date();
}

/**
 * Renders a message on the chat screen based on the given arguments.
 * This is called from the `showUserMessage` and `showBotMessage`.
 */
function renderMessageToScreen(args) {
	// local variables
	let displayDate = (args.time || getCurrentTimestamp()).toLocaleString('en-IN', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
	});
	let messagesContainer = $('.messages');

	// init element
	let message = $(`
	<li class="message ${args.message_side}">
		<div class="avatar"></div>
		<div class="text_wrapper">
			<div class="text">${args.text}</div>
			<div class="timestamp">${displayDate}</div>
		</div>
	</li>
	`);

	// add to parent
	messagesContainer.append(message);

	// animations
	setTimeout(function () {
		message.addClass('appeared');
	}, 0);
	messagesContainer.animate({ scrollTop: messagesContainer.prop('scrollHeight') }, 300);
}

/* Sends a message when the 'Enter' key is pressed.
 */
$(document).ready(function () {
	$('#msg_input').keydown(function (e) {
		// Check for 'Enter' key
		if (e.key === 'Enter') {
			// Prevent default behaviour of enter key
			e.preventDefault();
			// Trigger send button click event
			$('#send_button').click();
		}
	});
});

/**
 * Displays the user message on the chat screen. This is the right side message.
 */
function showUserMessage(message, datetime) {
	renderMessageToScreen({
		text: message,
		time: datetime,
		message_side: 'right',
	});
}

/**
 * Displays the chatbot message on the chat screen. This is the left side message.
 */
function showBotMessage(message, datetime) {
	renderMessageToScreen({
		text: message,
		time: datetime,
		message_side: 'left',
	});
}

let currentConversationId = null;

/**
 * Shows an error message in the chat
 */
function showErrorMessage(error) {
	renderMessageToScreen({
		text: `Error: ${error}`,
		time: getCurrentTimestamp(),
		message_side: 'left',
	});
}

/**
 * Load chat history
 */
async function loadChatHistory() {
	try {
		const response = await fetch('/api/chat/history');
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to load chat history');
		}
		const conversations = await response.json();

		// Clear existing history
		const historyList = $('#chat_history');
		historyList.empty();

		conversations.forEach(conv => {
			const date = new Date(conv.timestamp).toLocaleString('en-IN', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric'
			});

			const preview = conv.preview.length > 30
				? conv.preview.substring(0, 30) + '...'
				: conv.preview;

			const historyItem = $(`
				<li class="history_item" data-id="${conv.id}">
					<div class="preview">${preview}</div>
					<div class="timestamp">${date}</div>
				</li>
			`);

			historyList.append(historyItem);
		});
	} catch (error) {
		console.error('Error loading chat history:', error);
		showErrorMessage(error.message);
	}
}

/**
 * Load a specific conversation
 */
async function loadConversation(conversationId) {
	try {
		console.log('Loading conversation:', conversationId);
		const response = await fetch(`/api/chat/${conversationId}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to load conversation');
		}

		const data = await response.json();
		console.log('Received conversation data:', data);

		// Check if we have a valid response with messages
		if (!data || !data.messages || !Array.isArray(data.messages)) {
			throw new Error('Invalid conversation data received');
		}

		// Clear current messages
		$('.messages').empty();

		// Display messages (skip system messages)
		data.messages.forEach(msg => {
			if (!msg.role || !msg.content) return; // Skip invalid messages

			if (msg.role === 'user') {
				showUserMessage(msg.content);
			} else if (msg.role === 'assistant' && msg.content) {
				showBotMessage(msg.content);
			}
		});

		// Update active state in history
		$('.history_item').removeClass('active');
		$(`.history_item[data-id="${conversationId}"]`).addClass('active');

	} catch (error) {
		console.error('Error loading conversation:', error);
		showErrorMessage(error.message);
	}
}

/**
 * Start a new chat
 */
async function startNewChat() {
	try {
		const response = await fetch('/api/chat/new', {
			method: 'POST'
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to start new chat');
		}

		const data = await response.json();

		// Clear messages
		$('.messages').empty();

		// Show welcome message
		showBotMessage('Hello there! Type in a message.');

		// Clear input
		$('#msg_input').val('');

		// Update history
		await loadChatHistory();

		// Update active state
		$('.history_item').removeClass('active');
		$(`.history_item[data-id="${data.conversationId}"]`).addClass('active');

	} catch (error) {
		console.error('Error starting new chat:', error);
		showErrorMessage(error.message);
	}
}

// Event handlers
$('#new_chat_button').on('click', startNewChat);

$(document).on('click', '.history_item', function () {
	const conversationId = $(this).data('id');
	loadConversation(conversationId);
});

$('#send_button').on('click', async function (e) {
	const userMessage = $('#msg_input').val();
	if (!userMessage.trim()) return;

	showUserMessage(userMessage);
	$('#msg_input').val('');

	try {
		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: userMessage })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to send message');
		}

		const data = await response.json();
		showBotMessage(data.reply);

		// Refresh chat history
		await loadChatHistory();
	} catch (error) {
		console.error('Error sending message:', error);
		showErrorMessage(error.message);
	}
});

// Load chat history and start new chat when page loads
$(window).on('load', async function () {
	await loadChatHistory();
	await startNewChat();
});

/**
 * Returns a random string. Just to specify bot message to the user.
 */
function randomstring(length = 20) {
	let output = '';

	// magic function
	var randomchar = function () {
		var n = Math.floor(Math.random() * 62);
		if (n < 10) return n;
		if (n < 36) return String.fromCharCode(n + 55);
		return String.fromCharCode(n + 61);
	};

	while (output.length < length) output += randomchar();
	return output;
}

/**
 * Set initial bot message to the screen for the user.
 */
$(window).on('load', function () {
	showBotMessage('Hello there! Type in a message.');
});