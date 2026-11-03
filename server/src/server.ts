import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3000

const apiKey = process.env.GEMINI_API_KEY
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

app.use(helmet())

// Allow requests from the local Vite frontend, including changing ports.
app.use(cors({
  origin: true,
}))

// Allow image and PDF data in requests.
app.use(express.json({ limit: '100mb' }))

type ChatMessage = {
  role: 'user' | 'model'
  text: string
}

type UploadedFile = {
  name?: string
  mimeType: string
  data: string
}

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    assistant: 'SUDHYX AI',
    status: 'online',
  })
})

app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      memory = [],
      attachments = [],
    } = req.body ?? {}

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A valid message is required',
      })
    }

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'Gemini API key is missing',
      })
    }

    // Validate conversation history.
    const safeHistory: ChatMessage[] = Array.isArray(history)
      ? history
          .filter((item: any) =>
            item &&
            (item.role === 'user' || item.role === 'model') &&
            typeof item.text === 'string'
          )
          .slice(-12)
          .map((item: any) => ({
            role: item.role,
            text: item.text.slice(0, 4000),
          }))
      : []

    // Validate saved memory.
    const safeMemory: string[] = Array.isArray(memory)
      ? memory
          .filter((item: unknown) => typeof item === 'string')
          .slice(0, 30)
          .map((item: string) => item.slice(0, 500))
      : []

    // Validate uploaded images and PDFs.
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'application/pdf',
    ]

    const safeAttachments: UploadedFile[] = Array.isArray(attachments)
      ? attachments
          .filter((file: any) =>
            file &&
            typeof file.data === 'string' &&
            allowedMimeTypes.includes(file.mimeType) &&
            file.data.length <= 15 * 1024 * 1024
          )
          .slice(0, 5)
          .map((file: any) => ({
            name: typeof file.name === 'string'
              ? file.name.slice(0, 200)
              : 'uploaded-file',
            mimeType: file.mimeType,
            data: file.data,
          }))
      : []

    const memoryInstruction = safeMemory.length
      ? `\nUser's saved memories:\n${safeMemory
          .map(item => `- ${item}`)
          .join('\n')}\nUse these memories when relevant.`
      : ''

    // Prepare conversation history.
    const contents: any[] = [
      ...safeHistory.map(item => ({
        role: item.role,
        parts: [{ text: item.text }],
      })),
    ]

    // Add the current question and attached files.
    const userParts: any[] = [
      { text: message.trim() },
    ]

    for (const file of safeAttachments) {
      userParts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data,
        },
      })
    }

    contents.push({
      role: 'user',
      parts: userParts,
    })

    // Generate AI response.
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents,
      config: {
        systemInstruction:
          'You are SUDHYX AI, a friendly and helpful personal AI assistant. ' +
          'Answer questions about general knowledge, education, science, maths, ' +
          'technology, coding, writing and other topics. ' +
          'Reply in the same language as the user. ' +
          'Use conversation history and saved memories when relevant. ' +
          'Analyze attached images and PDFs when provided. ' +
          'For educational questions, explain solutions step by step. ' +
          'Be clear, accurate and helpful. ' +
          'Never claim to remember information that is not in the supplied conversation or memory. ' +
          'If you are unsure, say so instead of inventing facts.' +
          memoryInstruction,
      },
    })

    return res.json({
      success: true,
      assistant: 'SUDHYX AI',
      reply: response.text || 'Please try another message.',
    })
  } catch (error) {
    console.error('GEMINI ERROR:', error)

    return res.status(502).json({
      success: false,
      error: error instanceof Error
        ? error.message
        : 'AI service request failed',
    })
  }
})

app.listen(PORT, () => {
  console.log(`SUDHYX AI backend running at http://localhost:${PORT}`)
})