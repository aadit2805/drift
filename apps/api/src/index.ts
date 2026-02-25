import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import nessieRouter from './routes/nessie.js'
import simulationRouter from './routes/simulation.js'
import llmRouter from './routes/llm.js'
import whatIfRouter from './routes/whatif.js'
import aiRouter from './routes/ai.js'
import jobsRouter from './routes/jobs.js'
import plaidRouter from './routes/plaid.js'

// Load .env from monorepo root (turbo runs from root, so cwd is root)
dotenv.config()
// Also try loading from apps/api in case running directly
dotenv.config({ path: '../../.env' })

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' })) // Increased for audio file uploads

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/nessie', nessieRouter)
app.use('/api', simulationRouter)
app.use('/api', llmRouter)
app.use('/api', whatIfRouter)
app.use('/api/ai', aiRouter)
app.use('/api', jobsRouter) // HPC cluster job management
app.use('/api/plaid', plaidRouter) // Plaid bank connectivity

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${req.method} ${req.path}] Error:`, err.message, err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})

export default app
