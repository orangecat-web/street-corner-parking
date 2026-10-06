<script setup>
import {computed,onMounted,onBeforeUnmount,watch,ref} from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {spaceSummary,vacancyTone} from '../parking-display'
const props=defineProps({records:Array,selected:Object,vehicle:String})
const emit=defineEmits(['select'])
const host=ref(null),tileError=ref(false),drawnCount=ref(0)
const points=computed(()=>props.records.filter(p=>p.lat&&p.lng))
let map,layer
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
 if(points.value.length){map.fitBounds(L.latLngBounds(points.value.map(p=>[p.lat,p.lng])),{padding:[50,90],maxZoom:15})}
 draw()
}
onMounted(()=>{
 map=L.map(host.value,{zoomControl:false}).setView([25.035,121.51],12)
 L.control.zoom({position:'bottomright'}).addTo(map)
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).on('tileerror',()=>tileError.value=true).addTo(map)
 layer=L.layerGroup().addTo(map);map.on('moveend',draw);fit()
})
watch(()=>props.records,fit)
watch(()=>props.vehicle,draw)
watch(()=>props.selected,p=>{if(map&&p?.lat&&p?.lng)map.setView([p.lat,p.lng],17);draw()})
onBeforeUnmount(()=>map?.remove())
</script>
<template lang="pug">
.map-panel
  .map-canvas(ref="host" aria-label="雙北停車地圖")
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
