<script setup>
import {computed,onMounted,onBeforeUnmount,watch,ref,nextTick} from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {spaceSummary,vacancyTone} from '../parking-display'
import {locateOnce} from '../geolocation'
const props=defineProps({records:Array,selected:Object,vehicle:String})
const emit=defineEmits(['select','locate'])
const host=ref(null),tileError=ref(false),drawnCount=ref(0)
const locating=ref(false),locationMessage=ref(''),locationError=ref(false),userLocation=ref(null)
const points=computed(()=>props.records.filter(p=>p.lat&&p.lng))
let map,layer,locationLayer,locationRequest
const locationErrors={denied:'未允許定位，請在瀏覽器網站設定開啟位置權限後再試。',unavailable:'目前無法取得位置，請確認裝置定位已開啟後再試。',timeout:'定位逾時，請移到訊號較好的地方再試。',unsupported:'此瀏覽器不支援定位，請改用支援定位的瀏覽器。',insecure:'定位需要安全連線，請以 HTTPS 開啟網站。'}
async function locate(){
 if(locating.value||!map)return
 locating.value=true;locationError.value=false;locationMessage.value='正在取得你的位置…'
 const request=new AbortController();locationRequest=request
 try{
  const coords=await locateOnce({signal:request.signal})
  userLocation.value=coords
  const currentLocation=userLocation.value
  const point=[coords.latitude,coords.longitude]
  // 使用獨立圖層，停車格重畫／篩選不會移除定位點與精度範圍。
  locationLayer.clearLayers()
  L.circle(point,{radius:coords.accuracy,color:'#1677ff',weight:1,fillOpacity:0.12,interactive:false}).addTo(locationLayer)
  L.circleMarker(point,{radius:8,color:'#fff',weight:3,fillColor:'#1677ff',fillOpacity:1,className:'user-location-marker'}).addTo(locationLayer).bindTooltip('我的位置')
  emit('locate')
  // 先等所選場站／地址嵌入移除，再停止舊移動並直接以定位點置中。
  // 精度圈只表達誤差，不用來決定縮放，避免粗略定位拉遠到全市。
  await nextTick()
  // 等待已排程的縮放開始；Leaflet 縮放進行中可能忽略新的 setView。
  await new Promise(resolve=>requestAnimationFrame(resolve))
  if(request.signal.aborted)return
  map.stop();map.invalidateSize({pan:false})
  map.once('moveend',()=>{
   // 舊動畫完成後再確認定位視野；較新的定位優先，卸載後不再操作。
   if(map&&userLocation.value===currentLocation)map.setView(point,16,{animate:false})
  })
  map.setView(point,16,{animate:false})
  // 手機地圖在列表下方；成功後將定位點帶入使用者可見的畫面。
  const bounds=host.value.getBoundingClientRect()
  if(bounds.top<0||bounds.bottom>window.innerHeight)host.value.scrollIntoView({block:'center',behavior:'instant'})
  locationMessage.value=`藍點是你的位置，定位精度約 ${Math.ceil(coords.accuracy).toLocaleString()} 公尺；請依現場確認。`
 }catch(error){
  if(error.code!=='cancelled'){
   locationError.value=true
   locationMessage.value=(locationErrors[error.code]||locationErrors.unavailable)+(userLocation.value?' 地圖保留上次定位，並非最新位置。':'')
  }
 }finally{
  if(locationRequest===request){locating.value=false;locationRequest=null}
 }
}
function marker(p){
 const s=spaceSummary(p,props.vehicle)
 const isLot=p.scope==='lot'
 const label=isLot?(s.available===null?'P':String(s.available)):p.type==='car'?'汽':p.type==='heavy'?'重':'機'
 const cls=isLot?`lot ${vacancyTone(s)}`:p.type==='car'?'car':p.type==='heavy'?'heavy':'motorcycle'
 const icon=L.divIcon({className:'parking-marker-host',html:`<span class="parking-marker ${cls}">${label}</span>`,iconSize:isLot?[38,38]:[30,30],iconAnchor:isLot?[19,19]:[15,15]})
 const tip=document.createElement('span')
 // 未提供的空位數不放進地圖提示；保留 P 地標與有效的 0 格。
 const counts=[s.available!==null?`剩餘 ${s.available} 格`:null,s.total!==null?`總共 ${s.total} 格`:null].filter(Boolean).join('／')
 tip.textContent=`${p.name}${isLot&&counts?`｜${s.label}${counts}`:!isLot&&p.spaceId?`｜格號 ${p.spaceId}`:''}`
 L.marker([p.lat,p.lng],{icon,zIndexOffset:props.selected?.id===p.id?1000:isLot?100:0}).addTo(layer).bindTooltip(tip).on('click',()=>emit('select',p))
}
function draw(){
 if(!map)return
 layer.clearLayers()
 // 依目前地圖視窗顯示，不以資料前 500 筆假裝全市圖釘。
 const shown=points.value.filter(p=>map.getBounds().contains([p.lat,p.lng])).slice(0,500)
 if(props.selected?.lat&&!shown.some(p=>p.id===props.selected.id))shown.push(props.selected)
 for(const p of shown)marker(p)
 drawnCount.value=shown.length
}
function fit(){
 if(!map)return
 if(!userLocation.value&&points.value.length){map.fitBounds(L.latLngBounds(points.value.map(p=>[p.lat,p.lng])),{padding:[50,90],maxZoom:15})}
 draw()
}
onMounted(()=>{
 map=L.map(host.value,{zoomControl:false}).setView([25.035,121.51],12)
 L.control.zoom({position:'bottomright'}).addTo(map)
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).on('tileerror',()=>tileError.value=true).addTo(map)
 layer=L.layerGroup().addTo(map);locationLayer=L.layerGroup().addTo(map);map.on('moveend',draw);fit()
})
watch(()=>props.records,fit)
watch(()=>props.vehicle,draw)
watch(()=>props.selected,p=>{if(map&&p?.lat&&p?.lng)map.setView([p.lat,p.lng],17);draw()})
onBeforeUnmount(()=>{
 locationRequest?.abort()
 const previousMap=map;map=null
 previousMap?.off('moveend',draw);previousMap?.stop();previousMap?.remove()
})
</script>
<template lang="pug">
.map-panel
  .map-canvas(ref="host" aria-label="雙北停車地圖")
  //- 按下才請求位置；狀態由 live region 提供給輔助技術。
  .map-location
    button.locate-button(type="button" @click="locate" :disabled="locating" :aria-busy="locating") {{ locating ? '定位中…' : '定位我的位置' }}
    p.location-status(role="status" aria-live="polite" aria-atomic="true" :class="{error:locationError}") {{ locationMessage }}
  .map-caption
    .legend-line
      span.legend-symbol.car 汽
      span 汽車格
      span.legend-symbol.motorcycle 機
      span 機車共用格
      span.legend-symbol.heavy 重
      span 重機格
    .legend-line
      span.legend-symbol.lot.open 8
      span 停車場數字＝剩餘格數
    .legend-line
      span.legend-swatch.open
      span 較多
      span.legend-swatch.limited
      span 較少
      span.legend-swatch.busy
      span 接近滿位
      span.legend-swatch.unknown P
      span 停車場
    small 地圖 {{ drawnCount }} 點／有座標 {{ points.length.toLocaleString() }} 筆；視窗最多 500 點
  p.tile-error(v-if="tileError") 地圖圖磚暫時無法載入，仍可用清單搜尋與導航。
</template>
