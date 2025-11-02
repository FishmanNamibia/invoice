import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Mail } from 'lucide-react';
import './ChatBot.css';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! 👋 I\'m your Financial Management System assistant. How can I help you today?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check chatbot availability on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const response = await axios.get('/api/chatbot/health');
      setIsAvailable(response.data.available);
    } catch (error) {
      console.error('Failed to check chatbot availability:', error);
      setIsAvailable(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Prepare conversation history for API (exclude the initial greeting)
      const conversationHistory = newMessages
        .slice(1) // Skip initial greeting
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      const response = await axios.post('/api/chatbot/message', {
        message: userMessage,
        conversationHistory
      });

      // Add bot response
      setMessages([...newMessages, {
        role: 'assistant',
        content: response.data.reply,
        supportEmail: response.data.supportEmail
      }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      
      let errorMessage = 'I apologize, but I\'m having trouble connecting right now. ';
      
      if (error.response?.data?.supportEmail) {
        errorMessage += `Please contact our support team at ${error.response.data.supportEmail} for assistance.`;
      } else {
        errorMessage += 'Please try again or contact support at info@invoice.dynaverseinvestment.com';
      }

      setMessages([...newMessages, {
        role: 'assistant',
        content: errorMessage,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const quickQuestions = [
    "How do I create an invoice?",
    "How do I add a new customer?",
    "How do I set up bank details?",
    "How do I enable 2FA?"
  ];

  if (!isAvailable) {
    return null; // Don't show chatbot if not available
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button 
          className="chatbot-toggle"
          onClick={handleToggle}
          title="Get Help"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <MessageCircle size={20} />
              <div>
                <h3>Support Assistant</h3>
                <span className="chatbot-status">● Online</span>
              </div>
            </div>
            <button 
              className="chatbot-close"
              onClick={handleToggle}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`chatbot-message ${message.role === 'user' ? 'user-message' : 'bot-message'} ${message.isError ? 'error-message' : ''}`}
              >
                <div className="message-content">
                  {message.content}
                </div>
                {message.role === 'assistant' && index > 0 && (
                  <div className="message-time">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="chatbot-message bot-message">
                <div className="message-content typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="chatbot-quick-questions">
              <p className="quick-questions-label">Quick questions:</p>
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  className="quick-question-btn"
                  onClick={() => handleQuickQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-container">
            <form onSubmit={handleSendMessage} className="chatbot-input-form">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="chatbot-input"
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isLoading}
                className="chatbot-send-btn"
                title="Send"
              >
                <Send size={18} />
              </button>
            </form>
            
            <div className="chatbot-footer">
              <Mail size={12} />
              <span>Need more help? Email: info@invoice.dynaverseinvestment.com</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;

