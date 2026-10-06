import axios from 'axios'
// 對自己的 API 代理請求，避免新北官方 CORS 限制；不是讀本地樣本 JSON。
export const sourceKeys=['taipeiMotor','taipeiCar','newTaipeiFee','newTaipeiBay','newTaipeiCar','taipeiLots','newTaipeiLots']
export async function fetchParking(key) {
  const {data}=await axios.get(`/api/parking/${key}`,{timeout:120000})
  return data
}
