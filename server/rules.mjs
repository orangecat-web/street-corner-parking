// 政策查核日期：2026-10-06。只收錄一般格，排除身障、裝卸、警用等專用格。
export function eligible({ city, district, type, charge }) {
  if (type === 'car') return charge === 'paid'
  if (type !== 'motorcycle' && type !== 'heavy') return false
  if (charge === 'paid') return true
  return city === '新北市' && ['板橋區', '新店區'].includes(district)
}
export function feeFor(type, city) {
  if (type === 'car') return '依該路段汽車費率'
  return city === '臺北市' ? '計次 40 元；計時 20 元／小時，上限 100 元；限時格另依公告' : '30 元／4 小時（收費格）'
}
