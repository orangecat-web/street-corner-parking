// 固定官方來源白名單；代理不接受使用者傳入任意網址。
export const SOURCES = {
  taipeiMotor: { label: '臺北市各行政區路邊收費路段資訊', url: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=86d2a8b6-c360-4349-956d-dd7771cccf91', page: 'https://data.taipei/dataset/detail?id=99392a71-4e8a-42e1-b605-20dfa7bb5f8c' },
  taipeiCar: { label: '臺北市路邊停車格位使用情形', url: 'https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_roadquery.xml', page: 'https://data.taipei/dataset/detail?id=434638ca-8770-42c1-940d-0386a74f6eb9' },
  newTaipeiFee: { label: '新北市路邊收費停車場收費路段資訊', url: 'https://data.ntpc.gov.tw/api/datasets/d9f18db5-41c7-41d4-b7f0-82a335255b08/json', page: 'https://data.ntpc.gov.tw/datasets/d9f18db5-41c7-41d4-b7f0-82a335255b08' },
  newTaipeiBay: { label: '新北市機車停車彎資訊', url: 'https://data.ntpc.gov.tw/api/datasets/68243cc9-706e-4bf5-96ba-979e0b90d1aa/json', page: 'https://data.ntpc.gov.tw/datasets/68243cc9-706e-4bf5-96ba-979e0b90d1aa' },
  newTaipeiCar: { label: '新北市路邊停車空位查詢', url: 'https://data.ntpc.gov.tw/api/datasets/54a507c4-c038-41b5-bf60-bbecb9d052c6/json', page: 'https://data.ntpc.gov.tw/datasets/54a507c4-c038-41b5-bf60-bbecb9d052c6' },
}
// 路外停車場：基本資料 + 動態車位以官方 ID 合併。
Object.assign(SOURCES, {
 taipeiLots:{label:'臺北市停車場資訊 V2＋剩餘車位',url:'https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json',dynamicUrl:'https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json',page:'https://data.taipei/dataset/detail?id=d5c0656b-5250-4179-a491-c94daa56ef2c'},
 newTaipeiLots:{label:'新北路外公共停車場＋汽車剩餘車位',url:'https://data.ntpc.gov.tw/api/datasets/b1464ef0-9c7c-4a6f-abf7-6bdf32847e68/json',dynamicUrl:'https://data.ntpc.gov.tw/api/datasets/e09b35a5-a738-48cc-b0f5-570b67ad9c78/json',page:'https://data.ntpc.gov.tw/datasets/b1464ef0-9c7c-4a6f-abf7-6bdf32847e68'},
})
