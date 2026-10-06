// 可停車種必須有場站本身的資料依據，不能把路邊政策套入路外場站。
// 格數為 0 表示沒有該種專用格，並非「禁止共用」；空位也不作為准入依據。
const names={car:'汽車',motorcycle:'一般機車',heavy:'大型重機'}
const tokens={car:'(?:汽車|小型車)',motorcycle:'(?:一般機車|普通機車|普通重型機車|機車)',heavy:'(?:大型重型機車|大型重機|大重機|大型重型)'}
const fareTypes={car:['C','CM'],motorcycle:['M'],heavy:['HM','CM']}
const unmarked=reason=>({state:'unmarked',label:'官方未標註',reason})

export function vehicleAccess({capacity={},fareRules=[],fee='',summary=''}={}) {
 const result={}
 // PAYEX 會以自由文字列車種費率。「重型機車」沒有區分大小重，保留原文證據。
 // 普通重型／大型重型已明確區分，不納入這項歧義。
 const ambiguousFee=fee.split(/[。；;\n，、]|,(?![0-9]{3}(?:[^0-9]|$))/).map(s=>s.trim()).find(s=>/(?<!普通)(?<!大型)重型機車[^，、]{0,40}(?:可停放|可停車|可進入|(?:計時|計次|月租)\s*[0-9,]+\s*元|[0-9]+\s*元\s*(?:／|\/|每)?\s*(?:時|小時|次|月)|每.{0,8}[0-9]+\s*元)/.test(s))
 for(const key of Object.keys(names)) {
  // 一般機車不得誤讀成大型重機；先移除大型重機文字再判定一般機車。
  const clean=s=>key==='motorcycle'?s.replace(new RegExp(tokens.heavy,'g'),'〈大型重機〉').replace(/(?<!普通)重型機車/g,'〈車種未明〉'):s
  const statements=clean(`${fee}；${summary}`).split(/[。；;\n]/).map(s=>s.trim()).filter(Boolean)
  const token=tokens[key]
  // 僅把完整、沒有附帶區域／時段條件的禁止句當成全場「不可停」。
  const denied=statements.find(s=>new RegExp(`^(?:本場|本停車場)?(?:(?:禁止|不開放|不提供|不允許)${token}(?:進入|停放|停車)|${token}(?:禁止|不得|不可)(?:進入|停放|停車))$`).test(s))
  if(denied){result[key]={state:'denied',label:'不可停',reason:`官方明列：${denied}`};continue}
  // 條件性限制不可省略成「可以」或擴張成「全場禁止」，留待人工核對。
  const restricted=statements.find(s=>new RegExp(`(?:${token}.{0,24}(?:禁止|不得|不可|不開放|不提供|不允許)|(?:禁止|不得|不可|不開放|不提供|不允許).{0,24}${token})`).test(s))
  if(restricted){result[key]=unmarked(`官方文字有條件或限制，未確認全場可停：${restricted}`);continue}
  const rules=fareRules.filter(r=>fareTypes[key].includes(r.ParkingType))
  const total=capacity[key]
  if(rules.length) {
   const monthlyOnly=rules.every(r=>['3','5','6','7','8'].includes(String(r.RateType)))
   const codes=[...new Set(rules.map(r=>r.ParkingType))].join('／')
   result[key]={state:'allowed',label:monthlyOnly?'可停（臨停未標註）':'可停',reason:`官方車種費率 ${codes}${key==='heavy'&&rules.some(r=>r.ParkingType==='CM')?'（小型車含大型重機；使用場方指定格位）':''}；${monthlyOnly?'僅列月租／定期費率，臨停是否開放未標註':'停放區及營運限制依場方公告'}`}
  } else if(Number.isFinite(total)&&total>0) {
   result[key]={state:'allowed',label:'可停',reason:`官方列有${names[key]}格 ${total} 格；月租、營業時間及停放區依場方公告`}
  } else {
   // 自由文字須明列車種及可停敘述／具體費率，僅出現車種名稱並不足夠。
   const feeStatements=statements.flatMap(s=>s.split(/，|、|,(?![0-9]{3}(?:[^0-9]|$))/))
   const explicit=feeStatements.find(s=>new RegExp(`${token}[^，、]{0,40}(?:可停放|可停車|可進入|(?:計時|計次|月租)\\s*[0-9,]+\\s*元|[0-9]+\\s*元\\s*(?:／|/|每)?\\s*(?:時|小時|次|月)|每.{0,8}[0-9]+\\s*元)`).test(s))
   const monthlyText=explicit&&/月租/.test(explicit)&&!/(?:計時|計次|可停放|可停車|可進入)/.test(explicit)
   result[key]=explicit?{state:'allowed',label:monthlyText?'可停（臨停未標註）':'可停',reason:`官方停放／費率說明：${explicit}${monthlyText?'；僅列月租費率，臨停未標註':''}`}:
    ambiguousFee&&['heavy','motorcycle'].includes(key)?{state:'unmarked',label:'重型機車種類待確認',reason:`官方收費載明：${ambiguousFee}；未區分普通或大型重型機車，也未明列共用／專用格，請向場方確認`,evidence:'ambiguous-heavy-fee'}:
    unmarked(total===0?'官方總格數為 0，未明列可共用格位或禁止停放；不能據此判定不可停':'官方未提供該車種格數、明確停放規定或車種費率')
  }
 }
 return result
}

export function lotVehicleKind(name,capacity={}) {
 if(/(?:^|[^汽])機車(?:專用)?停車場/.test(name||''))return {label:'機車停車場',basis:'官方場站名稱',motorcycleLot:true}
 if(capacity.car===0&&(capacity.motorcycle||0)>0)return {label:'機車格停車場',basis:'官方列機車格，汽車格為 0；不推定大型重機可停',motorcycleLot:true}
 if((capacity.car||0)>0&&(capacity.motorcycle||0)>0)return {label:'汽機車停車場',basis:'官方列汽車及一般機車格',motorcycleLot:false}
 return {label:'停車場',basis:'車種請看各別官方標示',motorcycleLot:false}
}
