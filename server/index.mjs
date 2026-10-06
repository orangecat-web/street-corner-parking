import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSource } from './data.mjs'
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)))
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'}
export function startServer(port=Number(process.env.PORT||8787)) {
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost')
  if(url.pathname.startsWith('/api/parking/')) {
   try {const data=await loadSource(url.pathname.split('/').pop());res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
   catch(e){res.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:e.message}))}
   return
  }
  try {
   const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname))
   if(!path.startsWith(root+sep) && path!==resolve(root,'index.html')) {res.writeHead(403);res.end();return}
   const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(data)
  }catch{res.writeHead(404);res.end('找不到頁面；請先執行 npm run build。')}
 })
 server.listen(port,'0.0.0.0',()=>console.log(`停車 API / production: http://localhost:${port}`));return server
}
if(process.argv[1]===fileURLToPath(import.meta.url)) startServer()
