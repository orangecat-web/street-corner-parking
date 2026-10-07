// 呈現時依車種挑選正確欄位，避免把汽車空位顯示成機車或重機空位。
export const vehicleNames={car:'汽車',motorcycle:'一般機車',heavy:'大型重機'}
export function displayVehicle(p,vehicle='全部') {
 if(p.scope==='lot'&&vehicle!=='全部')return vehicle
 if(p.scope==='lot')return ['car','motorcycle','heavy'].find(k=>(p.capacity?.[k]||0)>0)||'car'
 return p.type==='car'?'car':p.type==='heavy'?'heavy':'motorcycle'
}
export function spaceSummary(p,vehicle='全部') {
 const kind=displayVehicle(p,vehicle)
 return {kind,label:vehicleNames[kind],total:p.scope==='lot'?p.capacity?.[kind]??null:p.total,
 available:p.scope==='lot'?p.vacancy?.[kind]??null:p.type==='car'?p.available:null}
}
export function matchesVehicle(p,vehicle) {
 if(vehicle==='全部')return true
 if(p.scope==='lot')return accessRows(p).find(row=>row.key===vehicle)?.state==='allowed'
 return vehicle==='heavy'?true:vehicle==='car'?p.type==='car':p.type==='motorcycle'
}
export function vacancyTone(s) {
 if(s.available===null||s.total===null||s.total<=0)return 'unknown'
 const used=1-s.available/s.total
 return used>=.95?'busy':used>=.8?'limited':'open'
}

// 舊版 API 沒有逐車種判定時，不沿用無依據的重機布林值。
export function accessRows(p) {
 return Object.entries(vehicleNames).map(([key,label])=>({key,vehicle:label,...(p.vehicleAccess?.[key]||((p.capacity?.[key]||0)>0?{state:'allowed',label:'可停',reason:`官方列有該車種格位 ${p.capacity[key]} 格；其他營運限制依場方公告`}:{state:'unmarked',label:'官方未標註',reason:'尚無明確車種依據，請向場方確認'}))}))
}
export function lotKind(p) {
 if(p.lotVehicleKind)return p.lotVehicleKind
 if(/(?:^|[^汽])機車(?:專用)?停車場/.test(p.name||''))return {label:'機車停車場',basis:'官方場站名稱',motorcycleLot:true}
 if(p.capacity?.car===0&&(p.capacity?.motorcycle||0)>0)return {label:'機車格停車場',basis:'官方格數；大型重機需另看明確標示',motorcycleLot:true}
 return {label:'停車場',basis:'車種請看各別官方標示',motorcycleLot:false}
}

// 列表只用一行色點；完整狀態透過 accessible name／提示及詳情提供。
export function lotStatusRows(p) {
 const short={car:'汽車',motorcycle:'機車',heavy:'大重'}
 const rows=accessRows(p).map(row=>({...row,short:short[row.key],state:row.label.includes('臨停未標註')?'unmarked':row.state}))
 const unknown={state:'unmarked',label:'官方未標註',reason:'官方資料尚未提供此項資訊，請向場方確認'}
 return [...rows,{key:'monthly',short:'月租',vehicle:'月租',...(p.monthlyInfo||unknown)},{key:'disability',short:'身障',vehicle:'身障專用格',...(p.disability||unknown)}]
}

// 只整理官方原文，不猜測價格／車種。混合車種或拆不清楚的段落留在備註。
// 不切逗號，避免破壞千分位、時段、優惠條件及同一段落的上下文。
export function feeSections(fee='') {
 const groups=new Map()
 for(const clause of String(fee).split(/[；;\n]/).map(s=>s.trim()).filter(Boolean)) {
  const car=/(?:汽車|小型車)/.test(clause)
  const heavy=/(?:大型重型機車|大型重機|大重機)/.test(clause)
  const ambiguous=/(?<!普通)(?<!大型)重型機車/.test(clause)
  const motorcycle=/(?:普通重型機車|普通機車|一般機車|機車)/.test(clause.replace(/(?:大型重型機車|大型重機|大重機|(?<!普通)重型機車)/g,''))
  const kinds=[car,heavy,ambiguous,motorcycle].filter(Boolean).length
  let title='備註'
  if(kinds<=1) {
   if(/身障|身心障礙/.test(clause))title='身障優惠／收費'
   else if(/月租|月票|季租|年租|半年租|定期票/.test(clause))title='月租／定期停車'
   else if(heavy)title='大型重機費率'
   else if(ambiguous)title='重型機車費率（官方用語）'
   else if(motorcycle)title='一般機車費率'
   else if(car)title='汽車費率'
  }
  if(!groups.has(title))groups.set(title,[])
  groups.get(title).push(clause)
 }
 return [...groups].map(([title,lines])=>({title,lines}))
}
