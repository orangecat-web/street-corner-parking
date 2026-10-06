import proj4 from 'proj4'
// TWD97 TM2 121 經帶 → WGS84；只有通過臺灣範圍驗證才畫圖釘。
const tw97='+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs'
export function coordinates(x,y) {
 const a=Number(x),b=Number(y)
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<100000||a>400000||b<2400000||b>2900000)return {lat:null,lng:null}
 const [lng,lat]=proj4(tw97,'EPSG:4326',[a,b])
 return lat>24&&lat<26&&lng>120&&lng<123?{lat,lng}:{lat:null,lng:null}
}
// 缺值／負值是未知；不把官方 -9 轉成 0，0 格也不宣稱能立即停入。
export const nonnegative=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null
export function buildingKind(text) {
 if(/地下|地下一|地下一層|B[1-9]/i.test(text))return '地下'
 if(/室內/.test(text))return '室內'
 if(/立體|機械/.test(text))return '立體'
 if(/平面/.test(text))return '平面'
 return '未註明'
}
