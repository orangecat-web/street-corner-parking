import test from 'node:test'
import assert from 'node:assert/strict'
import {locateOnce} from '../src/geolocation.js'

test('取得單次位置，保留有效零座標與精度，不傳回其他裝置資料',async()=>{
 let options
 const result=await locateOnce({secure:true,geolocation:{getCurrentPosition(success,error,settings){
  options=settings;success({coords:{latitude:0,longitude:0,accuracy:0,altitude:50}})
 }}})
 assert.deepEqual(result,{latitude:0,longitude:0,accuracy:0})
 assert.deepEqual(options,{enableHighAccuracy:true,maximumAge:0,timeout:15000})
})

test('非安全連線及不支援定位時不請求權限',async()=>{
 await assert.rejects(locateOnce({secure:false,geolocation:{getCurrentPosition(){assert.fail('不應請求定位')}}}),{code:'insecure'})
 await assert.rejects(locateOnce({secure:true,geolocation:{}}),{code:'unsupported'})
})

test('拒絕權限、裝置無法定位及原生逾時可區分',async()=>{
 for(const [code,expected] of [[1,'denied'],[2,'unavailable'],[3,'timeout']]){
  await assert.rejects(locateOnce({secure:true,geolocation:{getCurrentPosition(success,error){error({code})}}}),{code:expected})
 }
 await assert.rejects(locateOnce({secure:true,geolocation:{getCurrentPosition(){throw Object.assign(new Error(),{name:'SecurityError'})}}}),{code:'denied'})
})

test('拒絕無效座標及精度，避免畫出錯誤定位點',async()=>{
 for(const coords of [{latitude:91,longitude:121,accuracy:10},{latitude:25,longitude:181,accuracy:10},{latitude:NaN,longitude:121,accuracy:10},{latitude:25,longitude:121,accuracy:-1},{latitude:25,longitude:121,accuracy:Infinity}]){
  await assert.rejects(locateOnce({secure:true,geolocation:{getCurrentPosition(success){success({coords})}}}),{code:'unavailable'})
 }
})

test('等待權限而沒有回呼也會逾時；延遲成功無法改寫結果',async()=>{
 let late
 const request=locateOnce({secure:true,timeout:10,geolocation:{getCurrentPosition(success){late=success}}})
 await assert.rejects(request,{code:'timeout'})
 late({coords:{latitude:25,longitude:121,accuracy:10}})
 await assert.rejects(request,{code:'timeout'})
})

test('卸載取消後忽略舊回呼，下一次定位仍可成功',async()=>{
 const controller=new AbortController()
 let late
 const request=locateOnce({secure:true,signal:controller.signal,geolocation:{getCurrentPosition(success){late=success}}})
 controller.abort()
 await assert.rejects(request,{code:'cancelled'})
 late({coords:{latitude:25,longitude:121,accuracy:10}})
 const result=await locateOnce({secure:true,geolocation:{getCurrentPosition(success){success({coords:{latitude:24,longitude:120,accuracy:20}})}}})
 assert.equal(result.latitude,24)
 await assert.rejects(locateOnce({secure:true,signal:controller.signal}),{code:'cancelled'})
})
