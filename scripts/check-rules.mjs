import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {eligible} from '../server/rules.mjs'
import {newTaipeiBay,newTaipeiCar,taipeiMotor} from '../server/normalize.mjs'
// 核對容易誤判的規則：收費路段在非收費時段不會變成「未收費格」。
assert.equal(eligible({city:'臺北市',district:'大安區',type:'motorcycle',charge:'free'}),false)
assert.equal(eligible({city:'臺北市',type:'motorcycle',charge:'paid'}),true)
assert.equal(eligible({city:'新北市',district:'板橋區',type:'motorcycle',charge:'unknown'}),true)
assert.equal(eligible({city:'新北市',district:'三重區',type:'motorcycle',charge:'unknown'}),false)
assert.equal(eligible({type:'car',charge:'paid'}),true)
assert.equal(eligible({type:'disabled',charge:'paid'}),false)
assert.equal(newTaipeiBay([{area:'板橋',address:'警用機車位',parking_lots1quantity:'15'}]).length,0)
assert.equal(newTaipeiCar([{name:'汽車身心障礙專用',pay:'計時收費'}]).length,0)
assert.equal(newTaipeiCar([{id:'1',name:'汽車停車位',areacode:'65000010',roadname:'文化路',cellid:'1',pay:'限時計次收',paycash:'30元',day:'每日',hour:'9-17',latitude:'25.0',longitude:'121.5'}])[0].district,'板橋區')
assert.equal(newTaipeiCar([{id:'2',name:'汽車停車位',areacode:'65000060',roadname:'北新路',cellid:'2',pay:'計時收費',paycash:'30元',day:'每日',hour:'9-17',latitude:'25.0',longitude:'121.5'}])[0].district,'新店區')
console.log('停放規則與專用格排除檢查通過')

// v1.1：正確合併官方 ID，0 與未知分開、車種不可共用空位數。
const {taipeiLots,newTaipeiLots}=await import('../server/normalize.mjs')
const {spaceSummary}=await import('../src/parking-display.js')
const t=taipeiLots({static:{data:{park:[{id:'A',name:'測試地下場',area:'中山區',address:'B1',totalcar:100,totalmotor:50,totallargemotor:4,tw97x:'302864.7812',tw97y:'2771988.958'}]}},dynamic:{data:{UPDATETIME:'2026-10-06',park:[{id:'B',availablecar:99},{id:'A',availablecar:0,availablemotor:12,availableheavymotor:-9}]}}})[0]
assert.equal(t.facility,'地下')
assert.equal(spaceSummary(t,'car').available,0)
assert.equal(spaceSummary(t,'motorcycle').available,12)
assert.equal(spaceSummary(t,'heavy').available,null)
assert.ok(t.lat>25&&t.lat<26&&t.lng>121&&t.lng<122)
const n=newTaipeiLots({static:[{ID:'A',NAME:'室內場',TOTALCAR:'50',TOTALMOTOR:'20',TW97X:0,TW97Y:0}],dynamic:[{ID:'A',AVAILABLECAR:'5'}]})[0]
assert.equal(n.vacancy.car,5)
assert.equal(n.vacancy.motorcycle,null)
assert.equal(n.lat,null)
assert.equal(spaceSummary({scope:'street',type:'car',total:1,available:0},'heavy').label,'汽車')
console.log('停車場 ID、車種、負值／0、座標檢查通過')

// v1.2：使用真正的 Pinia store 驗證範圍與車種切換，而非只驗證常數。
const {createPinia,setActivePinia}=await import('pinia')
const {useParkingStore}=await import('../src/stores/parking.js')
setActivePinia(createPinia())
const store=useParkingStore()
store.records=[
 {id:'road-car',scope:'street',type:'car',city:'新北市',district:'板橋區',name:'文化路',address:'文化路'},
 {id:'road-bike',scope:'street',type:'motorcycle',city:'臺北市',district:'未提供行政區',name:'石牌路',address:'石牌路'},
 {id:'lot-bike',scope:'lot',type:'lot',city:'臺北市',district:'大安區',name:'地下場',address:'地下場',facility:'地下',capacity:{motorcycle:20,car:10},heavyConfirmed:false}
]
assert.equal(store.filtered.length,2)
store.scope='lot';assert.deepEqual(store.filtered.map(p=>p.id),['lot-bike'])
store.type='car';store.facility='地下';store.district='大安區'
store.scope='street';assert.equal(store.type,'全部');assert.equal(store.facility,'全部');assert.equal(store.district,'全部');assert.equal(store.filtered.length,2)
store.type='car';store.vehicle='motorcycle';assert.equal(store.type,'全部');assert.deepEqual(store.filtered.map(p=>p.id),['road-bike'])
store.scope='全部';assert.equal(store.filtered.length,2)
store.keyword='不存在';assert.equal(store.filtered.length,0);store.resetFilters();assert.equal(store.filtered.length,3)
const freeRow={id:'free',name:'機車停車位',areacode:'65000010',roadname:'文化路',cellid:'F1',pay:'不收費',latitude:'25',longitude:'121.5'}
assert.equal(newTaipeiCar([freeRow])[0].charge,'free')
assert.match(newTaipeiCar([freeRow])[0].fee,/免費/)
assert.equal(newTaipeiCar([{...freeRow,areacode:'65000020'}]).length,0)
assert.equal(newTaipeiCar([{...freeRow,name:'汽車停車位'}]).length,0)
console.log('範圍／車種切換、清除篩選、免費機車格檢查通過')

// 車種准入：0 專用格不代表禁止共享；剩餘 0 不改變可停資格。
const {vehicleAccess,lotVehicleKind}=await import('../server/vehicle-access.mjs')
let access=vehicleAccess({capacity:{car:30,motorcycle:50,heavy:0},fareRules:[{ParkingType:'CM',RateType:'1'}]})
assert.equal(access.heavy.state,'allowed')
assert.equal(vehicleAccess({capacity:{heavy:0}}).heavy.state,'unmarked')
assert.equal(vehicleAccess({capacity:{heavy:4},fee:'禁止大型重型機車停放'}).heavy.state,'denied')
assert.equal(vehicleAccess({fee:'大型重機不得停放機車區'}).heavy.state,'unmarked')
assert.equal(vehicleAccess({fee:'大型重機停車每小時30元'}).heavy.state,'allowed')
assert.equal(vehicleAccess({fee:'普通重型機車每小時20元'}).heavy.state,'unmarked')
assert.equal(vehicleAccess({fee:'大型重機每小時30元'}).motorcycle.state,'unmarked')
assert.equal(vehicleAccess({fee:'大型重機請洽管理員'}).heavy.state,'unmarked')
assert.equal(vehicleAccess({fareRules:[{ParkingType:'HM',RateType:'3'}]}).heavy.label,'可停（臨停未標註）')
assert.equal(lotVehicleKind('捷運橋下機車停車場',{car:0,motorcycle:20}).motorcycleLot,true)
assert.equal(lotVehicleKind('汽機車停車場',{car:30,motorcycle:20}).motorcycleLot,false)
const {matchesVehicle,accessRows}=await import('../src/parking-display.js')
const deniedLot={scope:'lot',capacity:{heavy:4},vehicleAccess:vehicleAccess({capacity:{heavy:4},fee:'禁止大型重機停放'})}
assert.equal(matchesVehicle(deniedLot,'heavy'),false)
assert.equal(matchesVehicle({scope:'lot',capacity:{heavy:0},heavyConfirmed:true},'heavy'),false)
assert.equal(accessRows({scope:'lot',capacity:{car:0,motorcycle:20}}).find(r=>r.key==='car').state,'unmarked')
console.log('逐車種准入、共用費率、禁止／條件限制、普通重型歧義、機車場標註檢查通過')

assert.equal(vehicleAccess({fee:'重型機車計時30元'}).heavy.state,'unmarked')
assert.equal(vehicleAccess({fee:'重型機車計時30元'}).motorcycle.state,'unmarked')
assert.equal(vehicleAccess({fee:'大型重機計時30元'}).heavy.state,'allowed')
assert.equal(vehicleAccess({fee:'大型重機月租1500元'}).heavy.label,'可停（臨停未標註）')
console.log('自由文字費率、模糊重型機車與僅月租情境檢查通過')

assert.equal(vehicleAccess({fee:'大型重機請洽管理員，汽車計時30元'}).heavy.state,'unmarked')
assert.equal(vehicleAccess({fee:'大型重機請洽管理員,汽車計時30元'}).heavy.state,'unmarked')
assert.equal(vehicleAccess({fee:'大型重機月租1,500元'}).heavy.label,'可停（臨停未標註）')

// 身障格是專用供給資訊，不以優惠費率或缺值推定有／無。
const {monthlyInfo,disabilityInfo,heavyParkingInfo}=await import('../server/lot-features.mjs')
let disability=disabilityInfo('小型車:17格(含身心障礙停車位1格)，機車:50格(含身心障礙停車位3格)',0)
assert.equal(disability.car,1);assert.equal(disability.motorcycle,3);assert.equal(disability.available,0);assert.equal(disability.state,'allowed')
assert.equal(disabilityInfo('身障車月租1500元').state,'unmarked')
assert.equal(disabilityInfo('小型車:10格(含身障停車位0格)，機車:20格(含身障停車位0格)').state,'denied')
assert.equal(disabilityInfo('小型車:10格(含身障停車位0格)，機車:20格(含身障停車位0格)',3).state,'unmarked')
assert.equal(disabilityInfo('',-9).available,null)
assert.equal(monthlyInfo('小型車月租3,500元').state,'allowed')
assert.equal(monthlyInfo('不提供月租').state,'denied')
assert.equal(monthlyInfo('月租3000元；月租已額滿').state,'unmarked')
assert.equal(monthlyInfo('計時30元').state,'unmarked')
assert.equal(monthlyInfo('',[{ParkingType:'CM',RateType:'3',ParkingRates:1500}]).state,'allowed')
const sharedAccess=vehicleAccess({capacity:{car:50,heavy:0},fareRules:[{ParkingType:'CM',RateType:'1'}]})
assert.equal(heavyParkingInfo({capacity:{heavy:0},access:sharedAccess,fareRules:[{ParkingType:'CM'}]}).label,'使用汽車格')
assert.equal(heavyParkingInfo({capacity:{heavy:0},access:{heavy:{state:'allowed'}}}).label,'可停，但沒有大重專用格')
assert.equal(heavyParkingInfo({capacity:{heavy:4},access:{heavy:{state:'allowed'}}}).label,'有大重專用格')
const {lotStatusRows}=await import('../src/parking-display.js')
const badges=lotStatusRows({scope:'lot',vehicleAccess:vehicleAccess({fareRules:[{ParkingType:'HM',RateType:'3'}]}),monthlyInfo:monthlyInfo('月租1500元'),disability:disabilityInfo('')})
assert.equal(badges.length,5);assert.equal(badges.find(r=>r.key==='heavy').state,'unmarked');assert.equal(badges.find(r=>r.key==='monthly').state,'allowed')
console.log('月租名額、身障格分車種／衝突、汽車共用格／大重專用格與五項色點檢查通過')

assert.equal(disabilityInfo('小型車:0格、機車:50格(含身心障礙停車位3格)').car,null)
assert.equal(disabilityInfo('小型車:0格,機車:50格(含身心障礙停車位3格)').car,null)
assert.equal(disabilityInfo('小型車:0格、機車:50格(含身心障礙停車位3格)').motorcycle,3)

// 官方林口停三 PAYEX：機車 0 格仍有重型機車費率，須保留歧義與原文。
const linkouFee='小型車計時20元;小型車計時30元;小型車月租2700元;身障車月租2000元;重型機車計時20元;重型機車計時30元;'
const linkou=newTaipeiLots({static:[{ID:'170009',NAME:'林口區停三立體停車場',TOTALCAR:'141',TOTALMOTOR:'0',PAYEX:linkouFee}],dynamic:[]})[0]
assert.equal(linkou.vehicleAccess.car.state,'allowed')
assert.equal(linkou.vehicleAccess.heavy.state,'unmarked')
assert.equal(linkou.vehicleAccess.motorcycle.label,'重型機車種類待確認')
assert.match(linkou.vehicleAccess.heavy.reason,/重型機車計時20元/)
assert.match(linkou.heavyParking.label,/待確認/)
assert.equal(lotStatusRows(linkou).find(r=>r.key==='heavy').state,'unmarked')
assert.equal(vehicleAccess({fee:'普通重型機車計時20元'}).heavy.evidence,undefined)
assert.equal(vehicleAccess({fee:'大型重型機車計時20元'}).heavy.state,'allowed')
assert.equal(vehicleAccess({fee:'重型機車請洽管理員'}).heavy.evidence,undefined)
assert.equal(vehicleAccess({fee:'重型機車計時20元；禁止大型重機停放'}).heavy.state,'denied')

// 模擬 API 限制單頁筆數及末頁不足：短頁後仍須繼續到空頁。
const {pages}=await import('../server/data.mjs')
const requested=[]
const batches=[[{ID:'A'},{ID:'B'}],[{ID:'C'}],[]]
assert.deepEqual(await pages('https://example.test/json?keep=1',async url=>{
 const u=new URL(url);requested.push(Number(u.searchParams.get('page')))
 assert.equal(u.searchParams.get('keep'),'1')
 return Buffer.from(JSON.stringify(batches[Number(u.searchParams.get('page'))]))
}),batches.flat())
assert.deepEqual(requested,[0,1,2])
await assert.rejects(pages('https://example.test/json',async()=>Buffer.from('[{"ID":"A"}]')),/重複頁/)
await assert.rejects(pages('https://example.test/json',async()=>Buffer.from('{}')),/非陣列/)
console.log('PAYEX 車種歧義證據、實際場站案例、短頁後續分頁與重複頁防護檢查通過')

// 費率整理須保留完整原句、千分位、条件；混合車種不強拆。
const {feeSections}=await import('../src/parking-display.js')
const grouped=feeSections(linkouFee)
assert.deepEqual(grouped.map(g=>g.title),['汽車費率','月租／定期停車','身障優惠／收費','重型機車費率（官方用語）'])
assert.equal(grouped.find(g=>g.title==='重型機車費率（官方用語）').lines.length,2)
assert.deepEqual(grouped.flatMap(g=>g.lines).sort(),linkouFee.split(';').filter(Boolean).sort())
assert.deepEqual(feeSections('普通重型機車每小時20元')[0],{title:'一般機車費率',lines:['普通重型機車每小時20元']})
assert.equal(feeSections('大型重型機車計時20元')[0].title,'大型重機費率')
assert.equal(feeSections('汽車月租3,500元，限平日')[0].lines[0],'汽車月租3,500元，限平日')
assert.equal(feeSections('汽車30元、機車20元')[0].title,'備註')
assert.equal(feeSections('依現場公告')[0].title,'備註')
assert.deepEqual(feeSections(''),[])
console.log('收費原句保留、車種分組、千分位／優惠條件及混合段落備註檢查通過')

// 真正的 store 篩選驗證：中文、半形、全形路段數字互通，地名不改寫。
const {normalizeSearch}=await import('../src/parking-search.js')
setActivePinia(createPinia())
const searchStore=useParkingStore()
searchStore.scope='lot'
searchStore.records=[
 {id:'digit',scope:'lot',name:'明志停車場',address:'新北市泰山區明志路1段99號'},
 {id:'chinese',scope:'lot',name:'第二停車場',address:'明志路二段10號'},
 {id:'name',scope:'lot',name:'一心路停車場',address:'三重區一心路1號'}
]
for(const query of ['明志路1段','明志路一段','明志路１段',' 明志路 一 段 ']) {
 searchStore.keyword=query;assert.deepEqual(searchStore.filtered.map(p=>p.id),['digit'])
}
for(const query of ['明志路2段','明志路二段','明志路２段']) {
 searchStore.keyword=query;assert.deepEqual(searchStore.filtered.map(p=>p.id),['chinese'])
}
searchStore.keyword='一心路';assert.deepEqual(searchStore.filtered.map(p=>p.id),['name'])
searchStore.keyword='1心路';assert.equal(searchStore.filtered.length,0)
searchStore.keyword='明志路三段';assert.equal(searchStore.filtered.length,0)
searchStore.keyword='';assert.equal(searchStore.filtered.length,3)
assert.equal(normalizeSearch('三重區一心路十一段'),normalizeSearch('三重區一心路11段'))
assert.equal(normalizeSearch('明志路二十段'),normalizeSearch('明志路20段'))
assert.equal(normalizeSearch('明志路一百段'),'明志路一百段')
assert.equal(searchStore.records[0].address,'新北市泰山區明志路1段99號')
for(const row of lotStatusRows({scope:'lot'}))assert.doesNotMatch(row.reason,/更新.*伺服器/)
console.log('中文／阿拉伯／全形路段搜尋、地名與官方原址保留、民眾用語檢查通過')
