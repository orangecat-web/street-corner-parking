import { XMLParser } from 'fast-xml-parser'
import AdmZip from 'adm-zip'
import { feeFor, eligible } from './rules.mjs'
import { SOURCES } from './sources.mjs'
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false })
const list = x => Array.isArray(x) ? x : x ? [x] : []
const districts = ['板橋','三重','中和','永和','新莊','新店','樹林','鶯歌','三峽','淡水','汐止','瑞芳','土城','蘆洲','五股','泰山','林口','深坑','石碇','坪林','三芝','石門','八里','平溪','雙溪','貢寮','金山','萬里','烏來']
const base = (source, id, city, district, name, type, charge) => ({ id: `${source}-${id}`, city, district, name, type, charge, source, sourceUrl: SOURCES[source].page, lat: null, lng: null, available: null, total: null, fee: feeFor(type, city), schedule: '依現場公告', note: '', locationPrecision: 'address', scope: 'street', spaceId: null, ordinaryFee: null })
// 官方標成 CSV，實際回傳 ODS：依 ZIP 檔頭解析，保留重複的空白欄位。
export function taipeiMotor(buffer) {
  const zip = new AdmZip(buffer)
  const doc = parser.parse(zip.readAsText('content.xml'))
  const tables = list(doc['office:document-content']['office:body']['office:spreadsheet']['table:table'])
  const out = []
  for (const table of tables) for (const row of list(table['table:table-row'])) {
    const cells = []
    for (const c of list(row['table:table-cell'])) {
      const text = list(c['text:p']).map(x => typeof x === 'object' ? x['#text'] || '' : x).join(' ')
      for (let i = 0; i < Math.min(Number(c['@_table:number-columns-repeated'] || 1), 12); i++) cells.push(text)
    }
    if (!/^\d+$/.test(cells[6] || '') || Number(cells[6]) <= 0 || !cells[0]) continue
    const p = base('taipeiMotor', out.length, '臺北市', '未提供行政區', cells[0], 'motorcycle', 'paid')
    p.address = `臺北市${cells[0]}`; p.range = cells[1]; p.total = Number(cells[6]); p.ordinaryFee = `${cells[8]} 元／次（一般機車；依現場）`; p.schedule = `星期 ${cells[9]}，${cells[7]} 時`
    p.note = '來源為收費路段清冊（2026-03-27），未提供精準座標；一般機車費率不等於大型重機費率。新制及路段異動請核對現場。'
    out.push(p)
  }
  if (!out.length) throw new Error('機車收費路段資料格式變更，未取得有效資料')
  return out
}
export function taipeiCar(buffer) {
  const roads = list(parser.parse(buffer.toString()).DATA.ROAD)
  return roads.filter(r => r.roadSegCarType === '1' && Number.parseFloat(r.roadSegFee) > 0).map(r => {
    const p = base('taipeiCar', r.roadSegID, '臺北市', '未提供行政區', r.roadSegName, 'car', 'paid')
    p.address = `臺北市${p.name}`; p.fee = `${r.roadSegFee}（汽車；計價單位依現場）`; p.schedule = `${r.roadSegtimeStart}–${r.roadSegtimeEnd}`
    p.total = Number(r.roadSegTotalValue) || null; p.available = Number(r.roadSegAvail) >= 0 ? Number(r.roadSegAvail) : null; p.updatedAt = r.roadSegUpdatetime
    p.note = '此為汽車格空位資訊；部分路段無感測資料，未知值不視為 0。'
    return p
  })
}
export function newTaipeiFee(rows) {
  return rows.filter(r => /機車收費/.test(r.area)).map((r,i) => {
    const district = r.area.match(/^(.+?區)/)?.[1] || '未提供行政區'
    const type = /大型重型/.test(r.area) ? 'heavy' : 'motorcycle'
    const p = base('newTaipeiFee', i, '新北市', district, r.road_name, type, 'paid')
    p.address = `${p.city}${district}${p.name}`; p.ordinaryFee = type==='motorcycle' ? r.rates : null
    p.schedule = `平日 ${r.weekdays_time}；六 ${r['sat._charging_time']}；日 ${r['sun._charging_time']}；國定假日 ${r.national_holidays_charging_time}`
    p.note = '官方提供路段名稱，沒有格位座標；未收費時段仍屬已公告收費路段。'
    return p
  })
}
export function newTaipeiBay(rows) {
  return rows.filter(r => ['板橋','新店'].includes(r.area) && /^\d+$/.test(r.parking_lots1quantity) && Number(r.parking_lots1quantity)>0 && !/警|專用/.test(r.address)).map((r,i) => {
    const p = base('newTaipeiBay', i, '新北市', `${r.area}區`, r.address, 'motorcycle', 'unknown')
    p.address = `${p.city}${p.district}${r.address}`; p.total = Number(r.parking_lots1quantity)
    p.note = '板橋、新店含未收費路邊機車格；此 API 未提供收費欄位，不能宣稱本格免費。未收錄身障格位。'
    return p
  })
}
export function newTaipeiCar(rows) {
  return rows.filter(r => ['汽車停車位','機車停車位'].includes(r.name) && /收|免費/.test(r.pay)).map(r => {
    const district = `${districts[(Number(r.areacode)-65000000)/10-1] || '未知'}區`
    const p = base('newTaipeiCar', r.id, '新北市', district, `${r.roadname}・${r.cellid} 號格`, r.name==='機車停車位'?'motorcycle':'car', /不收費|免費/.test(r.pay)?'free':'paid')
    p.address = `${p.city}${district}${r.roadname}`; p.fee = p.type==='car'?r.paycash:feeFor(p.type,p.city); p.schedule = `${r.day} ${r.hour}`; p.total = 1; p.spaceId = r.cellid; p.ordinaryFee = p.type==='motorcycle'?r.paycash:null
    const lat = Number(r.latitude), lng = Number(r.longitude)
    if (lat>24 && lat<26 && lng>120 && lng<123) { p.lat=lat; p.lng=lng; p.locationPrecision='coordinate' }
    // 未取得狀態代碼完整定義，保留未知，避免將停用格／未知感測當成空位。
    if(p.charge==='free'){p.fee='免費（官方標示不收費）';p.ordinaryFee='免費（官方標示不收費）'}
    p.note = p.charge==='free'?'官方標示不收費；僅收錄板橋、新店一般機車格。空位未知，依現場格位用途與公告停放。':'空位狀態本版不解讀；地圖使用官方座標。汽車格依汽車費率，機車格依大型重機費率。'
    return p
  }).filter(eligible)
}

// 路外停車場空位只能套用到同 ID、同車種；一般機車空位不可當大型重機空位。
import {coordinates, nonnegative, buildingKind} from './lots.mjs'
import {vehicleAccess,lotVehicleKind} from './vehicle-access.mjs'
import {monthlyInfo,disabilityInfo,heavyParkingInfo} from './lot-features.mjs'
export function taipeiLots(data) {
 const dynamics=new Map((data.dynamic?.data?.park||[]).map(r=>[String(r.id),r]))
 return (data.static?.data?.park||[]).map(r=>{
  const p=base('taipeiLots',r.id,'臺北市',r.area||'未提供行政區',r.name,'lot','unknown')
  const d=dynamics.get(String(r.id))
  Object.assign(p,coordinates(r.tw97x,r.tw97y))
  p.scope='lot';p.address=r.address;p.schedule=r.serviceTime||'依現場公告';p.fee=r.payex||'依現場公告';p.tel=r.tel
  p.facility=buildingKind(`${r.name} ${r.address} ${r.summary}`)
  p.capacity={car:nonnegative(r.totalcar),motorcycle:nonnegative(r.totalmotor),heavy:nonnegative(r.totallargemotor)}
  p.vacancy={car:nonnegative(d?.availablecar),motorcycle:nonnegative(d?.availablemotor),heavy:nonnegative(d?.availableheavymotor)}
  p.vehicleAccess=vehicleAccess({capacity:p.capacity,fareRules:r.FareInfo?.FareRule||[],fee:r.payex||'',summary:r.summary||''})
  p.lotVehicleKind=lotVehicleKind(p.name,p.capacity)
  p.monthlyInfo=monthlyInfo(r.payex||'',r.FareInfo?.FareRule||[])
  p.disability=disabilityInfo(r.summary||'',d?.availablehandicap)
  p.heavyParking=heavyParkingInfo({capacity:p.capacity,access:p.vehicleAccess,fareRules:r.FareInfo?.FareRule||[],fee:r.payex||'',summary:r.summary||''})
  p.heavyConfirmed=p.vehicleAccess.heavy.state==='allowed'
  p.updatedAt=d?data.dynamic.data.UPDATETIME:null
  p.note='路外停車場依場方規定；路邊機車格政策不直接套用。車位數依車種分開，負值／未提供均顯示未知。'
  return p
 }).filter(p=>Object.values(p.capacity).some(n=>n>0))
}
export function newTaipeiLots(data) {
 const dynamics=new Map((data.dynamic||[]).map(r=>[String(r.ID),r]))
 return data.static.map(r=>{
  const p=base('newTaipeiLots',r.ID,'新北市',r.AREA||'未提供行政區',r.NAME,'lot','unknown')
  const d=dynamics.get(String(r.ID))
  Object.assign(p,coordinates(r.TW97X,r.TW97Y))
  p.scope='lot';p.address=r.ADDRESS;p.schedule=r.SERVICETIME||'依現場公告';p.fee=r.PAYEX||'依現場公告';p.tel=r.TEL
  p.facility=buildingKind(`${r.NAME} ${r.ADDRESS} ${r.SUMMARY}`)
  p.capacity={car:nonnegative(r.TOTALCAR),motorcycle:nonnegative(r.TOTALMOTOR),heavy:null}
  p.vacancy={car:nonnegative(d?.AVAILABLECAR),motorcycle:null,heavy:null}
  p.vehicleAccess=vehicleAccess({capacity:p.capacity,fee:r.PAYEX||'',summary:r.SUMMARY||''})
  p.lotVehicleKind=lotVehicleKind(p.name,p.capacity)
  p.monthlyInfo=monthlyInfo(r.PAYEX||'')
  p.disability=disabilityInfo(r.SUMMARY||'')
  p.heavyParking=heavyParkingInfo({capacity:p.capacity,access:p.vehicleAccess,fee:r.PAYEX||'',summary:r.SUMMARY||''})
  p.heavyConfirmed=p.vehicleAccess.heavy.state==='allowed'
  p.note='新北即時 API 僅提供汽車剩餘數；機車及大型重機空位未提供。室內／地下依名稱與地址辨識，立體不等於一定有遮蔽。'
  return p
 }).filter(p=>Object.values(p.capacity).some(n=>n>0))
}
