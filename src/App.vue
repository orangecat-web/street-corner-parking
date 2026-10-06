<script setup>
import {computed,onMounted,onUnmounted,watch,ref,nextTick} from 'vue'
import {storeToRefs} from 'pinia'
import {useParkingStore} from './stores/parking'
import ParkingRules from './components/ParkingRules.vue'
import ParkingMap from './components/ParkingMap.vue'
import ParkingStatus from './components/ParkingStatus.vue'
import {spaceSummary,vehicleNames,accessRows,lotKind,feeSections} from './parking-display'
const store=useParkingStore()
const {scope,vehicle,facility,city,district,type,keyword,selected,limit,visible,filtered,districts,records,statuses,loading}=storeToRefs(store)
const showSources=ref(false)
const names={car:'付費汽車格',motorcycle:'機車共用格（普重／大重）',heavy:'重機專用格',lot:'路外停車場'}
const typeChoices=computed(()=>vehicle.value==='car'?['全部','car']:vehicle.value==='motorcycle'?['全部','motorcycle']:['全部','motorcycle','heavy','car'])
// 收起搜尋仍能看見目前條件；原生 details 保留輸入值並支援鍵盤操作。
const searchSummary=computed(()=>[{street:'路邊',lot:'停車場',全部:'全部範圍'}[scope.value],vehicleNames[vehicle.value]||'全部車種',city.value==='全部'?'雙北':city.value,district.value!=='全部'?district.value:null,facility.value!=='全部'?facility.value:null,type.value!=='全部'?names[type.value]:null,keyword.value.trim()?`「${keyword.value.trim()}」`:null].filter(Boolean).join(' · '))
const labels={taipeiMotor:'臺北機車路段',taipeiCar:'臺北汽車路段',newTaipeiFee:'新北機車收費路段',newTaipeiBay:'板橋／新店機車彎',newTaipeiCar:'新北路邊格位',taipeiLots:'臺北路外停車場',newTaipeiLots:'新北路外停車場'}
const addressMap=computed(()=>selected.value&&!selected.value.lat?`https://maps.google.com/maps?q=${encodeURIComponent(selected.value.address)}&output=embed`:null)
const navigation=p=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.lat?`${p.lat},${p.lng}`:p.address)}&travelmode=driving`
const time=s=>new Date(s).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})
// hash 頁面保留查詢條件，也支援返回鍵與直接連結。
const rulesPage=ref(location.hash==='#rules')
async function updatePage(){rulesPage.value=location.hash==='#rules';document.title=rulesPage.value?'停放規則｜街角停車':'街角停車｜雙北停車查詢';await nextTick();if(rulesPage.value)document.getElementById('rules-heading')?.focus()}
onMounted(()=>{window.addEventListener('hashchange',updatePage);updatePage()})
onUnmounted(()=>window.removeEventListener('hashchange',updatePage))
watch([scope,vehicle,facility,city,district,type,keyword],()=>{limit.value=60;selected.value=null})
const summary=p=>spaceSummary(p,vehicle.value)
// 僅列官方提供的車位數，0 是有效數值；沒有空位數仍可保留總格數。
const lotSpaceRows=computed(()=>selected.value?.scope==='lot'?Object.entries(vehicleNames).map(([key,label])=>({key,label,available:selected.value.vacancy?.[key]??null,total:selected.value.capacity?.[key]??null})).filter(row=>row.available!==null||row.total!==null):[])
const coordinateCount=computed(()=>filtered.value.filter(p=>p.lat&&p.lng).length)
const cityCounts=computed(()=>({taipei:records.value.filter(p=>p.city==='臺北市').length,newTaipei:records.value.filter(p=>p.city==='新北市').length}))
const feeSummary=p=>p.scope==='lot'?'按車種查看費率':p.type==='car'?p.fee:p.charge==='unknown'?'收費待確認':vehicle.value==='heavy'?p.fee:p.ordinaryFee||'依現場公告'
onMounted(()=>store.load())
</script>
<template lang="pug">
.app-shell
  header.topbar
    .brand-mark P
    .brand
      h1 街角停車
      span 雙北路邊／停車場查詢 · v1.6
    .top-actions
      a.sources-button(href="#rules" :aria-current="rulesPage?'page':undefined") 停放規則
      button.sources-button(@click="showSources=!showSources") 資料來源
      button.refresh(@click="store.load" :disabled="loading") {{ loading ? '連線中…' : '重新整理' }}
  ParkingRules(v-if="rulesPage")
  main.workspace(v-if="!rulesPage")
    aside.sidebar(aria-label="停車查詢")
      details.search-panel
        summary.search-toggle(aria-controls="search-controls")
          .search-toggle-copy
            strong 搜尋與篩選
            span(:title="searchSummary") {{ searchSummary }}
          span.search-toggle-state(aria-hidden="true")
            span.when-closed 展開 ＋
            span.when-open 收起 −
        #search-controls.search-controls
          .scope-tabs(aria-label="停車範圍")
            button(v-for="(label,key) in {street:'路邊',lot:'停車場',全部:'全部'}" :key="key" @click="scope=key" :class="{active:scope===key}" :aria-pressed="scope===key") {{ label }}
          .select-grid
            .field
              label(for="vehicle") 我的車種
              select#vehicle(v-model="vehicle")
                option 全部
                option(v-for="(label,key) in vehicleNames" :key="key" :value="key") {{ label }}
            .field(v-if="scope!=='street'")
              label(for="facility") 停車場型態
              select#facility(v-model="facility")
                option(v-for="f in ['全部','地下','室內','立體','平面','未註明']" :key="f") {{ f }}
          .search-box
            label(for="search") 搜尋路名或地址
            input#search(v-model="keyword" type="search" placeholder="例如：文化路、石牌路")
          .select-grid
            .field
              label(for="city") 城市
              select#city(v-model="city")
                option 全部
                option 臺北市
                option 新北市
            .field
              label(for="district") 行政區
              select#district(v-model="district")
                option(v-for="d in districts" :key="d") {{ d }}
          p.filter-hint(v-if="city==='臺北市' && scope!=='lot'") 臺北路邊清冊未提供行政區，請保留「全部」並用路名搜尋；未畫圖釘不代表沒資料。
          .type-tabs(v-if="scope!=='lot'" aria-label="格位類型")
            button(v-for="t in typeChoices" :key="t" @click="type=t" :class="{active:type===t}" :aria-pressed="type===t") {{ t==='全部' ? '全部格位' : names[t] }}
          p.filter-hint 機車共用格包含一般機車與大型重機；收費未提供不等於免費。
          p.filter-hint 地圖只畫有效座標，完整路段資料在下方列表。
          .filter-actions
            button.sources-button(@click="store.resetFilters") 清除篩選
      .coverage-strip
        span 臺北 {{ cityCounts.taipei.toLocaleString() }} 筆
        span 新北 {{ cityCounts.newTaipei.toLocaleString() }} 筆
      .result-heading
        h3 {{ filtered.length.toLocaleString() }} 筆結果
        span {{ coordinateCount.toLocaleString() }} 筆有座標
      .status-legend(aria-label="色點說明")
        span
          i.status-dot.allowed(aria-hidden="true")
          |  可停／有
        span
          i.status-dot.unmarked(aria-hidden="true")
          |  未確認
        span
          i.status-dot.denied(aria-hidden="true")
          |  不可停／無
      .results(aria-live="polite")
        .state(v-if="loading && !records.length")
          .spinner
          h3 正在讀取官方資料
          p 各來源完成後會陸續顯示，首次讀取可能較久。
        .state(v-else-if="!filtered.length")
          h3 {{ records.length ? '沒有符合的結果' : '目前無法取得資料' }}
          p {{ records.length ? '換個關鍵字或按「清除篩選」試試。' : '請查看資料來源狀態，稍後重新整理。' }}
        button.parking-card(v-for="p in visible" :key="p.id" @click="selected=p" :class="{chosen:selected?.id===p.id}")
          .card-top
            span.badge(:class="p.type") {{ p.scope==='lot'?`${p.facility}停車場`:names[p.type] }}
            span.area {{ p.city==='臺北市'?'臺北':p.district }}
          span.motorcycle-lot-badge(v-if="p.scope==='lot' && lotKind(p).motorcycleLot" :title="lotKind(p).basis") {{ lotKind(p).label }}
          h3 {{ p.name }}
          ParkingStatus(v-if="p.scope==='lot'" :parking="p")
          p.range(v-if="p.range") {{ p.range }}
          .card-meta
            strong {{ feeSummary(p) }}
            span {{ p.lat ? '官方座標' : '地址搜尋' }}
          .vacancy-line
            span(v-if="p.spaceId") 格號 {{ p.spaceId }} · 單一格位
            span(v-else) {{ summary(p).label }}{{ p.scope==='lot'?'總格數':'路段格數' }} {{ summary(p).total ?? '未提供' }}
            strong.known(v-if="p.scope==='lot' && summary(p).available!==null") 剩餘 {{ summary(p).available }} 格
        button.load-more(v-if="filtered.length>visible.length" @click="limit+=60") 顯示更多（剩餘 {{ filtered.length-visible.length }} 筆）
      .sidebar-foot
        span {{ store.successful }}/7 個資料來源已連線
        span 空位資料依官方回報
    section.map-workspace(aria-label="地圖及停車資訊")
      ParkingMap(:records="filtered" :selected="selected" :vehicle="vehicle" @select="selected=$event")
      .map-title
        span 雙北試跑
        h2 {{ selected ? selected.name : '路邊停車地圖' }}
        p(v-if="selected && !selected.lat") 地址搜尋位置
      iframe.address-map(v-if="addressMap" :src="addressMap" title="所選停車路段地址地圖" loading="lazy" referrerpolicy="no-referrer-when-downgrade")
      article.detail-card(v-if="selected")
        button.close(@click="selected=null" aria-label="關閉停車資訊") ×
        span.badge(:class="selected.type") {{ selected.scope==='lot'?`${selected.facility}停車場`:names[selected.type] }}
        h2 {{ selected.name }}
        p.address {{ selected.address }}
        section.lot-access-detail(v-if="selected.scope==='lot'" aria-labelledby="lot-access-title")
          h3#lot-access-title 停車資訊
          p.lot-kind(v-if="lotKind(selected).motorcycleLot") {{ lotKind(selected).label }}
          ParkingStatus(:parking="selected")
          dl.lot-features
            template(v-if="selected.vehicleAccess?.heavy?.state==='allowed'")
              dt 大重停放方式
              dd {{ selected.heavyParking?.label }}
            template(v-if="selected.disability?.car!=null || selected.disability?.motorcycle!=null || selected.disability?.available!=null")
              dt 身障專用格
              dd
                p(v-if="selected.disability?.car!=null") 汽車 {{ selected.disability.car }} 格
                p(v-if="selected.disability?.motorcycle!=null") 機車 {{ selected.disability.motorcycle }} 格
                p(v-if="selected.disability?.available!=null") 官方剩餘 {{ selected.disability.available }} 格（未分車種）
          h3 收費標準
          dl.fee-sections
            template(v-for="group in feeSections(selected.fee)" :key="group.title")
              dt {{ group.title }}
              dd
                p(v-for="(line,index) in group.lines" :key="index") {{ line }}
          ul(v-if="selected.monthlyInfo?.details?.length && !/月租|月票|季租|年租|半年租|定期票/.test(selected.fee)")
            li(v-for="(item,index) in selected.monthlyInfo.details" :key="index") {{ item }}
          details.lot-evidence
            summary 官方原文與判定依據
            p.fee-original {{ selected.fee }}
            dl
              template(v-for="row in accessRows(selected)" :key="row.key")
                dt {{ row.vehicle }} · {{ row.label }}
                dd {{ row.reason }}
            p(v-if="selected.heavyParking?.reason") {{ selected.heavyParking.reason }}
            p(v-if="selected.disability?.reason") {{ selected.disability.reason }}
            p(v-if="selected.monthlyInfo?.reason") {{ selected.monthlyInfo.reason }}

        dl
          template(v-if="selected.scope!=='lot'")
            dt {{ selected.type==='car'?'汽車格費率':'大型重機費率' }}
            dd {{ selected.fee }}
          template(v-if="selected.ordinaryFee")
            dt 一般機車費率
            dd {{ selected.ordinaryFee }}
          template(v-if="selected.scope!=='lot'")
            dt 收費狀態
            dd {{ selected.charge==='unknown' ? '資料未提供，請看現場牌面' : selected.charge==='free'?'官方標示不收費':'公告收費路段／格位' }}
          dt {{ selected.scope==='lot'?'開放時間':'收費時間' }}
          dd {{ selected.schedule }}
          template(v-if="selected.spaceId")
            dt 格位編號
            dd {{ selected.spaceId }} 號格（單一格位，編號不是剩餘格數）
          dt {{ selected.spaceId?'本筆格位數':selected.scope==='lot'?`${summary(selected).label}總格數`:`${summary(selected).label}路段總格數` }}
          dd {{ summary(selected).total===null?'未提供':`${summary(selected).total} 格` }}
          template(v-if="selected.scope==='lot' && summary(selected).available!==null")
            dt {{ summary(selected).label }}剩餘格數
            dd {{ summary(selected).available }} 格（官方回報）
          template(v-if="lotSpaceRows.length")
            dt 各車種車位資訊
            dd(v-for="row in lotSpaceRows" :key="row.key")
              span {{ row.label }}：
              span(v-if="row.available!==null") 剩餘 {{ row.available }} 格
              span(v-if="row.available!==null && row.total!==null") ／
              span(v-if="row.total!==null") 總共 {{ row.total }} 格
          template(v-if="selected.updatedAt")
            dt 官方資料更新時間
            dd {{ selected.updatedAt }}
        p.detail-note(v-if="selected.scope!=='lot'") {{ selected.note }}
        .detail-actions
          a.navigate(:href="navigation(selected)" target="_blank" rel="noopener noreferrer") Google Maps 導航
          a(:href="selected.sourceUrl" target="_blank" rel="noopener noreferrer") 官方資料
      .map-empty(v-if="!selected && filtered.length && !coordinateCount") 此篩選有 {{ filtered.length }} 筆資料，但沒有有效座標。請點左側路段以地址查看地圖。
  .sources-overlay(v-if="showSources")
    section.sources-dialog(role="dialog" aria-modal="true" aria-labelledby="source-title")
      button.close(@click="showSources=false" aria-label="關閉來源") ×
      h2#source-title 官方資料連線狀態
      p 直接取官方資料；格位及停車場資料快取 2 分鐘，路段清冊 1 小時。顯示的是擷取時間，並非每筆資料更新日期。
      .source-row(v-for="(label,key) in labels" :key="key")
        strong {{ label }}
        span(:class="statuses[key]?.state") {{ statuses[key]?.state==='success' ? `${statuses[key].count.toLocaleString()} 筆` : statuses[key]?.state==='error' ? '讀取失敗' : '讀取中' }}
        small(v-if="statuses[key]?.fetchedAt") 擷取 {{ time(statuses[key].fetchedAt) }}
        small.warning(v-if="statuses[key]?.warning") {{ statuses[key].warning }}
        small(v-if="statuses[key]?.error") {{ statuses[key].error }}{{ statuses[key].retained?'（目前保留前次資料）':'' }}
        a(v-if="statuses[key]?.url" :href="statuses[key].url" target="_blank" rel="noopener noreferrer") 查看資料集
      p 路邊機車不提供即時剩餘數；臺北路外停車場依官方欄位分車種，新北路外即時空位僅汽車。板橋、新店停車彎資料缺收費欄位，不標為免費。不同來源可能描述同一路段，筆數不等於不重複格位總數。
      a(href="https://www.parkinginfo.ntpc.gov.tw/parkinginfo/public/GoogleMap.aspx" target="_blank" rel="noopener noreferrer") 新北市停車資訊網
      a(href="https://pma.gov.taipei/News_Content.aspx?n=C367863C93700356&s=6E0F2593F02B9BE6&sms=72544237BBE4C5F6" target="_blank" rel="noopener noreferrer") 臺北市政策公告
      a(href="https://www.traffic.ntpc.gov.tw/home.jsp?act=be4f48068b2b0031&dataserno=99345bcf365b8f6ed7a6315705335638&id=54fa46e9e522dde4&mserno=39e5192ff77897e0ae099c1886ca9b09" target="_blank" rel="noopener noreferrer") 新北市政策公告
</template>
