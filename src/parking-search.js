// 搜尋時統一路段數字，原始名稱／地址維持官方寫法。
// 僅轉換「段」前的數字，避免把三重、一心路等地名改成數字。
const digits={零:0,〇:0,一:1,二:2,兩:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9}
export function normalizeSearch(value='') {
 return String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'')
  .replace(/[零〇一二兩三四五六七八九十百千]+(?=段)/g,text=>{
   if(text.length===1&&text in digits)return String(digits[text])
   if(!/^[一二兩三四五六七八九]?十[一二三四五六七八九]?$/.test(text))return text
   const [tens,ones]=text.split('十')
   return String((tens?digits[tens]:1)*10+(ones?digits[ones]:0))
  })
  .replace(/[0-9]+(?=段)/g,text=>String(Number(text)))
}
