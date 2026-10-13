// 單次定位只在按鈕操作後呼叫；不追蹤、不儲存或上傳座標。
export function locateOnce({signal,timeout=15000,geolocation=globalThis.navigator?.geolocation,secure=globalThis.isSecureContext}={}) {
 return new Promise((resolve,reject)=>{
  const fail=code=>Object.assign(new Error(code),{code})
  if(signal?.aborted)return reject(fail('cancelled'))
  if(!secure)return reject(fail('insecure'))
  if(!geolocation?.getCurrentPosition)return reject(fail('unsupported'))
  let settled=false,timer
  // 逾時／卸載後忽略延遲回呼，避免舊請求覆蓋下一次定位。
  function finish(error,coords){
   if(settled)return
   settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel)
   if(error)reject(fail(error));else resolve(coords)
  }
  function cancel(){finish('cancelled')}
  signal?.addEventListener('abort',cancel,{once:true})
  // 包含等待權限提示的時間，避免瀏覽器一直沒有回呼。
  timer=setTimeout(()=>finish('timeout'),timeout)
  try{
   geolocation.getCurrentPosition(position=>{
    const c=position?.coords
    if(!c||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0)return finish('unavailable')
    finish(null,{latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy})
   },error=>finish(({1:'denied',2:'unavailable',3:'timeout'})[error?.code]||'unavailable'),{enableHighAccuracy:true,maximumAge:0,timeout})
  }catch(error){finish(error?.name==='SecurityError'?'denied':'unavailable')}
 })
}
