import path from 'node:path'
import fs from 'node:fs'
import https from 'node:https'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createStore } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT || 3000)
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443)
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'bt.json')
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', 'dist')
const CERT_DIR = process.env.CERT_DIR || path.join(__dirname, 'certs')

const store = createStore(DATA_FILE)
const app = createApp(store, STATIC_DIR)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Baby Tracker server listening on http://0.0.0.0:${PORT}`)
  console.log(`Data file: ${DATA_FILE}`)
})

const certFile = path.join(CERT_DIR, 'cert.pem')
const keyFile = path.join(CERT_DIR, 'key.pem')

if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
  https
    .createServer({ cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }, app)
    .listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`Baby Tracker HTTPS listening on https://0.0.0.0:${HTTPS_PORT}`)
    })
} else {
  console.log(`HTTPS disabled: missing ${certFile} or ${keyFile}`)
}
