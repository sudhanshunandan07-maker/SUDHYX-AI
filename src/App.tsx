
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

type Message = {
  sender: 'SUDHYX' | 'YOU'
  text: string
}

type Chat = {
  id: string
  title: string
  messages: Message[]
}

type UploadedFile = {
  name: string
  mimeType: string
  data: string
}

type AssistantMode = 'general' | 'study' | 'code'

const STORAGE_KEY = 'sudhyx-chats-v1'
const MEMORY_KEY = 'sudhyx-memory-v1'
const THEME_KEY = 'sudhyx-theme-v1'

const welcome: Message = {
  sender: 'SUDHYX',
  text: 'नमस्ते! 🙏 मैं SUDHYX AI हूँ। आज मैं आपकी किस प्रकार सहायता कर सकता हूँ?',
}

function App() {
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })

  const [memory, setMemory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]')
    } catch {
      return []
    }
  })

  const [activeId, setActiveId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [searchOn, setSearchOn] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [mode, setMode] = useState<AssistantMode>('general')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark'
    } catch {
      return 'dark'
    }
  })

  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const abortController = useRef<AbortController | null>(null)

  const activeChat = chats.find(chat => chat.id === activeId)
  const messages = activeChat?.messages || [welcome]

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(chatSearch.toLowerCase()) ||
    chat.messages.some(item =>
      item.text.toLowerCase().includes(chatSearch.toLowerCase())
    )
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  }, [chats])

  useEffect(() => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory))
  }, [memory])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function addMemory() {
    const value = prompt('SUDHYX AI को क्या याद रखना चाहिए?')
    if (value?.trim()) {
      setMemory(prev => [...prev, value.trim()])
    }
  }

  function clearMemory() {
    if (confirm('क्या सारी Memory हटानी है?')) {
      setMemory([])
    }
  }

  function editMemory(index: number) {
    const value = prompt('Edit memory:', memory[index])
    if (value?.trim()) {
      setMemory(prev => prev.map((item, i) =>
        i === index ? value.trim() : item
      ))
    }
  }

  function deleteMemory(index: number) {
    if (confirm('क्या यह Memory हटानी है?')) {
      setMemory(prev => prev.filter((_, i) => i !== index))
    }
  }

  function newChat() {
    abortController.current?.abort()

    const id = crypto.randomUUID()

    setChats(prev => [
      { id, title: 'New conversation', messages: [welcome] },
      ...prev,
    ])

    setActiveId(id)
    setMessage('')
    setAttachments([])
    setLoading(false)
  }

  function openChat(id: string) {
    abortController.current?.abort()
    setLoading(false)
    setActiveId(id)
    setAttachments([])
  }

  function updateMessages(id: string, newMessages: Message[]) {
    setChats(prev => prev.map(chat =>
      chat.id === id ? { ...chat, messages: newMessages } : chat
    ))
  }

  function renameChat(id: string) {
    const chat = chats.find(item => item.id === id)
    if (!chat) return

    const title = prompt('Enter new chat name:', chat.title)

    if (title?.trim()) {
      setChats(prev => prev.map(item =>
        item.id === id ? { ...item, title: title.trim() } : item
      ))
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      alert('Answer copied!')
    } catch {
      alert('Copy नहीं हो पाया।')
    }
  }

  function exportChat() {
    if (!activeChat) return

    const content = activeChat.messages
      .map(item => `${item.sender}:\n${item.text}`)
      .join('\n\n--------------------\n\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${activeChat.title || 'SUDHYX-chat'}.txt`
    link.click()

    URL.revokeObjectURL(url)
  }

  function saveChatAsPDF() {
    if (activeChat) window.print()
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]

    for (const file of files) {
      if (attachments.length >= 2) {
        alert('एक बार में अधिकतम 2 files upload कर सकते हैं।')
        break
      }

      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name}: JPG, PNG, WEBP या PDF file चुनें।`)
        continue
      }

      if (file.size > 7 * 1024 * 1024) {
        alert(`${file.name}: File 7 MB से छोटी होनी चाहिए।`)
        continue
      }

      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result !== 'string') return

        const data = reader.result.split(',')[1]
        if (!data) return

        setAttachments(prev => {
          if (prev.length >= 2) return prev
          return [...prev, {
            name: file.name,
            mimeType: file.type,
            data,
          }]
        })
      }

      reader.readAsDataURL(file)
    }

    event.target.value = ''
  }

  async function requestAI(
    chatId: string,
    userMessage: string,
    updatedMessages: Message[],
    files: UploadedFile[] = []
  ) {
    const controller = new AbortController()
    abortController.current = controller
    setLoading(true)

    try {
      const history = updatedMessages.slice(1, -1).map(item => ({
        role: item.sender === 'YOU' ? 'user' : 'model',
        text: item.text,
      }))

      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage,
          history,
          memory,
          search: searchOn,
          attachments: files,
          mode,
          model,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      updateMessages(chatId, [
        ...updatedMessages,
        { sender: 'SUDHYX', text: data.reply || 'Please try again.' },
      ])

      if (voiceOn && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(
          new SpeechSynthesisUtterance(data.reply || '')
        )
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateMessages(chatId, [
          ...updatedMessages,
          { sender: 'SUDHYX', text: 'Generation stopped.' },
        ])
      } else {
        updateMessages(chatId, [
          ...updatedMessages,
          {
            sender: 'SUDHYX',
            text: error instanceof Error ? error.message : 'Unknown error',
          },
        ])
      }
    } finally {
      if (abortController.current === controller) {
        abortController.current = null
        setLoading(false)
      }
    }
  }

  async function sendMessage() {
    const userMessage = message.trim() ||
      (attachments.length ? 'Please analyze the attached file.' : '')

    if (!userMessage || loading) return

    let chatId = activeId
    let currentMessages = messages

    if (!chatId) {
      chatId = crypto.randomUUID()
      currentMessages = [welcome]
      setActiveId(chatId)
    }

    const id = chatId

    const updated: Message[] = [
      ...currentMessages,
      { sender: 'YOU', text: userMessage },
    ]

    const existing = chats.find(chat => chat.id === id)

    if (existing) {
      updateMessages(id, updated)
    } else {
      setChats(prev => [
        {
          id,
          title: userMessage.slice(0, 35),
          messages: updated,
        },
        ...prev,
      ])
    }

    setMessage('')
    const filesToSend = [...attachments]
    setAttachments([])

    await requestAI(id, userMessage, updated, filesToSend)
  }

  async function regenerateAnswer() {
    if (!activeChat || loading) return

    const chatMessages = [...activeChat.messages]
    let lastUserIndex = -1

    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].sender === 'YOU') {
        lastUserIndex = i
        break
      }
    }

    if (lastUserIndex === -1) return

    const userMessage = chatMessages[lastUserIndex].text
    const updated = chatMessages.slice(0, lastUserIndex + 1)

    updateMessages(activeChat.id, updated)
    await requestAI(activeChat.id, userMessage, updated)
  }

  function stopGenerating() {
    abortController.current?.abort()
  }

  function startVoice() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Voice input इस browser में supported नहीं है। Chrome try करें।')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'hi-IN'

    recognition.onresult = (event: any) => {
      setMessage(event.results[0][0].transcript)
    }

    recognition.onerror = () => {
      alert('Voice input में समस्या आई।')
    }

    recognition.start()
  }

  return (
    <main className={`dashboard ${theme}-theme`}>
      <aside className="sidebar">
        <div className="side-brand">SUDHYX <span>AI</span></div>

        <button className="new-chat" onClick={newChat}>+ New Chat</button>
        <button className="new-chat" onClick={addMemory}>+ Add Memory</button>
        <button className="history-item" onClick={clearMemory}>
          Clear Memory ({memory.length})
        </button>

        <button
          className="history-item theme-toggle"
          onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? '☀️ Light Theme' : '🌙 Dark Theme'}
        </button>

        <div className="memory-list">
          <p className="side-label">SAVED MEMORIES</p>

          {memory.length === 0 ? (
            <p className="empty-memory">No saved memories</p>
          ) : memory.map((item, index) => (
            <div className="memory-item" key={index}>
              <span className="memory-text">{item}</span>
              <div className="memory-actions">
                <button onClick={() => editMemory(index)}>Edit</button>
                <button onClick={() => deleteMemory(index)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <p className="side-label">CHAT HISTORY</p>

        <input
          className="chat-search"
          value={chatSearch}
          onChange={e => setChatSearch(e.target.value)}
          placeholder="🔎 Search chats..."
        />

        <div className="history-list">
          {filteredChats.map(chat => (
            <div
              className={`history-entry ${activeId === chat.id ? 'active' : ''}`}
              key={chat.id}
            >
              <button
                className="history-item"
                onClick={() => openChat(chat.id)}
                title={chat.title}
              >
                ◉ {chat.title}
              </button>

              <button
                className="rename-chat"
                onClick={() => renameChat(chat.id)}
                title="Rename chat"
              >
                ✎
              </button>
            </div>
          ))}

          {filteredChats.length === 0 && (
            <p className="empty-memory">No chats found</p>
          )}
        </div>

        <div className="side-bottom">
          <span className="online-dot"></span>
          SYSTEM ONLINE
        </div>
      </aside>

      <section className="main-area">
        <header className="main-header">
          <div>
            <strong>SUDHYX <span>AI</span></strong>
            <small>YOUR PERSONAL AI ASSISTANT</small>
          </div>

          <div className="header-actions">
            <button onClick={exportChat} disabled={!activeChat}>
              ⬇ Export TXT
            </button>
            <button onClick={saveChatAsPDF} disabled={!activeChat}>
              🖨 Save PDF
            </button>
            <div className="header-status">● ONLINE</div>
          </div>
        </header>

        <div className="advanced-controls">
          <label>
            AI Mode
            <select
              value={mode}
              onChange={e => setMode(e.target.value as AssistantMode)}
              disabled={loading}
            >
              <option value="general">General Assistant</option>
              <option value="study">Study Mode</option>
              <option value="code">Code Assistant</option>
            </select>
          </label>

          <label>
            AI Model
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={loading}
            >
              <option value="gemini-3.5-flash-lite">Gemini Flash Lite</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </select>
          </label>
        </div>

        <section className="conversation">
          {messages.map((item, index) => (
            <article
              key={index}
              className={`chat-message ${item.sender === 'YOU' ? 'user-message' : ''}`}
            >
              <div className="avatar">{item.sender === 'YOU' ? 'Y' : 'S'}</div>

              <div className="message-content">
                <div className="message-name">{item.sender}</div>
                <div className="message-body">{item.text}</div>

                {item.sender === 'SUDHYX' && index > 0 && (
                  <div className="message-actions">
                    <button onClick={() => copyText(item.text)}>📋 Copy</button>

                    {index === messages.length - 1 && !loading && (
                      <button onClick={regenerateAnswer}>🔄 Regenerate</button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}

          {loading && (
            <article className="chat-message">
              <div className="avatar">S</div>
              <div className="message-content">
                <div className="message-name">SUDHYX</div>
                <div className="message-body">Thinking...</div>
              </div>
            </article>
          )}

          <div ref={messagesEnd} />
        </section>

        <footer className="composer-area">
          <div className="tools-row">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              hidden
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInput.current?.click()}
              disabled={loading}
            >
              📎 Attach Photo / PDF
            </button>

            <button
              className={voiceOn ? 'tool-active' : ''}
              onClick={() => setVoiceOn(!voiceOn)}
            >
              🔊 Voice reply {voiceOn ? 'ON' : 'OFF'}
            </button>

            <button onClick={startVoice}>🎤 Speak</button>

            <button
              className={searchOn ? 'tool-active' : ''}
              onClick={() => setSearchOn(!searchOn)}
            >
              🌐 Search {searchOn ? 'ON' : 'OFF'}
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="attachment-list">
              {attachments.map((file, index) => (
                <div
                  className="attachment-item"
                  key={`${file.name}-${index}`}
                >
                  <span>
                    {file.mimeType === 'application/pdf' ? '📄' : '🖼️'} {file.name}
                  </span>
                  <button
                    onClick={() => setAttachments(prev =>
                      prev.filter((_, i) => i !== index)
                    )}
                    disabled={loading}
                    aria-label={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="composer">
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Ask SUDHYX anything..."
              disabled={loading}
            />

            {loading ? (
              <button onClick={stopGenerating}>■ STOP</button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!message.trim() && attachments.length === 0}
              >
                SEND ↗
              </button>
            )}
          </div>

          <p className="disclaimer">
            SUDHYX AI can make mistakes. Verify important information.
          </p>
        </footer>
      </section>
    </main>
  )
}

export default App
