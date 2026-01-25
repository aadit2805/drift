import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import nessieRouter from './routes/nessie.js'
import simulationRouter from './routes/simulation.js'
import llmRouter from './routes/llm.js'
import whatIfRouter from './routes/whatif.js'
import aiRouter from './routes/ai.js'

// Load .env from monorepo root (turbo runs from root, so cwd is root)
dotenv.config()
// Also try loading from apps/api in case running directly
dotenv.config({ path: '../../.env' })

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/nessie', nessieRouter)
app.use('/api', nessieRouter) // Also mount nessie routes at /api for convenience
app.use('/api', simulationRouter)
app.use('/api', llmRouter)
app.use('/api', whatIfRouter)
app.use('/api/ai', aiRouter)

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})

export default app
