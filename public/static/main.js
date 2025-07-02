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

/**
 * Load and display chat history
 */
async function loadChatHistory() {
	try {
		const response = await fetch('/api/history');
		const data = await response.json();

		if (data.history && Array.isArray(data.history)) {
			// Clear existing messages
			$('.messages').empty();

			// Skip system prompt and display each message from history
			let hasMessages = false;
			data.history.forEach(msg => {
				// Skip the system prompt
				if (msg.content.includes("Only call a function if")) {
					return;
				}

				if (msg.role === 'user') {
					showUserMessage(msg.content);
					hasMessages = true;
				} else if (msg.role === 'assistant') {
					showBotMessage(msg.content);
					hasMessages = true;
				}
			});

			// If no messages (new chat), show welcome message
			if (!hasMessages) {
				showBotMessage('Hello there! Type in a message.');
			}
		} else {
			// If no history at all, show welcome message
			showBotMessage('Hello there! Type in a message.');
		}
	} catch (error) {
		console.error('Error loading chat history:', error);
		showBotMessage('Hello there! Type in a message.');
	}
}

/**
 * Get input from user and show it on screen on button click.
 */
$('#send_button').on('click', function (e) {
	const userMessage = $('#msg_input').val();
	if (!userMessage.trim()) return;

	showUserMessage(userMessage);
	$('#msg_input').val('');

	fetch('/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ message: userMessage })
	})
		.then(res => res.json())
		.then(data => {
			showBotMessage(data.reply);
		})
		.catch(err => {
			showBotMessage("Error: Could not connect to server.");
			console.error(err);
		});
});

/**
 * Set initial bot message and load history when the page loads
 */
$(window).on('load', async function () {
	await loadChatHistory();
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
//$(window).on('load', function () {
//showBotMessage('Hello there! Type in a message.');
//});

/**
 * Clear chat history
 */
async function clearHistory() {
	try {
		const response = await fetch('/api/clear-history', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		});
		const data = await response.json();

		if (data.success) {
			// Clear UI
			$('.messages').empty();
			// Show welcome message
			showBotMessage('Hello there! Type in a message.');
		} else {
			showBotMessage('Error: Could not clear history.');
		}
	} catch (error) {
		console.error('Error clearing history:', error);
		showBotMessage('Error: Could not clear history.');
	}
}

// Add click handler for clear button
$('#clear_button').on('click', async function () {
	// Add confirmation dialog
	if (confirm('Are you sure you want to clear the chat history?')) {
		await clearHistory();
	}
});
