import {defineStore} from 'pinia'
import {computed,ref,watch} from 'vue'
import {matchesVehicle} from '../parking-display.js'
import {normalizeSearch} from '../parking-search.js'
import {fetchParking,sourceKeys} from '../api/parking.js'
export const useParkingStore=defineStore('parking',()=>{
 const records=ref([]), statuses=ref({}), loading=ref(false)
 const scope=ref('street'),vehicle=ref('全部'),facility=ref('全部')
 const city=ref('全部'), district=ref('全部'), type=ref('全部'), keyword=ref(''), selected=ref(null), limit=ref(60)
 // 切換主要範圍時清掉不相容條件，避免上一頁的行政區／格位類型讓結果歸零。
 watch(scope,()=>{type.value='全部';facility.value='全部';district.value='全部'},{flush:'sync'})
 watch(vehicle,()=>{type.value='全部'},{flush:'sync'})
 watch(city,()=>{district.value='全部'},{flush:'sync'})
 function resetFilters(){vehicle.value='全部';facility.value='全部';city.value='全部';district.value='全部';type.value='全部';keyword.value=''}
 const districts=computed(()=>['全部',...new Set(records.value.filter(p=>city.value==='全部'||p.city===city.value).map(p=>p.district))].sort((a,b)=>a==='全部'?-1:b==='全部'?1:a.localeCompare(b,'zh-Hant')))
 const filtered=computed(()=>{
  const query=normalizeSearch(keyword.value)
  return records.value.filter(p=>(scope.value==='全部'||p.scope===scope.value)&&matchesVehicle(p,vehicle.value)&&(facility.value==='全部'||p.facility===facility.value)&&(city.value==='全部'||p.city===city.value)&&(district.value==='全部'||p.district===district.value)&&(type.value==='全部'||p.type===type.value)&&[p.name,p.address,p.range].some(text=>normalizeSearch(text).includes(query)))
 })
 const visible=computed(()=>filtered.value.slice(0,limit.value))
 const successful=computed(()=>Object.values(statuses.value).filter(s=>s.state==='success').length)
 async function load(){
  if(loading.value)return
  loading.value=true
  // 來源逐一完成就更新畫面，不等最慢的一個 API。
  await Promise.allSettled(sourceKeys.map(async key=>{
   statuses.value[key]={state:'loading'}
   try {
    const data=await fetchParking(key)
    records.value=[...records.value.filter(p=>p.source!==key),...data.records.map(p=>({...p,scope:p.scope||((p.type==='lot'||p.source?.endsWith('Lots'))?'lot':'street')}))]
    statuses.value[key]={state:'success',fetchedAt:data.fetchedAt,count:data.count,label:data.source,url:data.sourceUrl,warning:data.warning}
   }catch(e){statuses.value[key]={state:'error',error:e.response?.data?.error||'無法連線官方資料，請稍後重試',retained:records.value.some(p=>p.source===key)}}
  }))
  loading.value=false
 }
 return {scope,vehicle,facility,records,statuses,loading,city,district,type,keyword,selected,limit,districts,filtered,visible,successful,load,resetFilters}
})
