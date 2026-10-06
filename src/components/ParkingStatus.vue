<script setup>
import {lotStatusRows} from '../parking-display'
defineProps({parking:{type:Object,required:true}})
</script>
<template lang="pug">
.status-line(aria-label="車種、月租及身障格資訊")
  span.status-item(v-for="row in lotStatusRows(parking)" :key="row.key" :title="`${row.vehicle}：${row.label}。${row.reason}`" :aria-label="`${row.vehicle}：${row.label}。${row.reason}`" role="img")
    span.status-dot(:class="row.state" aria-hidden="true")
    span(aria-hidden="true") {{ row.short }}
</template>
