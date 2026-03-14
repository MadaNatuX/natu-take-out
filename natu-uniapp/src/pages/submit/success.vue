<template>
  <view class="container">
    <template v-if="isDineInMode">
      <view class="dine_in_number_box">
        <view class="dine_in_label">堂食订单号</view>
        <view class="dine_in_number">{{ inNumberDisplay }}</view>
      </view>
      <view class="pay">支付成功</view>
      <view class="time">请留意叫号后取餐</view>
      <view class="success_desc"> 后厨正在为你准备餐品，请稍候片刻~ </view>
    </template>
    <template v-else>
      <image src="../../static/icon/饿饿.png" mode="scaleToFill" />
      <view class="pay">支付成功</view>
      <view class="time">预计{{ arrivalTime }}送达</view>
      <view class="success_desc"> 后厨疯狂备餐ing, 请耐心等待~ </view>
    </template>

    <view class="btn_box">
      <button class="return_btn" @click="toHome()">返回首页</button>
      <button class="detail_btn" @click="toDetail()">查看订单</button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {getOrderAPI} from '@/api/order'
import {isDineInOrder} from '@/utils/order'

const orderId = ref(0)
const arrivalTime = ref('')
const orderType = ref(1)
const inNumber = ref<number | null>(null)

const isDineInMode = computed(() => isDineInOrder(orderType.value))
const inNumberDisplay = computed(() => (inNumber.value === null || inNumber.value === undefined ? '--' : inNumber.value))

onLoad(async (options: any) => {
  orderId.value = Number(options.orderId)
  getHarfAnOur()

  if (!orderId.value) {
    return
  }

  const res = await getOrderAPI(orderId.value)
  orderType.value = res.data.orderType || 1
  inNumber.value = res.data.inNumber ?? null
})

const getHarfAnOur = () => {
  const date = new Date()
  date.setTime(date.getTime() + 3600000)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  arrivalTime.value = hours + ':' + minutes
}

const toHome = () => {
  uni.switchTab({
    url: '/pages/index/index'
  })
}

const toDetail = () => {
  uni.redirectTo({
    url: '/pages/orderDetail/orderDetail?orderId=' + orderId.value
  })
}
</script>

<style lang="less" scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 48rpx;
  box-sizing: border-box;
}

image {
  width: 300rpx;
  height: 300rpx;
}

.dine_in_number_box {
  width: 360rpx;
  min-height: 360rpx;
  border-radius: 40rpx;
  background: linear-gradient(180deg, #f5fcff 0%, #ffffff 100%);
  box-shadow: 0 18rpx 38rpx rgba(0, 170, 255, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.dine_in_label {
  font-size: 30rpx;
  color: #7b8794;
  letter-spacing: 6rpx;
}

.dine_in_number {
  margin-top: 28rpx;
  font-size: 140rpx;
  line-height: 1;
  font-weight: 700;
  color: #00aaff;
}

.pay {
  font-size: 32rpx;
  color: #333;
  text-align: center;
  margin-top: 80rpx;
}

.time {
  font-size: 28rpx;
  color: #0af;
  text-align: center;
  margin-top: 20rpx;
}

.success_desc {
  font-size: 28rpx;
  color: #666;
  text-align: center;
  margin-top: 50rpx;
}

.btn_box {
  display: flex;
  justify-content: space-around;
  margin-top: 100rpx;

  .return_btn {
    margin: 10px;
    width: 250rpx;
    height: 78rpx;
    line-height: 78rpx;
    border: #00aaff solid 1rpx;
    border-radius: 40rpx;
    color: #00aaff;
    font-size: 30rpx;
    text-align: center;
  }

  .detail_btn {
    margin: 10px;
    width: 250rpx;
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 40rpx;
    background: #00aaff;
    border: none;
    color: #fff;
    font-size: 30rpx;
    text-align: center;
  }
}
</style>

<style>
page {
  background-color: #f8f8f8;
}
</style>
