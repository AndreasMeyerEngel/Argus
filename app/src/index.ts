import express from 'express'
import { PrismaClient } from '@prisma/client'
import path from 'path'

const app = express()
const prisma = new PrismaClient()

app.use(express.json({ limit: '50mb' }))

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ ok: true }))

// ── State ─────────────────────────────────────────────────────────────────────

app.get('/api/state', async (_, res) => {
  const row = await prisma.appState.findUnique({ where: { id: 'singleton' } })
  res.json(row?.data ?? null)
})

app.put('/api/state', async (req, res) => {
  await prisma.appState.upsert({
    where:  { id: 'singleton' },
    create: { id: 'singleton', data: req.body },
    update: { data: req.body },
  })
  res.json({ ok: true })
})

// ── Images ────────────────────────────────────────────────────────────────────

// key may contain underscores/alphanumeric only (e.g. exec_001_img_0)
app.post('/api/images/:key', async (req, res) => {
  const { key } = req.params
  const { data } = req.body as { data: string }
  await prisma.image.upsert({
    where:  { key },
    create: { key, data },
    update: { data },
  })
  res.json({ ok: true })
})

app.get('/api/images/:key', async (req, res) => {
  const { key } = req.params
  const image = await prisma.image.findUnique({ where: { key } })
  if (!image) return res.status(404).end()

  const [header, base64] = image.data.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  res.set('Content-Type', mime)
  res.send(Buffer.from(base64, 'base64'))
})

app.delete('/api/images', async (req, res) => {
  const prefix = req.query.prefix as string | undefined
  if (prefix) {
    await prisma.image.deleteMany({ where: { key: { startsWith: prefix } } })
  }
  res.json({ ok: true })
})

// ── Static frontend ───────────────────────────────────────────────────────────

const publicDir = path.join(__dirname, '../public')
app.use(express.static(publicDir))
app.get('*', (_, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3000)
app.listen(PORT, () => console.log(`Argus listening on :${PORT}`))
