<template>
  <view class="order_content">
    <scroll-view class="order_content_box" scroll-y scroll-top="0rpx">
      <view v-if="isTakeoutMode" class="new_address">
        <view class="top" @click="goAddress">
          <view v-if="!address" class="address_name_disabled"> 请选择收货地址 </view>
          <view v-else class="address_name">
            <view class="address">
              <text class="tag" :class="'tag' + trans(label as string)"> {{ label || '其他' }} </text>
              <text class="word">{{ address }}</text>
            </view>
            <view class="name">
              <text class="name_1">{{ consignee }}</text>
              <text class="name_2">{{ phoneNumber }}</text>
            </view>
          </view>
          <view class="address_image">
            <image class="to_right" src="../../static/icon/toRight.png"></image>
          </view>
        </view>
        <view class="bottom">
          <text class="word_bottom">预计{{ arrivalTime }}送达</text>
        </view>
      </view>
      <view v-else class="new_address dine_in_notice">
        <view class="mode_badge">堂食</view>
        <view class="mode_title">堂食订单，无需填写配送信息</view>
        <view class="mode_desc">支付完成后会展示堂食订单号，请留意取餐叫号。</view>
      </view>

      <view class="order_list_cont">
        <view class="order_list">
          <view class="word_text">
            <text class="word_style">订单明细</text>
          </view>
          <view class="order-type">
            <view class="type_item" v-for="(obj, index) in cartList" :key="index">
              <view class="dish_img">
                <image mode="aspectFill" :src="obj.pic" class="dish_img_url"></image>
              </view>
              <view class="dish_info">
                <view class="dish_name"> {{ obj.name }} </view>
                <view v-if="obj.dishFlavor" class="dish_flavor"> {{ obj.dishFlavor }} </view>
                <view class="dish_amount">
                  <text v-if="obj.number && obj.number > 0" class="dish_number">x {{ obj.number }}</text>
                </view>
                <view class="dish_price"> <text class="ico">￥</text> {{ obj.amount }} </view>
              </view>
            </view>
            <view class="word_text" v-if="isTakeoutMode">
              <view class="word_left">打包费</view>
              <view class="word_right">￥{{ packAmount }}</view>
            </view>
            <view class="word_text" v-if="isTakeoutMode">
              <view class="word_left">配送费</view>
              <view class="word_right">￥{{ deliveryFee }}</view>
            </view>
            <view class="all_price">
              <text class="word_right">总价 ￥{{ displayTotalPrice }}</text>
            </view>
          </view>
        </view>

        <view class="order_list">
          <view class="bottom_text" @click="goRemark">
            <view class="text_left">备注</view>
            <view class="text_right">{{ remark || '选择口味等' }}</view>
            <view class="right_image">
              <image class="to_right" src="../../static/icon/toRight.png"></image>
            </view>
          </view>
          <view class="bottom_text" @click="chooseCooker">
            <view class="text_left">餐具份数</view>
            <view class="text_right">{{ getCookerInfo() }}</view>
            <view class="right_image">
              <image class="to_right" src="../../static/icon/toRight.png"></image>
            </view>
          </view>
          <view class="bottom_text">
            <view class="text_left">发票</view>
            <view class="text_right">本店不支持线上发票，请致电商家提供</view>
          </view>
        </view>
      </view>
      <view class="blank"></view>
    </scroll-view>

    <view class="footer_order_buttom order_form">
      <view class="order_number">
        <image src="../../static/images/cart_active.png" class="order_number_icon"></image>
        <view class="order_dish_num"> {{ cartItemCount }} </view>
      </view>
      <view class="order_price"> <text class="ico">￥ </text> {{ displayTotalPrice }}</view>
      <view class="order_but">
        <view class="order_but_rit" @click="payOrderHandle()"> 去支付 </view>
      </view>
    </view>
    <view class="mask-box"></view>

    <view class="pop_mask" v-show="openCooker" @click="openCooker = !openCooker">
      <view class="cook_pop" @click.stop="openCooker = openCooker">
        <view class="top_title">
          <view class="title"> 选择餐具份数 </view>
          <view class="tips"> 应监管条例要求，商家不能主动提供一次性餐具 </view>
          <view class="close" @click="closeMask">
            <image src="../../static/icon/close.png" class="close_img" />
          </view>
        </view>
        <picker-view class="picker" indicator-style="height: 50px;" :value="selectedCookerIndex" @change="pickerChange">
          <picker-view-column>
            <view v-for="item in cookers" :key="item" style="line-height: 50px; text-align: center">
              {{ item === -1 ? '无需餐具' : item === 0 ? '商家依据餐量提供' : item === 11 ? '10份以上' : item + '份' }}
            </view>
          </picker-view-column>
        </picker-view>
        <view class="comfirm">
          <view class="after_action">
            <label class="checkbox">
              <radio class="radio" color="#00aaff" value="cb" :checked="radioStatus" @click="radioChange" />
              {{ cookerNum === -2 || cookerNum === -1 ? '以后都无需餐具' : '以后都需要餐具，商家依据餐量提供' }}
            </label>
            <button class="comfirm_btn" @click="confirmCooker">确定</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {onLoad, onShow} from '@dcloudio/uni-app'
import {getDefaultAddressAPI} from '@/api/address'
import {getCartAPI} from '@/api/cart'
import {getUnPayOrderAPI, submitOrderAPI} from '@/api/order'
import {useAddressStore} from '@/stores/modules/address'
import {useOrderModeStore} from '@/stores/modules/orderMode'
import type {CartItem} from '@/types/cart'
import {TAKEOUT_ORDER_TYPE} from '@/utils/order'

const DELIVERY_FEE = 6

const store = useAddressStore()
const orderModeStore = useOrderModeStore()

const cartList = ref<CartItem[]>([])

const address = ref('')
const label = ref('')
const consignee = ref('')
const phoneNumber = ref('')
const estimatedDeliveryTime = ref('')

const openCooker = ref(false)
const cookerNum = ref(-1)
const cookers = ref([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
const radioStatus = ref(false)
const remark = ref('')
const arrivalTime = ref('')
const addressId = ref(0)

const currentOrderType = computed(() => orderModeStore.orderType)
const isTakeoutMode = computed(() => currentOrderType.value === TAKEOUT_ORDER_TYPE)
const deliveryFee = DELIVERY_FEE

const cartItemCount = computed(() => cartList.value.reduce((acc, cur) => acc + cur.number, 0))
const dishTotalPrice = computed(() => cartList.value.reduce((acc, cur) => acc + cur.amount * cur.number, 0))
const packAmount = computed(() => cartItemCount.value)
const takeoutTotal = computed(() => dishTotalPrice.value + packAmount.value + DELIVERY_FEE)
const dineInTotal = computed(() => dishTotalPrice.value)
const displayTotalPrice = computed(() => formatPrice(isTakeoutMode.value ? takeoutTotal.value : dineInTotal.value))
const selectedCookerIndex = computed(() => {
  const currentIndex = cookers.value.findIndex((item) => item === cookerNum.value)
  return [currentIndex >= 0 ? currentIndex : 0]
})

const getCartList = async () => {
  const res = await getCartAPI()
  cartList.value = res.data
}

onLoad(async (options: any) => {
  if (isTakeoutMode.value) {
    await getAddressBookDefault()
  }

  if (options.address) {
    const addressObj = JSON.parse(options.address)
    addressId.value = addressObj.id
    label.value = addressObj.label
    address.value = addressObj.provinceName + addressObj.cityName + addressObj.districtName + addressObj.detail
    phoneNumber.value = addressObj.phone
    consignee.value = addressObj.consignee
  }

  if (options.remark) {
    remark.value = options.remark
  }

  await getCartList()
  getHarfAnOur()

  if (store.defaultCook === '无需餐具') {
    cookerNum.value = -1
  } else if (store.defaultCook === '商家依据餐量提供') {
    cookerNum.value = 0
  }
})

onShow(async () => {
  await getCartList()
})

const formatPrice = (value: number) => {
  return (Math.round(value * 100) / 100).toFixed(2)
}

const DateToStr = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const hours = date.getHours()
  const min = date.getMinutes()
  const second = date.getSeconds()
  return (
    year +
    '-' +
    (month + 1 > 9 ? month + 1 : '0' + (month + 1)) +
    '-' +
    (day > 9 ? day : '0' + day) +
    ' ' +
    (hours > 9 ? hours : '0' + hours) +
    ':' +
    (min > 9 ? min : '0' + min) +
    ':' +
    (second > 9 ? second : '0' + second)
  )
}

const getHarfAnOur = () => {
  const date = new Date()
  date.setTime(date.getTime() + 3600000)
  estimatedDeliveryTime.value = DateToStr(date)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  arrivalTime.value = hours + ':' + minutes
}

const getAddressBookDefault = async () => {
  const res = await getDefaultAddressAPI()
  if (res.code === 0) {
    addressId.value = 0
    if (res.data.provinceName) {
      address.value = res.data.provinceName + res.data.cityName + res.data.districtName + res.data.detail
    }
    phoneNumber.value = res.data.phone as string
    consignee.value = res.data.consignee as string
    addressId.value = res.data.id as number
  }
}

const trans = (item: string) => {
  switch (item) {
    case '公司':
      return '1'
    case '家':
      return '2'
    case '学校':
      return '3'
    default:
      return '4'
  }
}

const goAddress = () => {
  if (!isTakeoutMode.value) {
    return
  }
  store.addressBackUrl = '/pages/submit/submit'
  uni.redirectTo({
    url: '/pages/address/address'
  })
}

const goRemark = () => {
  uni.redirectTo({
    url: '/pages/remark/remark'
  })
}

const chooseCooker = () => {
  if (cookerNum.value === -2) {
    cookerNum.value = -1
  }
  openCooker.value = true
}

const getCookerInfo = () => {
  if (cookerNum.value === -2) return '无需餐具'
  if (cookerNum.value === -1) return '无需餐具'
  if (cookerNum.value === 0) return '商家依据餐量提供'
  if (cookerNum.value === 11) return '10份以上'
  return cookerNum.value + '份'
}

const pickerChange = (ev: any) => {
  cookerNum.value = cookers.value[ev.detail.value[0]]
}

const radioChange = () => {
  radioStatus.value = !radioStatus.value
  if (radioStatus.value) {
    store.defaultCook = cookerNum.value === -1 ? '无需餐具' : '商家依据餐量提供'
  } else {
    store.defaultCook = '请依据实际情况填写，避免浪费'
  }
}

const closeMask = () => {
  openCooker.value = false
}

const confirmCooker = () => {
  if (cookerNum.value === -2) {
    cookerNum.value = -1
  }
  openCooker.value = false
}

const payOrderHandle = async () => {
  const unPayRes = await getUnPayOrderAPI()
  if (unPayRes.data !== 0) {
    uni.showToast({
      title: '有未支付订单，请先支付或取消！',
      icon: 'none'
    })
    return false
  }

  if (isTakeoutMode.value && !address.value) {
    uni.showToast({
      title: '请选择收货地址',
      icon: 'none'
    })
    return false
  }

  if (cookerNum.value === -2) {
    uni.showToast({
      title: '请选择餐具份数',
      icon: 'none'
    })
    return false
  }

  const params: Record<string, unknown> = {
    payMethod: 1,
    remark: remark.value,
    orderType: currentOrderType.value,
    tablewareNumber: cookerNum.value,
    tablewareStatus: cookerNum.value === 0 ? 1 : 0,
    amount: isTakeoutMode.value ? takeoutTotal.value : dineInTotal.value
  }

  if (isTakeoutMode.value) {
    Object.assign(params, {
      addressId: addressId.value,
      estimatedDeliveryTime: estimatedDeliveryTime.value,
      deliveryStatus: 1,
      packAmount: packAmount.value
    })
  }

  const res = await submitOrderAPI(params)
  if (res.code === 0) {
    uni.redirectTo({
      url:
        '/pages/pay/pay?' +
        'orderId=' +
        res.data!.id +
        '&orderAmount=' +
        res.data!.orderAmount +
        '&orderNumber=' +
        res.data!.orderNumber +
        '&orderTime=' +
        res.data!.orderTime
    })
  } else {
    uni.showToast({
      title: res.msg || '操作失败',
      icon: 'none'
    })
  }
}
</script>

<style lang="less" scoped>
.order_content {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0 0 0;
  position: relative;
  background-color: #cceeff;
  box-sizing: border-box;

  .order_content_box {
    width: 100%;
    height: 100%;

    .blank {
      height: 1rpx;
    }
  }

  .new_address {
    width: 730rpx;
    min-height: 240rpx;
    background-color: #fff;
    margin: 0 auto 20rpx;
    border-radius: 12rpx;
    z-index: 10;
    display: flex;
    flex-direction: column;

    .top {
      margin: 0 22rpx 0 30rpx;
      flex: 1;
      display: flex;

      .address_name {
        flex: 1;
        overflow: hidden;

        .address {
          height: 50rpx;
          line-height: 50rpx;
          margin-top: 22rpx;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          .tag {
            display: inline-block;
            width: 70rpx;
            height: 45rpx;
            border-radius: 4rpx;
            margin-right: 20rpx;
            font-size: 25rpx;
            line-height: 45rpx;
            color: #333333;
            text-align: center;
            background: #e1f1fe;
          }

          .tag2 {
            background: #fef8e7;
          }

          .tag3 {
            background: #e7fef8;
          }

          .tag4 {
            background: #fee7e7;
          }

          .word {
            vertical-align: middle;
            opacity: 1;
            font-size: 32rpx;
            font-family: PingFangSC, PingFangSC-Medium;
            font-weight: 550;
            color: #20232a;
          }
        }

        .name {
          height: 34rpx;
          line-height: 34rpx;
          margin-top: 8rpx;

          .name_1,
          .name_2 {
            opacity: 1;
            font-size: 26rpx;
            font-family: PingFangSC, PingFangSC-Regular;
            font-weight: 400;
            text-align: center;
            color: #333333;
          }

          .name_2 {
            margin-left: 10rpx;
          }
        }
      }

      .address_name_disabled {
        flex: 1;
        font-size: 32rpx;
        font-family: PingFangSC, PingFangSC-Regular;
        font-weight: 400;
        color: #bdbdbd;
        align-self: center;
      }

      .address_image {
        width: 80rpx;
        height: 100%;
        position: relative;

        .to_right {
          width: 30rpx;
          height: 30rpx;
          vertical-align: middle;
          margin-bottom: 10rpx;
          position: absolute;
          top: 50%;
          right: 6rpx;
          transform: translateY(-50%);
        }
      }
    }

    .bottom {
      margin: 0 28rpx;
      height: 94rpx;
      border-top: 1px dashed #ebebeb;
      box-sizing: border-box;

      .word_bottom {
        opacity: 1;
        font-size: 26rpx;
        font-family: PingFangSC, PingFangSC-Regular;
        font-weight: 400;
        text-align: left;
        color: #333333;
        height: 34rpx;
        line-height: 34rpx;
        margin-top: 24rpx;
        display: inline-block;
      }
    }
  }

  .dine_in_notice {
    min-height: 180rpx;
    padding: 34rpx 32rpx;
    box-sizing: border-box;
    justify-content: center;

    .mode_badge {
      width: 88rpx;
      height: 42rpx;
      line-height: 42rpx;
      border-radius: 999rpx;
      text-align: center;
      font-size: 24rpx;
      color: #00aaff;
      background: #e5f7ff;
    }

    .mode_title {
      margin-top: 18rpx;
      font-size: 34rpx;
      font-weight: 600;
      color: #20232a;
    }

    .mode_desc {
      margin-top: 16rpx;
      font-size: 26rpx;
      color: #666;
      line-height: 1.6;
    }
  }

  .order_list_cont {
    width: 730rpx;
    margin: 0 auto;

    .order_list {
      border-radius: 15rpx;
      background-color: #fff;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      position: relative;
      margin-bottom: 20rpx;
    }
  }

  .order-type {
    padding: 20rpx 0 10rpx 0;

    .type_item {
      display: flex;
      margin-bottom: 30rpx;

      .dish_img {
        width: 100rpx;
        margin: 0 20rpx 0 32rpx;

        .dish_img_url {
          display: block;
          width: 100rpx;
          height: 100rpx;
          border-radius: 8rpx;
        }
      }

      .dish_info {
        position: relative;
        flex: 1;
        margin-right: 20rpx;

        .dish_name {
          font-size: 30rpx;
          font-weight: bold;
          color: #20232a;
        }

        .dish_flavor {
          font-size: 24rpx;
          color: #818693;
          height: 30rpx;
          line-height: 30rpx;
          margin-top: 10rpx;
        }

        .dish_amount {
          font-size: 24rpx;
          color: #818693;
          height: 30rpx;
          line-height: 30rpx;
          margin-top: 10rpx;

          .dish_number {
            padding: 10rpx 0;
            font-size: 24rpx;
          }
        }

        .dish_price {
          position: absolute;
          right: 20rpx;
          bottom: 20rpx;
          display: flex;
          font-size: 32rpx;
          color: #e94e3c;
          font-family: DIN, DIN-Medium;
          font-weight: 500;

          .ico {
            line-height: 42rpx;
            font-size: 24rpx;
          }
        }
      }
    }
  }

  .word_text {
    display: flex;
    align-items: center;
    margin: 0 20rpx 0 30rpx;
    border-bottom: 1px solid #efefef;
    height: 120rpx;
    line-height: 120rpx;

    .word_style,
    .word_left {
      width: 50%;
      height: 44rpx;
      opacity: 1;
      font-size: 32rpx;
      text-align: left;
      color: #333333;
      line-height: 44rpx;
      letter-spacing: 0px;
    }

    .word_right {
      width: 50%;
      height: 44rpx;
      opacity: 1;
      font-size: 32rpx;
      text-align: right;
      color: #333333;
      line-height: 44rpx;
      letter-spacing: 0px;
      padding-right: 20rpx;
    }
  }

  .all_price {
    position: relative;
    margin: 0 16rpx 0 22rpx;
    height: 120rpx;
    line-height: 120rpx;

    .word_right {
      position: absolute;
      height: 44rpx;
      opacity: 1;
      font-size: 32rpx;
      text-align: left;
      color: #333333;
      line-height: 44rpx;
      letter-spacing: 0px;
      top: 30rpx;
      right: 28rpx;
    }
  }

  .bottom_text {
    display: flex;
    align-items: center;
    margin: 0 20rpx 0 30rpx;
    height: 100rpx;
    line-height: 100rpx;

    .text_left {
      width: 30%;
      height: 44rpx;
      opacity: 1;
      font-size: 32rpx;
      text-align: left;
      color: #333333;
      line-height: 44rpx;
      letter-spacing: 0px;
    }

    .text_right {
      width: 70%;
      height: 44rpx;
      font-size: 24rpx;
      text-align: right;
      color: #666666;
      line-height: 44rpx;
      letter-spacing: 0px;
      padding-right: 20rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .right_image {
      width: 30rpx;
      height: 100%;
      position: relative;

      .to_right {
        width: 30rpx;
        height: 30rpx;
        vertical-align: middle;
        margin-bottom: 10rpx;
        position: absolute;
        top: 50%;
        right: 6rpx;
        transform: translateY(-50%);
      }
    }
  }

  .footer_order_buttom {
    position: fixed;
    display: flex;
    bottom: 48rpx;
    width: calc(100% - 60rpx);
    height: 88rpx;
    margin: 0 30rpx;
    background: rgba(0, 0, 0, 0.9);
    border-radius: 50rpx;
    box-shadow: 0px 6rpx 10rpx 0px rgba(0, 0, 0, 0.25);
    z-index: 1000;
    padding: 0rpx 10rpx;
    box-sizing: border-box;

    .order_number {
      position: relative;
      width: 120rpx;

      .order_number_icon {
        position: absolute;
        display: block;
        width: 120rpx;
        height: 120rpx;
        left: 12rpx;
        bottom: 0;
      }

      .order_dish_num {
        position: absolute;
        display: inline-block;
        z-index: 9;
        min-width: 12rpx;
        height: 36rpx;
        line-height: 36rpx;
        padding: 0 12rpx;
        left: 92rpx;
        font-size: 24rpx;
        top: -8rpx;
        border-radius: 20rpx;
        background-color: #e94e3c;
        color: #fff;
        font-weight: 500;
      }
    }

    .order_price {
      flex: 1;
      text-align: left;
      color: #fff;
      line-height: 88rpx;
      padding-left: 34rpx;
      box-sizing: border-box;
      font-size: 36rpx;
      font-family: DIN, DIN-Medium;
      font-weight: 500;

      .ico {
        font-size: 24rpx;
      }
    }

    .order_but {
      width: 204rpx;
      height: 72rpx;
      margin-top: 8rpx;

      .order_but_rit {
        height: 72rpx;
        line-height: 72rpx;
        border-radius: 72rpx;
        color: #fff;
        text-align: center;
        font-weight: bold;
        background: #00aaff;
      }
    }
  }

  .pop_mask {
    position: fixed;
    width: 100%;
    height: 100vh;
    top: 0;
    left: 0;
    z-index: 1200;
    background-color: rgba(0, 0, 0, 0.4);
  }

  .cook_pop {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 100%;
    background: #fff;
    border-radius: 24rpx 24rpx 0 0;
    padding: 30rpx 30rpx 40rpx;
    box-sizing: border-box;

    .top_title {
      position: relative;
      text-align: center;

      .title {
        font-size: 34rpx;
        font-weight: 600;
        color: #20232a;
      }

      .tips {
        margin-top: 12rpx;
        font-size: 24rpx;
        color: #7b8794;
      }

      .close {
        position: absolute;
        top: 0;
        right: 0;

        .close_img {
          width: 34rpx;
          height: 34rpx;
        }
      }
    }

    .picker {
      width: 100%;
      height: 320rpx;
      margin-top: 24rpx;
    }

    .after_action {
      display: flex;
      flex-direction: column;
      gap: 20rpx;
      margin-top: 24rpx;

      .checkbox {
        font-size: 24rpx;
        color: #666;
      }

      .comfirm_btn {
        width: 100%;
        height: 84rpx;
        line-height: 84rpx;
        border: none;
        border-radius: 42rpx;
        background: #00aaff;
        color: #fff;
        font-size: 30rpx;
      }
    }
  }
}

</style>

<style>
page {
  background-color: #f8f8f8;
}
</style>
