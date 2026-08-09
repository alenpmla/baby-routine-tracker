import express from 'express'
import path from 'node:path'

const KEYS = ['sleeps', 'feedings', 'diapers', 'weights']

export function createApp(store, staticDir, caFile) {
  const app = express()
  app.use(express.json({ limit: '1mb' }))

  if (caFile) {
    app.get('/ca.pem', (req, res) => {
      res.type('application/x-pem-file').sendFile(caFile)
    })
  }

  app.get('/api/health', (req, res) => {
    res.json({ ok: true })
  })

  app.get('/api/baby', (req, res) => {
    res.json({ baby: store.get().baby })
  })

  app.put('/api/baby', (req, res) => {
    const baby = req.body
    if (!baby || typeof baby.id !== 'string') {
      return res.status(400).json({ error: 'baby requires an id' })
    }
    res.json({ baby: store.setBaby(baby) })
  })

  app.get('/api/settings', (req, res) => {
    res.json({ settings: store.get().settings })
  })

  app.put('/api/settings', (req, res) => {
    const settings = req.body
    if (!settings || !Array.isArray(settings.foodSuggestions)) {
      return res.status(400).json({ error: 'settings requires a foodSuggestions array' })
    }
    res.json({ settings: store.setSettings(settings) })
  })

  app.post('/api/import', (req, res) => {
    const d = req.body
    if (!d || typeof d !== 'object') {
      return res.status(400).json({ error: 'invalid import body' })
    }
    for (const key of KEYS) {
      if (!Array.isArray(d[key])) {
        return res.status(400).json({ error: `${key} must be an array` })
      }
    }
    res.json({ ok: true, data: store.replace(d) })
  })

  for (const key of KEYS) {
    app.get(`/api/${key}`, (req, res) => {
      res.json({ [key]: store.get()[key] })
    })

    app.post(`/api/${key}`, (req, res) => {
      const item = req.body
      if (!item || typeof item.id !== 'string') {
        return res.status(400).json({ error: `${key} items require an id` })
      }
      store.add(key, item)
      res.json({ [key]: store.get()[key] })
    })

    app.delete(`/api/${key}/:id`, (req, res) => {
      store.remove(key, req.params.id)
      res.json({ ok: true })
    })
  }

  if (staticDir) {
    app.use(express.static(staticDir))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next()
      }
      res.sendFile(path.join(staticDir, 'index.html'))
    })
  }

  return app
}
