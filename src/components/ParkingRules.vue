<template lang="pug">
main.rules-page(aria-labelledby="rules-heading")
  a.rules-back(href="#") ← 返回停車查詢
  .eyebrow PARKING GUIDE
  h1#rules-heading(tabindex="-1") 停放規則
  p.rules-lead 一般機車、汽車與大型重機的停車選擇。政策查核：2026/10/06。
  nav.rules-jump(aria-label="城市規則")
    a(href="#taipei-rules" @click.prevent="($event.target.ownerDocument.getElementById('taipei-rules')).scrollIntoView({behavior:'smooth'})") 臺北市
    a(href="#newtaipei-rules" @click.prevent="($event.target.ownerDocument.getElementById('newtaipei-rules')).scrollIntoView({behavior:'smooth'})") 新北市
  .rules-columns
    section#taipei-rules.rules-city
      .eyebrow TAIPEI
      h2 臺北市
      h3 大型重機停機車格
      p 自 2026/10/06 起，全面試辦開放公有路邊「已公告收費」機車格；僅於一般機車可停放時段內停放，禁止停車時段除外。
      p 未納入收費的巷弄機車格，不在本次大型重機開放範圍。一般機車則依該格位公告停放。
      h3 大型重機費率
      ul
        li 一般計次格：40 元／次。
        li 一般計時格：20 元／小時，當日上限 100 元。
        li 限時格：首次第 1–20 分鐘 0 元；第 21–40 分鐘 40 元；第 41 分鐘起已超時，屬違規停車。
      h3 車身與汽車格
      p 可採斜向停放 2 個機車格位的方式。大型重機也可選擇一般汽車停車格，按該格汽車費率計收。
      a(href="https://pma.gov.taipei/News_Content.aspx?n=C367863C93700356&s=6E0F2593F02B9BE6&sms=72544237BBE4C5F6" target="_blank" rel="noopener noreferrer") 臺北市官方公告 ↗
    section#newtaipei-rules.rules-city
      .eyebrow NEW TAIPEI
      h2 新北市
      h3 大型重機停機車格
      p 自 2026/07/01 起，全市路邊收費機車格開放大型重機停放。
      p 板橋、新店自 2025/08/01 起已試辦開放路邊機車格，含未收費格；仍須核對格位用途及現場公告。其他行政區的未收費機車格，不直接套用這項開放規則。
      h3 大型重機費率與格線
      ul
        li 收費機車格：30 元／4 小時。
        li 車身不得超出格線；車身較長可跨 2 格，但仍須停妥於格線範圍內。
        li 行駛及停放須依現場規定；開放機車格不代表可在人行道、騎樓騎乘。
      h3 汽車格與專用格
      p 大型重機可使用一般汽車停車格，依現場汽車收費公告。警用、裝卸、身障等專用格須符合指定用途，本網站不列作一般停車選項。
      a(href="https://www.traffic.ntpc.gov.tw/home.jsp?act=be4f48068b2b0031&dataserno=99345bcf365b8f6ed7a6315705335638&id=54fa46e9e522dde4&mserno=39e5192ff77897e0ae099c1886ca9b09" target="_blank" rel="noopener noreferrer") 全市收費機車格公告 ↗
      a(href="https://www.ntpc.gov.tw/ch/home.jsp?dataserno=e67df85beb4d6cf8fecd88ffc563e4a0&id=e8ca970cde5c00e1" target="_blank" rel="noopener noreferrer") 板橋、新店試辦公告 ↗
  section.rules-city.rules-common
    h2 看資料時，留意這幾件事
    ul
      li 本版「機車共用格」指一般機車與大型重機皆可使用的收錄格位，不表示所有機車格都開放大型重機。
      li 已公告收費的路段，在非收費時段不會變成另一種「免費格」；停車時段仍看牌面。
      li 板橋、新店的停車彎來源未提供收費欄位，顯示「收費待確認」；官方明列不收費的格位才標為免費。
      li 格號是格位編號；總格數是供給數；剩餘數是官方空位回報。未知不代表 0 格。
      li 地下、室內等路外停車場依場方規定；路邊政策不直接套用。大型重機篩選只列明確提供重機格或費率的場站。
      li 可停不代表有空位；月租不代表有申請名額。身障格綠點表示官方列有專用格，仍須符合現場使用資格。
      li 一般機車格不等於大型重機共用格；大重專用格為 0 也不等於不能停汽車共用格。
      li 新北即時來源欄位定義為汽車剩餘數；機車及大型重機空位未提供，不將汽車欄轉作其他車種空位。
      li 室內／地下依官方名稱、地址與概況辨識，立體不等於一定有遮蔽。
      li 綠點表示可停／有此資訊，黃點表示尚未確認，紅點表示明確不可停／無。詳細依據可展開場站的「官方原文與判定依據」。
      li 收費標準按官方原文整理；只寫「重型機車」時保留官方用語，不推定是普通或大型重機。無法拆清楚的段落放在備註，完整公告仍可展開查看。
    p 停車前請確認現場標誌、標線、專用用途、禁停時段與費率；公告異動以主管機關最新資訊為準。
</template>

<style lang="sass" scoped>
.rules-page
  max-width: 1120px
  margin: auto
  padding: 32px 24px 64px
  line-height: 1.8
  h1
    font-size: 36px
  h2
    font-size: 26px
  h3
    margin: 22px 0 8px
  p + p
    margin-top: 12px
  a
    display: inline-block
    margin: 12px 16px 12px 0
.rules-lead
  color: #aebbc4
.rules-jump
  display: flex
  gap: 20px
.rules-columns
  display: grid
  grid-template-columns: repeat(2, minmax(0, 1fr))
  gap: 24px
.rules-city
  border: 1px solid #394851
  border-radius: 16px
  padding: 24px
  scroll-margin-top: 24px
  ul
    padding-left: 24px
  li
    margin-bottom: 8px
.rules-common
  margin-top: 24px
@media (max-width: 800px)
  .rules-columns
    grid-template-columns: 1fr
  .rules-page
    padding: 20px 16px 40px
</style>
