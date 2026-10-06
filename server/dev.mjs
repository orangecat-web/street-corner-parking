// 一個指令同時啟動官方 API 代理及 Vite；Ctrl+C 關閉兩者。
import { createServer } from 'vite'
import { startServer } from './index.mjs'
const api=startServer()
const vite=await createServer()
await vite.listen();vite.printUrls()
async function stop(){await vite.close();api.close(()=>process.exit(0))}
process.on('SIGINT',stop);process.on('SIGTERM',stop)
