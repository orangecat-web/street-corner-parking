import {nonnegative} from './lots.mjs'
const monthlyTypes={3:'月票',5:'雙月票',6:'季租',7:'半年租',8:'年租'}
const vehicles={C:'汽車',CM:'汽車／大型重機',M:'一般機車',HM:'大型重機',T:'大客車'}

// 月租費率不代表尚有可申請名額；臨停與月租的可停資格分開呈現。
export function monthlyInfo(fee='',fareRules=[]) {
 const clauses=fee.split(/[。；;\n]/).filter(s=>/月租|月票|季租|年租|半年租|定期票/.test(s))
 if(clauses.some(s=>/^(?:本場|本停車場)?(?:不提供|不開放|無)月租(?:服務)?$/.test(s.trim())))
  return {state:'denied',label:'不提供月租',reason:clauses.join('；'),details:clauses}
 const structured=fareRules.filter(r=>monthlyTypes[String(r.RateType)])
 const details=structured.map(r=>`${vehicles[r.ParkingType]||'車種未標註'}：${monthlyTypes[r.RateType]}${nonnegative(r.ParkingRates)!==null?` ${r.ParkingRates} 元`:''}`)
 const priced=clauses.filter(s=>/(?:月租|月票|季租|年租|半年租|定期票).*?[0-9,]+\s*元|[0-9,]+\s*元\s*[/／]\s*月/.test(s))
 if(structured.length||priced.length) {
  const restricted=clauses.some(s=>/暫停|停止|額滿|不開放|候補/.test(s))
  return {state:restricted?'unmarked':'allowed',label:restricted?'月租申請狀態待確認':'有月租／定期費率',reason:'官方有月租／定期費率；車種、資格、名額與申請方式依場方公告',details:[...details,...clauses]}
 }
 return {state:'unmarked',label:'月租未標註',reason:clauses.join('；')||'官方未提供明確月租費率或是否開放月租',details:clauses}
}

// 只擷取明確寫在車種概況中的身障格數，不把身障優惠費率當成有專用格。
export function disabilityInfo(summary='',available=null) {
 const car=summary.match(/(?:小型車|汽車)[^，、,；;。]*?(?:身心障礙|身障)(?:專用)?(?:停車位|停車格位|停車格|格位|車位)?\s*[:：]?\s*([0-9]+)\s*格/)
 const motorcycle=summary.match(/(?<!型)機車[^，、,；;。]*?(?:身心障礙|身障)(?:專用)?(?:停車位|停車格位|停車格|格位|車位)?\s*[:：]?\s*([0-9]+)\s*格/)
 const counts={car:car?Number(car[1]):null,motorcycle:motorcycle?Number(motorcycle[1]):null}
 const a=nonnegative(available)
 if(counts.car===0&&counts.motorcycle===0&&a>0)return {...counts,available:a,state:'unmarked',label:'身障格資料有衝突',reason:'概況列兩車種身障格為 0，但即時來源回報正空位，請向場方核對'}
 const any=Object.values(counts).some(n=>n>0)||a!==null&&a>0
 const none=counts.car===0&&counts.motorcycle===0&&!(a>0)
 return {...counts,available:a,state:any?'allowed':none?'denied':'unmarked',label:any?'有身障專用格':none?'官方列兩車種身障格均為 0':'身障格未標註',reason:any?'官方概況列有身障格，或官方回報身障空位；專用格須符合現場使用資格':none?'官方概況明列汽車與機車身障格均為 0':'資料未完整標示各車種身障格，未標註不代表沒有'}
}

export function heavyParkingInfo({capacity={},access={},fareRules=[],fee='',summary=''}={}) {
 if(access.heavy?.state==='unmarked'&&access.heavy.evidence==='ambiguous-heavy-fee')return {label:'重型機車種類／停放區待確認',reason:access.heavy.reason}
 if(access.heavy?.state!=='allowed')return {label:access.heavy?.state==='denied'?'不可停':'停放區官方未標註',reason:access.heavy?.reason||'沒有明確大型重機停放依據'}
 const shared=fareRules.some(r=>r.ParkingType==='CM')||/(?:大型重型機車|大型重機|大重機)[^，；;。]{0,20}(?:停放|使用)[^，；;。]{0,10}(?:汽車格|小型車格)/.test(`${fee}；${summary}`)
 const dedicated=capacity.heavy
 if(dedicated>0)return {label:shared?'有大重專用格／亦有汽車格共用費率':'有大重專用格',reason:`官方列大型重機格 ${dedicated} 格${shared?'，並列小型車含重機（CM）費率或汽車格共用說明':''}；實際格位依場方指示`}
 if(shared)return {label:'使用汽車格',reason:`官方明列汽車格共用／小型車含大型重機費率；${dedicated===0?'大型重機專用格為 0':'專用格數未標註'}，不能把汽車空位當成大重專用格空位`}
 return {label:dedicated===0?'可停，但沒有大重專用格':'可停，專用格數未標註',reason:'官方有大型重機停放依據，但未說明停放區；不能自行推定使用汽車格或一般機車格'}
}
