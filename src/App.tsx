
import { useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      sender: 'SUDHYX',
      text: 'Hello! I am SUDHYX AI. How can I assist you today?',
    },
  ])

  function sendMessage() {
    if (!message.trim()) return

    const userMessage = message.trim()

    setMessages((previous) => [
      ...previous,
      { sender: 'YOU', text: userMessage },
      {
        sender: 'SUDHYX',
        text: `Message received! My advanced AI brain is being prepared. You said: ${userMessage}`,
      },
    ])

    setMessage('')
  }

  return (
    <main className="app-container">
      <header className="top-bar">
        <div className="brand-small">
          SUDHYX <span>AI</span>
        </div>
        <div className="system-status">
          <span className="status-dot"></span>
          SYSTEM ONLINE
        </div>
      </header>

      <section className="hero">
        <div className="ai-core">
          <div className="core-inner">
            <span className="ai-letter">S</span>
          </div>
          <span className="ai-orbit"></span>
          <span className="ai-orbit orbit-two"></span>
          <span className="ai-dot"></span>
        </div>

        <h1>
          SUDHYX <span>AI</span>
        </h1>

        <p className="tagline">THINK • LEARN • INNOVATE</p>
        <p className="welcome-text">YOUR PERSONAL AI ASSISTANT</p>
      </section>

      <section className="chat-panel">
        <div className="chat-heading">
          <span className="heading-dot"></span>
          AI CONVERSATION
        </div>

        <div className="messages">
          {messages.map((item, index) => (
            <div className="message-item" key={index}>
              <div className="message-sender">{item.sender}</div>
              <div className="message-text">{item.text}</div>
            </div>
          ))}
        </div>

        <div className="chat-input-area">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') sendMessage()
            }}
            placeholder="Ask SUDHYX anything..."
          />

          <button onClick={sendMessage}>SEND ↗</button>
        </div>
      </section>

      <footer>
        SUDHYX AI <span>•</span> THE FUTURE STARTS HERE
      </footer>
    </main>
  )
}

export default App
