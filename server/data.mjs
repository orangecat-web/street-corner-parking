import { SOURCES } from './sources.mjs'
import * as normalize from './normalize.mjs'
const cache = new Map()
// 每個來源獨立快取與錯誤，單一城市故障不阻斷其他來源。
async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`官方來源回應 ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
export async function pages(url, fetchPage=download) {
  // 官方可能限制單頁筆數；不能以「少於要求筆數」推定已讀完。
  // 使用空頁作為結束訊號，保留安全上限與重複頁檢查，避免漏頁／無限查詢。
  const rows=[]; const size=1000
  let previousPage=null
  for(let page=0;page<100;page++) {
    const endpoint=new URL(url)
    endpoint.searchParams.set('page',page)
    endpoint.searchParams.set('size',size)
    const batch=JSON.parse((await fetchPage(endpoint.href)).toString())
    if(!Array.isArray(batch)) throw new Error('官方 API 非陣列格式')
    if(!batch.length) return rows
    const fingerprint=JSON.stringify(batch)
    if(fingerprint===previousPage) throw new Error('官方 API 回傳重複頁，無法確認資料完整性')
    previousPage=fingerprint
    rows.push(...batch)
  }
  throw new Error('API 資料超出分頁安全上限')
}
export async function loadSource(key) {
  if (!SOURCES[key]) throw new Error('未知資料來源')
  const ttl=/(Car|Lots)$/.test(key)?120000:3600000
  const previous=cache.get(key)
  if(previous && Date.now()-previous.time<ttl) return previous.promise
  const promise=(async()=>{
    const source=SOURCES[key]
    let data, dynamicError=null
    if(key.endsWith('Lots')) {
      const get=u=>key.startsWith('taipei')?download(u).then(b=>JSON.parse(b.toString())):pages(u)
      const results=await Promise.allSettled([get(source.url),get(source.dynamicUrl)])
      if(results[0].status==='rejected')throw results[0].reason
      dynamicError=results[1].status==='rejected'?'即時空位來源讀取失敗，目前顯示基本資料':null
      data={static:results[0].value,dynamic:results[1].status==='fulfilled'?results[1].value:null}
    } else data=key.startsWith('taipei') ? await download(source.url) : await pages(source.url)
    const records=normalize[key](data)
    if(!records.length) throw new Error('官方來源未回傳可收錄資料')
    return {records, fetchedAt:new Date().toISOString(), source:source.label, sourceUrl:source.page, count:records.length, warning:dynamicError}
  })()
  cache.set(key,{time:Date.now(),promise})
  try{return await promise}catch(e){cache.delete(key);throw e}
}
