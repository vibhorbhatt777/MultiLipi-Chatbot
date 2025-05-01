document.addEventListener('DOMContentLoaded', function() {
    const API_BASE = "https://fe0d-34-16-164-82.ngrok-free.app/";
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const menuToggle = document.getElementById('menu-toggle');
    const themeToggle = document.getElementById('toggle-theme');
    const chatbot = document.getElementById('chatbot');
    const welcomeContainer = document.getElementById('welcome-container');
    const welcomeUpload = document.getElementById('welcome-upload');
    const welcomeExample = document.getElementById('welcome-example');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const fileButton = document.getElementById('file-button');
    const micButton = document.getElementById('mic-button');
    const fileUpload = document.getElementById('file-upload');
    const fileBadge = document.getElementById('file-badge');
    const fileName = document.getElementById('file-name');
    const newChatBtn = document.getElementById('new-chat-btn');
    const clearConvos = document.getElementById('clear-convos');
    const chatList = document.getElementById('chat-list');
    
    let uploadedFile = null;
    let recentChats = [];
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let currentTheme = localStorage.getItem('theme') || 'light';
    
    // Set initial theme
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcon(true);
    }
    
    // Theme Toggle
    themeToggle.addEventListener('click', function() {
        const isDark = document.body.classList.toggle('dark-theme');
        updateThemeIcon(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
    
    function updateThemeIcon(isDark) {
        const icon = themeToggle.querySelector('i');
        if (isDark) {
            icon.className = 'fas fa-sun';
            themeToggle.querySelector('span').textContent = 'Light mode';
        } else {
            icon.className = 'fas fa-moon';
            themeToggle.querySelector('span').textContent = 'Dark mode';
        }
    }
    
    // Sidebar Toggle
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        if (window.innerWidth <= 768) {
            if (sidebar.classList.contains('open')) {
                sidebar.style.left = '0';
            } else {
                sidebar.style.left = '-100%';
            }
        }
    });
    
    // Responsive checks
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.style.left = '0';
        } else if (!sidebar.classList.contains('open')) {
            sidebar.style.left = '-100%';
        }
    });
    
    // Message input auto-resize
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Enable send button only if there's text
        if (this.value.trim()) {
            sendButton.disabled = false;
        } else {
            sendButton.disabled = true;
        }
    });
    
    // Initialize send button state
    sendButton.disabled = true;
    
    // Send message on Enter key
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim()) {
                sendMessage();
            }
        }
    });
    
    // Send message button click
    sendButton.addEventListener('click', function() {
        const message = messageInput.value.trim();
        if (message) {
            addMessage(message, 'user');
            messageInput.value = '';
            messageInput.style.height = 'auto';
            sendButton.disabled = true;
            processMessage(message);
        }
    });
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendButton.disabled = !this.value.trim();
    });
    
    // File upload handling from welcome screen
    welcomeUpload.addEventListener('click', function() {
        fileUpload.click();
    });
    
    // File upload handling from button
    fileButton.addEventListener('click', function() {
        fileUpload.click();
    });
    
    fileUpload.addEventListener('change', async function(e) {
        if (e.target.files.length > 0) {
            uploadedFile = e.target.files[0];
            const formData = new FormData();
            formData.append("file", uploadedFile);

            try {
                const res = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();
                uploadedFilePath = data.filepath;

                fileName.textContent = uploadedFile.name;
                fileBadge.classList.remove('hidden');
                welcomeContainer.classList.add('hidden');
                addRecentChat(`${uploadedFile.name}`);
                addMessage(`Uploaded ${uploadedFile.name}. What can you tell me about this document?`, 'user');
            } catch (err) {
                console.error('Upload failed', err);
                addMessage('Failed to upload file.', 'assistant');
            }
        }
    });
    
    // Example handling
    welcomeExample.addEventListener('click', function() {
        // Simulate uploading a sample document
        uploadedFile = { name: 'sample_document.pdf' };
        
        // Update file badge
        fileName.textContent = uploadedFile.name;
        fileBadge.classList.remove('hidden');
        
        // Hide welcome screen
        welcomeContainer.classList.add('hidden');
        
        // Add to recent chats
        addRecentChat(`${uploadedFile.name}`);
        
        // Send automatic message about example
        addMessage(`Let's try an example with sample_document.pdf. What's in this document?`, 'user');
        processMessage(`Let's try an example with sample_document.pdf. What's in this document?`);
    });
    
    // Microphone handling
    micButton.addEventListener('click', toggleRecording);
    
    // Function to toggle recording
    function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
    
    // Function to start recording
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
    
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };
    
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                micButton.classList.remove('recording');
                isRecording = false;
    
                // Upload audioBlob to backend for transcription
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.webm');
    
                try {
                    const res = await fetch(`${API_BASE}/transcribe`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
    
                    if (data && data.transcript) {
                        messageInput.value = data.transcript;
                        messageInput.dispatchEvent(new Event('input'));
                        messageInput.focus();
                    } else {
                        alert("Could not transcribe audio.");
                    }
                } catch (err) {
                    console.error("Transcription error:", err);
                    alert("Error sending audio to backend.");
                }
            };
    
            mediaRecorder.start();
            isRecording = true;
            micButton.classList.add('recording');
    
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Microphone access denied or unavailable.");
        }
    }
    
    
    // Function to stop recording
    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            micButton.classList.remove('recording');
            
            // Stop all audio tracks
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
    
    // Function to send a message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            // Add message to chat
            addMessage(message, 'user');
            messageInput.value = '';
            messageInput.style.height = 'auto';
            sendButton.disabled = true;
            // Process the message (in a real app, this would call an API)
            processMessage(message);
        }
    }
    function showTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message assistant typing';
        typingIndicator.id = 'typing-indicator';
    
        const bubble = document.createElement('div');
        bubble.className = 'typing-bubble';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            bubble.appendChild(dot);
        }
    
        typingIndicator.appendChild(bubble);
        chatbot.appendChild(typingIndicator);
        chatbot.scrollTop = chatbot.scrollHeight;
    }
    
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    
    // Function to process message and get response
    async function processMessage(message) {
        showTypingIndicator();

        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filepath: uploadedFilePath,
                    question: message
                })
            });

            const data = await res.json();
            hideTypingIndicator();
            addMessage(data.answer || 'No answer returned from backend.', 'assistant');
        } catch (err) {
            hideTypingIndicator();
            console.error('Error contacting backend:', err);
            addMessage('An error occurred while contacting the backend.', 'assistant');
        }
    }

    // Show/hide typing indicators, theme and chat utils...
    // (Retain all other helper functions from your original script)
    
    // Function to add a message to the chat
    function addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = sender === 'assistant' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

        const content = document.createElement('div');
        content.className = 'content';
        content.textContent = text;

        messageElement.appendChild(avatar);
        messageElement.appendChild(content);

        chatbot.appendChild(messageElement);
        chatbot.scrollTop = chatbot.scrollHeight;
    }

    // Function to add a chat to recent chats
    function addRecentChat(title) {
        // Add to memory
        const chatId = 'chat-' + Date.now();
        const chat = {
            id: chatId,
            title: title
        };
        
        recentChats.unshift(chat);
        
        // Store in local storage
        localStorage.setItem('recentChats', JSON.stringify(recentChats));
        
        // Update UI
        updateRecentChats();
    }
    
    // Function to update recent chats in sidebar
    function updateRecentChats() {
        chatList.innerHTML = '';
        
        if (recentChats.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-chats';
            emptyState.textContent = 'No recent chats';
            chatList.appendChild(emptyState);
            return;
        }
        
        recentChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.id = chat.id;
            
            const chatTitle = document.createElement('div');
            chatTitle.className = 'chat-title';
            chatTitle.textContent = chat.title;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteChat(chat.id);
            });
            
            chatItem.appendChild(chatTitle);
            chatItem.appendChild(deleteBtn);
            
            chatItem.addEventListener('click', function() {
                loadChat(chat.id);
            });
            
            chatList.appendChild(chatItem);
        });
    }
    
    // Function to delete a chat
    function deleteChat(chatId) {
        recentChats = recentChats.filter(chat => chat.id !== chatId);
        localStorage.setItem('recentChats', JSON.stringify(recentChats));
        updateRecentChats();
    }
    
    // Function to load a chat
    function loadChat(chatId) {
        const chat = recentChats.find(chat => chat.id === chatId);
        if (chat) {
            // In a real app, this would load chat history from storage or API
            // For demo, just simulate loading
            uploadedFile = { name: chat.title };
            fileName.textContent = uploadedFile.name;
            fileBadge.classList.remove('hidden');
            welcomeContainer.classList.add('hidden');
            
            // Clear current chat and add a welcome message
            chatbot.innerHTML = '';
            addMessage(`I've loaded your conversation about ${chat.title}. How can I help you with this document?`, 'assistant');
        }
    }
    
    // New chat button
    newChatBtn.addEventListener('click', function() {
        // Clear chat area
        chatbot.innerHTML = '';
        
        // Reset file
        uploadedFile = null;
        fileBadge.classList.add('hidden');
        
        // Show welcome screen
        welcomeContainer.classList.remove('hidden');
    });
    
    // Clear conversations button
    clearConvos.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all conversations?')) {
            recentChats = [];
            localStorage.removeItem('recentChats');
            updateRecentChats();
        }
    });
    
    // Load recent chats from storage
    function loadRecentChats() {
        const savedChats = localStorage.getItem('recentChats');
        if (savedChats) {
            try {
                recentChats = JSON.parse(savedChats);
                updateRecentChats();
            } catch (e) {
                console.error('Error loading recent chats:', e);
                localStorage.removeItem('recentChats');
            }
        }
    }
    
    // Initialize
    loadRecentChats();
    
    // If mobile, hide sidebar initially
    if (window.innerWidth <= 768) {
        sidebar.style.left = '-100%';
    }
});
