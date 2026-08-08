import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createStore } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT || 3000)
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'bt.json')
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', 'dist')

const store = createStore(DATA_FILE)
const app = createApp(store, STATIC_DIR)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Baby Tracker server listening on http://0.0.0.0:${PORT}`)
  console.log(`Data file: ${DATA_FILE}`)
})
