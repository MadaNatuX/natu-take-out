<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Empty from '@/components/Empty.vue'
import {
  completeOrderAPI,
  deliveryOrderAPI,
  getOrderDetailPageAPI,
  getOrderListByAPI,
  orderAcceptAPI,
  orderCancelAPI,
  orderRejectAPI,
  queryOrderDetailByIdAPI,
  type OrderQueryParams,
} from '@/api/order'
import type { Order, OrderVO } from '@/types/order'
import { ElMessage } from 'element-plus'

type OrderStatics = {
  toBeConfirmed: number
  confirmed: number
  deliveryInProgress: number
}

type OrderTypeTab = {
  label: string
  value: number
}

type StatusTab = {
  label: string
  value: number
  num?: number
}

const TAKEOUT_ORDER_TYPE = 1
const DINE_IN_ORDER_TYPE = 2
const DELIVERY_FEE = 6

const TAKEOUT_STATUS_VALUES = [0, 2, 3, 4, 5, 6]
const DINE_IN_STATUS_VALUES = [0, 4, 5, 6]

const route = useRoute()
const router = useRouter()

const orderTypeTabs: OrderTypeTab[] = [
  { label: '外卖订单管理', value: TAKEOUT_ORDER_TYPE },
  { label: '堂食订单管理', value: DINE_IN_ORDER_TYPE },
]

const orderStatics = ref<OrderStatics>({
  toBeConfirmed: 0,
  confirmed: 0,
  deliveryInProgress: 0,
})
const currentOrderType = ref<number>(TAKEOUT_ORDER_TYPE)
const activeStatus = ref<number>(0)
const input = ref('')
const phone = ref('')
const rangeTime = ref<[string, string] | undefined>()
const dialogVisible = ref(false)
const cancelDialogVisible = ref(false)
const cancelDialogTitle = ref('')
const cancelReason = ref('')
const remark = ref('')
const counts = ref(0)
const page = ref(1)
const pageSize = ref(10)
const tableData = ref<OrderVO[]>([])
const diaForm = ref<OrderVO>()
const currentRow = ref<Partial<Order>>()
const orderId = ref<number>()
const dialogOrderStatus = ref(0)
const isAutoNext = ref(true)
const isTableOperateBtn = ref(true)
const isSearch = ref(false)

const rejectReasonList = reactive([
  { value: 1, label: '订单量较多，暂时无法接单' },
  { value: 2, label: '菜品已销售完，暂时无法接单' },
  { value: 3, label: '餐厅已打烊，暂时无法接单' },
  { value: 0, label: '自定义原因' },
])

const cancelrReasonList = reactive([
  { value: 1, label: '订单量较多，暂时无法接单' },
  { value: 2, label: '菜品已销售完，暂时无法接单' },
  { value: 3, label: '骑手不足无法配送' },
  { value: 4, label: '客户电话取消' },
  { value: 0, label: '自定义原因' },
])

const isTakeoutMode = computed(() => currentOrderType.value === TAKEOUT_ORDER_TYPE)
const dialogOrderType = computed(() => normalizeOrderType(diaForm.value?.orderType))
const isDialogTakeout = computed(() => dialogOrderType.value === TAKEOUT_ORDER_TYPE)

const currentStatusTabs = computed<StatusTab[]>(() => {
  if (isTakeoutMode.value) {
    return [
      { label: '全部订单', value: 0 },
      { label: '待接单', value: 2, num: orderStatics.value.toBeConfirmed },
      { label: '待派送', value: 3, num: orderStatics.value.confirmed },
      { label: '派送中', value: 4, num: orderStatics.value.deliveryInProgress },
      { label: '已完成', value: 5 },
      { label: '已取消', value: 6 },
    ]
  }

  return [
    { label: '全部订单', value: 0 },
    { label: '备餐中', value: 4, num: orderStatics.value.deliveryInProgress },
    { label: '已完成', value: 5 },
    { label: '已取消', value: 6 },
  ]
})

const dialogStatusText = computed(() =>
  getOrderStatusText(dialogOrderStatus.value, dialogOrderType.value)
)

const dialogCustomerName = computed(() => {
  if (!diaForm.value) {
    return '--'
  }
  return diaForm.value.userName || diaForm.value.consignee || '--'
})

const showDialogAutoNext = computed(
  () => isDialogTakeout.value && dialogOrderStatus.value === 2 && activeStatus.value === 2
)
const canDialogAccept = computed(
  () => isDialogTakeout.value && dialogOrderStatus.value === 2
)
const canDialogReject = computed(() => canDialogAccept.value)
const canDialogDelivery = computed(
  () => isDialogTakeout.value && dialogOrderStatus.value === 3
)
const canDialogComplete = computed(() => dialogOrderStatus.value === 4)
const canDialogCancel = computed(() => {
  if (isDialogTakeout.value) {
    return dialogOrderStatus.value === 1
  }
  return [4, 5].includes(dialogOrderStatus.value)
})
const showDialogBackButton = computed(() => !canDialogAccept.value)

const normalizeOrderType = (value?: number | string | null) => {
  return Number(value) === DINE_IN_ORDER_TYPE ? DINE_IN_ORDER_TYPE : TAKEOUT_ORDER_TYPE
}

const parseQueryNumber = (value: unknown): number | undefined => {
  if (Array.isArray(value)) {
    return parseQueryNumber(value[0])
  }
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const numberValue = Number(value)
  return Number.isNaN(numberValue) ? undefined : numberValue
}

const getValidStatuses = (orderType: number) =>
  orderType === DINE_IN_ORDER_TYPE ? DINE_IN_STATUS_VALUES : TAKEOUT_STATUS_VALUES

const normalizeStatus = (status: number | undefined, orderType: number) => {
  if (status === undefined) {
    return 0
  }
  return getValidStatuses(orderType).includes(status) ? status : 0
}

const syncRouteQuery = async () => {
  const query: Record<string, string> = {
    orderType: String(currentOrderType.value),
  }

  if (activeStatus.value) {
    query.status = String(activeStatus.value)
  }

  try {
    await router.replace({
      path: '/order',
      query,
    })
  } catch (error) {
    console.error('同步订单路由参数失败：', error)
  }
}

const resetFilters = () => {
  input.value = ''
  phone.value = ''
  rangeTime.value = undefined
  page.value = 1
  activeStatus.value = 0
  isSearch.value = false
}

const buildListParams = (): OrderQueryParams => ({
  page: page.value,
  pageSize: pageSize.value,
  number: input.value || undefined,
  phone: isTakeoutMode.value ? phone.value || undefined : undefined,
  beginTime: rangeTime.value?.[0],
  endTime: rangeTime.value?.[1],
  status: activeStatus.value || undefined,
  orderType: currentOrderType.value,
})

const formatAmount = (amount?: number) => {
  return typeof amount === 'number' ? amount.toFixed(2) : '0.00'
}

const getTakeoutDishSubtotal = (order?: Partial<OrderVO>) => {
  if (!order || typeof order.amount !== 'number') {
    return '0.00'
  }
  const packAmount = typeof order.packAmount === 'number' ? order.packAmount : 0
  return (order.amount - DELIVERY_FEE - packAmount).toFixed(2)
}

const getDishSubtotal = (order?: Partial<OrderVO>) => {
  if (!order || typeof order.amount !== 'number') {
    return '0.00'
  }
  if (normalizeOrderType(order.orderType) === DINE_IN_ORDER_TYPE) {
    return order.amount.toFixed(2)
  }
  return getTakeoutDishSubtotal(order)
}

const getOrderStatusText = (status: number, orderType: number) => {
  if (orderType === DINE_IN_ORDER_TYPE) {
    if (status === 4) {
      return '备餐中'
    }
    if (status === 5) {
      return '已完成'
    }
    if (status === 6) {
      return '已取消'
    }
    if (status === 1) {
      return '待付款'
    }
    return '退款'
  }

  if (status === 1) {
    return '待付款'
  }
  if (status === 2) {
    return '待接单'
  }
  if (status === 3) {
    return '待派送'
  }
  if (status === 4) {
    return '派送中'
  }
  if (status === 5) {
    return '已完成'
  }
  if (status === 6) {
    return '已取消'
  }
  return '退款'
}

const fetchStatistics = async () => {
  try {
    const res = await getOrderListByAPI({ orderType: currentOrderType.value })
    if (res.data.code === 0) {
      orderStatics.value = res.data.data
    } else {
      throw new Error(res.data.msg)
    }
  } catch (error) {
    console.error('获取订单统计失败：', error)
  }
}

const openDetailDialog = (detail: OrderVO, row?: Partial<Order>) => {
  diaForm.value = detail
  currentRow.value = row || {
    id: detail.id,
    status: detail.status,
    orderType: detail.orderType,
  }
  dialogOrderStatus.value = detail.status
  dialogVisible.value = true
}

const fetchOrderDetail = async (id: number) => {
  const { data: res } = await queryOrderDetailByIdAPI({ orderId: id })
  return res.data as OrderVO
}

const fetchOrderList = async (search = false) => {
  if (search) {
    isSearch.value = true
    page.value = 1
  }

  try {
    const res = await getOrderDetailPageAPI(buildListParams())
    if (res.data.code === 0) {
      tableData.value = res.data.data.records
      counts.value = Number(res.data.data.total)
      await fetchStatistics()

      if (
        isTakeoutMode.value &&
        dialogOrderStatus.value === 2 &&
        activeStatus.value === 2 &&
        isAutoNext.value &&
        !isTableOperateBtn.value &&
        tableData.value.length >= 1
      ) {
        const nextRow = tableData.value[0]
        await goDetail(nextRow.id, nextRow)
      }
    } else {
      throw new Error(res.data.msg)
    }
  } catch (error) {
    console.error('获取订单列表失败：', error)
  }
}

const refreshPageData = async (search = false) => {
  await syncRouteQuery()
  await fetchOrderList(search)
}

const goDetail = async (id: number, row?: Partial<Order>) => {
  orderId.value = id
  try {
    const detail = await fetchOrderDetail(id)
    openDetailDialog(detail, row)
  } catch (error) {
    console.error('查询订单详情失败：', error)
  }
}

const initFromRoute = async () => {
  const routeOrderId = parseQueryNumber(route.query.orderId)
  const routeOrderType = normalizeOrderType(parseQueryNumber(route.query.orderType))

  if (routeOrderId) {
    try {
      const detail = await fetchOrderDetail(routeOrderId)
      currentOrderType.value = normalizeOrderType(detail.orderType)
      activeStatus.value = normalizeStatus(
        parseQueryNumber(route.query.status),
        currentOrderType.value
      )
      await syncRouteQuery()
      await fetchOrderList()
      openDetailDialog(detail, {
        id: detail.id,
        status: detail.status,
        orderType: detail.orderType,
      })
      return
    } catch (error) {
      console.error('初始化订单详情失败：', error)
    }
  }

  currentOrderType.value = routeOrderType
  activeStatus.value = normalizeStatus(
    parseQueryNumber(route.query.status),
    currentOrderType.value
  )
  await syncRouteQuery()
  await fetchOrderList()
}

const handleOrderTypeChange = async (orderType: number) => {
  if (currentOrderType.value === orderType) {
    return
  }
  currentOrderType.value = orderType
  resetFilters()
  dialogVisible.value = false
  await refreshPageData()
}

const tabChange = async (status: number) => {
  activeStatus.value = normalizeStatus(status, currentOrderType.value)
  page.value = 1
  await refreshPageData()
}

const orderAccept = async (row?: Partial<Order>) => {
  if (!row?.id || row.status === undefined) {
    return
  }
  orderId.value = Number(row.id)
  dialogOrderStatus.value = Number(row.status)
  try {
    const res = await orderAcceptAPI({ id: orderId.value })
    if (res.data.code === 0) {
      dialogVisible.value = false
      orderId.value = undefined
      await fetchOrderList()
      await fetchStatistics()
      ElMessage.success('接单成功')
    } else {
      throw new Error(res.data.msg)
    }
  } catch (error) {
    console.error('接单失败：', error)
  }
}

const orderReject = (row?: Partial<Order>) => {
  if (!row?.id || row.status === undefined) {
    return
  }
  cancelDialogVisible.value = true
  orderId.value = Number(row.id)
  dialogOrderStatus.value = Number(row.status)
  cancelDialogTitle.value = '拒绝'
  dialogVisible.value = false
  cancelReason.value = ''
  remark.value = ''
}

const cancelOrder = (row?: Partial<Order>) => {
  if (!row?.id || row.status === undefined) {
    return
  }
  cancelDialogVisible.value = true
  orderId.value = Number(row.id)
  dialogOrderStatus.value = Number(row.status)
  cancelDialogTitle.value = '取消'
  dialogVisible.value = false
  cancelReason.value = ''
  remark.value = ''
}

const confirmCancel = async () => {
  if (!cancelReason.value) {
    return ElMessage.error(`请选择${cancelDialogTitle.value}原因`)
  }

  if (cancelReason.value === '自定义原因' && !remark.value) {
    return ElMessage.error(`请输入${cancelDialogTitle.value}原因`)
  }

  try {
    const res = await (cancelDialogTitle.value === '取消'
      ? orderCancelAPI
      : orderRejectAPI)({
      id: orderId.value,
      [cancelDialogTitle.value === '取消' ? 'cancelReason' : 'rejectionReason']:
        cancelReason.value === '自定义原因' ? remark.value : cancelReason.value,
    })

    if (res.data.code === 0) {
      ElMessage.success(`${cancelDialogTitle.value}成功`)
      cancelDialogVisible.value = false
      orderId.value = undefined
      await fetchOrderList()
      await fetchStatistics()
    } else {
      throw new Error(res.data.msg)
    }
  } catch (error) {
    console.error(`${cancelDialogTitle.value}订单失败：`, error)
  }
}

const deliveryOrComplete = async (status: number, id: number) => {
  try {
    const res = await (status === 3 ? deliveryOrderAPI : completeOrderAPI)({
      status,
      id,
    })

    if (res.data.code === 0) {
      ElMessage.success(`${status === 3 ? '派送成功' : '订单完成'}`)
      orderId.value = undefined
      dialogVisible.value = false
      await fetchOrderList()
      await fetchStatistics()
    } else {
      throw new Error(res.data.msg)
    }
  } catch (error) {
    console.error('更新订单状态失败：', error)
  }
}

const handleClose = () => {
  dialogVisible.value = false
}

const handleSizeChange = async (value: number) => {
  pageSize.value = value
  page.value = 1
  await fetchOrderList()
}

const handleCurrentChange = async (value: number) => {
  page.value = value
  await fetchOrderList()
}

const showTakeoutCancelButton = (row: OrderVO) => [1, 3, 4, 5].includes(row.status)
const showDineInCancelButton = (row: OrderVO) => [4, 5].includes(row.status)

void initFromRoute()
</script>

<template>
  <div class="dashboard-container">
    <div class="business-switch">
      <div
        v-for="item in orderTypeTabs"
        :key="item.value"
        class="switch-item"
        :class="{ active: item.value === currentOrderType }"
        @click="handleOrderTypeChange(item.value)"
      >
        {{ item.label }}
      </div>
    </div>

    <div class="tab-change">
      <div
        v-for="item in currentStatusTabs"
        :key="item.value"
        class="tab-item"
        :class="{ active: item.value === activeStatus }"
        @click="tabChange(item.value)"
      >
        <el-badge
          :class="{ 'special-item': item.num && item.num < 10 }"
          class="item"
          :value="item.num && item.num > 99 ? '99+' : item.num"
          :hidden="!(item.num && item.value === 4) && !(isTakeoutMode && item.num && [2, 3, 4].includes(item.value))"
        >
          {{ item.label }}
        </el-badge>
      </div>
    </div>

    <div class="container" :class="{ hContainer: tableData.length }">
      <div class="tableBar">
        <label class="table-label">订单号：</label>
        <el-input
          v-model="input"
          placeholder="请填写订单号"
          style="width: 15%"
          clearable
          @clear="fetchOrderList()"
          @keyup.enter="refreshPageData(true)"
        />

        <template v-if="isTakeoutMode">
          <label class="table-label phone-label">手机号：</label>
          <el-input
            v-model="phone"
            placeholder="请填写手机号"
            style="width: 15%"
            clearable
            @clear="fetchOrderList()"
            @keyup.enter="refreshPageData(true)"
          />
        </template>

        <label class="table-label time-label">下单时间：</label>
        <el-date-picker
          v-model="rangeTime"
          clearable
          format="YYYY/MM/DD"
          value-format="YYYY-MM-DD HH:mm:ss"
          range-separator="至"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 25%; margin-left: 10px"
          @clear="fetchOrderList()"
        />
        <el-button class="normal-btn continue" @click="refreshPageData(true)">查询</el-button>
      </div>

      <el-table v-if="tableData.length" :data="tableData" stripe class="tableBox">
        <template v-if="isTakeoutMode">
          <el-table-column key="number" prop="number" label="订单号" />
          <el-table-column
            v-if="[2, 3, 4].includes(activeStatus)"
            key="orderDishes"
            prop="orderDishes"
            label="订单菜品"
          />
          <el-table-column
            v-if="[0].includes(activeStatus)"
            key="status"
            label="订单状态"
          >
            <template #default="{ row }">
              <span>{{ getOrderStatusText(row.status, TAKEOUT_ORDER_TYPE) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="[0, 5, 6].includes(activeStatus)"
            key="consignee"
            prop="consignee"
            label="用户名"
            show-overflow-tooltip
          />
          <el-table-column
            v-if="[0, 5, 6].includes(activeStatus)"
            key="phone"
            prop="phone"
            label="手机号"
          />
          <el-table-column
            v-if="[0, 2, 3, 4, 5, 6].includes(activeStatus)"
            key="address"
            prop="address"
            label="地址"
            :class-name="activeStatus === 6 ? 'address' : ''"
          />
          <el-table-column
            v-if="[0, 6].includes(activeStatus)"
            key="orderTime"
            prop="orderTime"
            label="下单时间"
            class-name="orderTime"
            min-width="110"
          />
          <el-table-column
            v-if="[6].includes(activeStatus)"
            key="cancelTime"
            prop="cancelTime"
            class-name="cancelTime"
            label="取消时间"
            min-width="110"
          />
          <el-table-column
            v-if="[6].includes(activeStatus)"
            key="cancelReason"
            prop="cancelReason"
            label="取消原因"
            class-name="cancelReason"
            :min-width="[6].includes(activeStatus) ? 80 : 'auto'"
          />
          <el-table-column
            v-if="[5].includes(activeStatus)"
            key="deliveryTime"
            prop="deliveryTime"
            label="送达时间"
          />
          <el-table-column
            v-if="[2, 3, 4].includes(activeStatus)"
            key="estimatedDeliveryTime"
            prop="estimatedDeliveryTime"
            label="预计送达时间"
            min-width="110"
            align="center"
          />
          <el-table-column
            v-if="[0, 2, 5].includes(activeStatus)"
            key="amount"
            prop="amount"
            label="实收金额"
            align="center"
          >
            <template #default="{ row }">
              <span>￥{{ formatAmount(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="[2, 3, 4, 5].includes(activeStatus)"
            key="remark"
            prop="remark"
            label="备注"
            align="center"
          />
          <el-table-column
            v-if="[2, 3, 4].includes(activeStatus)"
            key="tablewareNumber"
            prop="tablewareNumber"
            label="餐具数量"
            align="center"
            min-width="80"
          >
            <template #default="{ row }">
              {{
                row.tablewareNumber === -1
                  ? '无需餐具'
                  : row.tablewareNumber === 0
                    ? '按餐量提供'
                    : row.tablewareNumber
              }}
            </template>
          </el-table-column>
        </template>

        <template v-else>
          <el-table-column key="inNumber" prop="inNumber" label="堂食订单号" min-width="110" />
          <el-table-column key="number" prop="number" label="订单号" min-width="170" />
          <el-table-column
            key="orderDishes"
            prop="orderDishes"
            label="订单菜品"
            show-overflow-tooltip
            min-width="220"
          />
          <el-table-column v-if="activeStatus === 0" key="status" label="订单状态" min-width="100">
            <template #default="{ row }">
              <span>{{ getOrderStatusText(row.status, DINE_IN_ORDER_TYPE) }}</span>
            </template>
          </el-table-column>
          <el-table-column key="orderTime" prop="orderTime" label="下单时间" min-width="170" />
          <el-table-column
            v-if="activeStatus === 5"
            key="deliveryTime"
            prop="deliveryTime"
            label="完成时间"
            min-width="170"
          />
          <el-table-column
            v-if="activeStatus === 6"
            key="cancelTime"
            prop="cancelTime"
            label="取消时间"
            min-width="170"
          />
          <el-table-column
            v-if="activeStatus === 6"
            key="cancelReason"
            prop="cancelReason"
            label="取消原因"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column key="amount" prop="amount" label="实收金额" align="center" min-width="100">
            <template #default="{ row }">
              <span>￥{{ formatAmount(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column key="remark" prop="remark" label="备注" align="center" show-overflow-tooltip />
        </template>

        <el-table-column
          prop="btn"
          label="操作"
          align="center"
          width="190px"
          :class-name="activeStatus === 0 ? 'operate' : 'otherOperate'"
          :min-width="[2, 3, 4].includes(activeStatus) ? 130 : [0].includes(activeStatus) ? 140 : 'auto'"
        >
          <template #default="{ row }">
            <div class="btn_box">
              <div class="before">
                <el-button
                  v-if="isTakeoutMode && row.status === 2"
                  type="primary"
                  link
                  @click="orderAccept(row), (isTableOperateBtn = true)"
                >
                  接单
                </el-button>
                <el-button
                  v-if="isTakeoutMode && row.status === 3"
                  type="primary"
                  link
                  @click="deliveryOrComplete(3, row.id)"
                >
                  派送
                </el-button>
                <el-button
                  v-if="row.status === 4"
                  type="primary"
                  link
                  @click="deliveryOrComplete(4, row.id)"
                >
                  完成
                </el-button>
              </div>

              <el-divider direction="vertical" />

              <div class="middle">
                <el-button
                  v-if="isTakeoutMode && row.status === 2"
                  type="danger"
                  link
                  @click="orderReject(row), (isTableOperateBtn = true)"
                >
                  拒单
                </el-button>
                <el-button
                  v-if="isTakeoutMode ? showTakeoutCancelButton(row) : showDineInCancelButton(row)"
                  type="danger"
                  link
                  @click="cancelOrder(row)"
                >
                  取消
                </el-button>
              </div>

              <el-divider direction="vertical" />

              <div class="after">
                <el-button type="primary" link class="blueBtn" @click="goDetail(row.id, row)">
                  查看
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <Empty v-else :is-search="isSearch" />

      <el-pagination
        v-if="counts > 10"
        class="pageList"
        :page-sizes="[10, 20, 30, 40]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="counts"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <el-dialog
      title="订单信息"
      v-model="dialogVisible"
      width="53%"
      :before-close="handleClose"
      class="order-dialog"
    >
      <el-scrollbar style="height: 100%">
        <div class="order-top">
          <div>
            <div style="display: inline-block">
              <label style="font-size: 16px">订单号：</label>
              <div class="order-num">
                {{ diaForm?.number }}
              </div>
            </div>
            <div
              style="display: inline-block"
              class="order-status"
              :class="{ status3: [3, 4].includes(dialogOrderStatus) }"
            >
              {{ dialogStatusText }}
            </div>
          </div>
          <p><label>下单时间：</label>{{ diaForm?.orderTime }}</p>
        </div>
        <div class="order-middle">
          <div class="user-info">
            <div class="user-info-box">
              <div class="user-name">
                <label>用户名：</label>
                <span>{{ dialogCustomerName }}</span>
              </div>

              <template v-if="isDialogTakeout">
                <div class="user-phone">
                  <label>手机号：</label>
                  <span>{{ diaForm?.phone }}</span>
                </div>
                <div v-if="[2, 3, 4, 5].includes(dialogOrderStatus)" class="user-getTime">
                  <label>{{ dialogOrderStatus === 5 ? '送达时间：' : '预计送达时间：' }}</label>
                  <span>{{
                    dialogOrderStatus === 5 ? diaForm?.deliveryTime : diaForm?.estimatedDeliveryTime
                  }}</span>
                </div>
                <div class="user-address">
                  <label>地址：</label>
                  <span>{{ diaForm?.address }}</span>
                </div>
              </template>

              <template v-else>
                <div v-if="diaForm?.inNumber !== null" class="user-phone">
                  <label>堂食订单号：</label>
                  <span>{{ diaForm?.inNumber }}</span>
                </div>
              </template>
            </div>

            <div class="user-remark" :class="{ orderCancel: dialogOrderStatus === 6 }">
              <div>{{ dialogOrderStatus === 6 ? '取消原因' : '备注' }}</div>
              <span>{{
                dialogOrderStatus === 6
                  ? diaForm?.cancelReason || diaForm?.rejectionReason
                  : diaForm?.remark || '暂无备注'
              }}</span>
            </div>
          </div>

          <div class="dish-info">
            <div class="dish-label">菜品</div>
            <div class="dish-list">
              <div
                v-for="(item, index) in diaForm?.orderDetailList || []"
                :key="index"
                class="dish-item"
              >
                <div class="dish-item-box">
                  <span class="dish-name">{{ item.name }}</span>
                  <span class="dish-num">x{{ item.number }}</span>
                </div>
                <span class="dish-price">￥{{ formatAmount(item.amount) }}</span>
              </div>
            </div>
            <div class="dish-all-amount">
              <label>菜品小计</label>
              <span>￥{{ getDishSubtotal(diaForm) }}</span>
            </div>
          </div>
        </div>

        <div class="order-bottom">
          <div class="amount-info">
            <div class="amount-label">费用</div>
            <div class="amount-list">
              <div class="dish-amount">
                <span class="amount-name">菜品小计：</span>
                <span class="amount-price">￥{{ getDishSubtotal(diaForm) }}</span>
              </div>

              <template v-if="isDialogTakeout">
                <div class="send-amount">
                  <span class="amount-name">派送费：</span>
                  <span class="amount-price">￥{{ DELIVERY_FEE.toFixed(2) }}</span>
                </div>
                <div class="package-amount">
                  <span class="amount-name">打包费：</span>
                  <span class="amount-price">￥{{ formatAmount(diaForm?.packAmount) }}</span>
                </div>
                <div class="all-amount">
                  <span class="amount-name">合计：</span>
                  <span class="amount-price">￥{{ formatAmount(diaForm?.amount) }}</span>
                </div>
              </template>

              <template v-else>
                <div class="all-amount">
                  <span class="amount-name">合计：</span>
                  <span class="amount-price">￥{{ formatAmount(diaForm?.amount) }}</span>
                </div>
              </template>

              <div class="pay-type">
                <span class="pay-name">支付渠道：</span>
                <span class="pay-value">{{ diaForm?.payMethod === 1 ? '微信支付' : '支付宝支付' }}</span>
              </div>
              <div class="pay-time">
                <span class="pay-name">支付时间：</span>
                <span class="pay-value">{{ diaForm?.checkoutTime }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>

      <template #footer>
        <span v-if="dialogOrderStatus !== 6" class="dialog-footer">
          <el-checkbox v-if="showDialogAutoNext" v-model="isAutoNext">处理完自动跳转下一条</el-checkbox>
          <div>
            <el-button
              v-if="canDialogReject"
              @click="orderReject(currentRow), (isTableOperateBtn = false)"
            >
              拒单
            </el-button>
            <el-button
              v-if="canDialogAccept"
              type="primary"
              @click="orderAccept(currentRow), (isTableOperateBtn = false)"
            >
              接单
            </el-button>
            <el-button v-if="showDialogBackButton" @click="dialogVisible = false">返回</el-button>
            <el-button
              v-if="canDialogDelivery"
              type="primary"
              @click="deliveryOrComplete(3, Number(currentRow?.id))"
            >
              派送
            </el-button>
            <el-button
              v-if="canDialogComplete"
              type="primary"
              @click="deliveryOrComplete(4, Number(currentRow?.id))"
            >
              完成
            </el-button>
            <el-button v-if="canDialogCancel" type="primary" @click="cancelOrder(currentRow)">
              取消订单
            </el-button>
          </div>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      :title="cancelDialogTitle + '原因'"
      v-model="cancelDialogVisible"
      width="42%"
      :before-close="() => ((cancelDialogVisible = false), (cancelReason = ''), (remark = ''))"
      class="cancelDialog"
    >
      <el-form label-width="90px">
        <el-form-item :label="cancelDialogTitle + '原因：'">
          <el-select v-model="cancelReason" :placeholder="'请选择' + cancelDialogTitle + '原因'">
            <el-option
              v-for="(item, index) in cancelDialogTitle === '取消'
                ? cancelrReasonList
                : rejectReasonList"
              :key="index"
              :label="item.label"
              :value="item.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="cancelReason === '自定义原因'" label="原因：">
          <el-input
            v-model.trim="remark"
            type="textarea"
            :placeholder="'请填写您' + cancelDialogTitle + '的原因（限20字内）'"
            maxlength="20"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click=";(cancelDialogVisible = false), (cancelReason = ''), (remark = '')">
            取消
          </el-button>
          <el-button type="primary" @click="confirmCancel">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="less" scoped>
.business-switch {
  display: flex;
  margin-bottom: 16px;
  border-radius: 4px;

  .switch-item {
    width: 160px;
    height: 40px;
    text-align: center;
    line-height: 40px;
    color: #333;
    border: 1px solid #e5e4e4;
    background-color: white;
    border-left: none;
    cursor: pointer;
  }

  .switch-item:first-child {
    border-left: 1px solid #e5e4e4;
    border-radius: 4px 0 0 4px;
  }

  .switch-item:last-child {
    border-radius: 0 4px 4px 0;
  }

  .active {
    background-color: #22ccff;
    font-weight: bold;
  }
}

.tab-change {
  display: flex;
  border-radius: 4px;
  margin-bottom: 20px;

  .tab-item {
    width: 120px;
    height: 40px;
    text-align: center;
    line-height: 40px;
    color: #333;
    border: 1px solid #e5e4e4;
    background-color: white;
    border-left: none;
    cursor: pointer;

    .special-item {
      .el-badge__content {
        width: 20px;
        padding: 0 5px;
      }
    }

    .item {
      :deep(.el-badge__content) {
        background-color: #ff4433 !important;
        line-height: 15px;
        height: auto;
        min-width: 18px;
        min-height: 18px;
      }

      :deep(.el-badge__content.is-fixed) {
        top: 14px;
        right: 2px;
      }
    }
  }

  .active {
    background-color: #22ccff;
    font-weight: bold;
  }

  .tab-item:first-child {
    border-left: 1px solid #e5e4e4;
  }
}

.dashboard {
  &-container {
    margin: 30px;
    min-height: 700px;

    .container {
      background: #fff;
      position: relative;
      z-index: 1;
      padding: 30px 28px;
      border-radius: 4px;
      height: calc(100% - 55px);

      .tableBar {
        margin-bottom: 20px;
        justify-content: space-between;
      }

      .tableBox {
        width: 100%;
        border: 1px solid #e4e4e4;
        border-bottom: 0;
        display: flex;
        flex-direction: row;

        .btn_box {
          display: flex;
          align-items: center;
          height: 100%;

          .before,
          .middle,
          .after {
            width: 40px;
            margin: 2px;
          }
        }
      }

      .pageList {
        justify-content: center;
        text-align: center;
        margin-top: 30px;
      }

      .normal-btn {
        background: #333333;
        color: white;
        margin-left: 20px;
      }
    }

    .hContainer {
      height: auto !important;
    }
  }
}

.table-label {
  margin-right: 5px;
  font-size: 14px;
}

.phone-label,
.time-label {
  margin-left: 30px;
}

.order-top {
  border-bottom: 1px solid #e7e6e6;
  padding-bottom: 26px;
  padding-left: 22px;
  padding-right: 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .order-status {
    width: 68px;
    height: 27px;
    background: #333333;
    border-radius: 13.5px;
    color: white;
    margin-left: 19px;
    text-align: center;
    line-height: 27px;
  }

  .status3 {
    background: #f56c6c;
  }

  p {
    color: #333;

    label {
      color: #666;
    }
  }

  .order-num {
    font-size: 16px;
    color: #2a2929;
    font-weight: bold;
    display: inline-block;
  }
}

.order-middle {
  .user-info {
    min-height: 140px;
    background: #fbfbfa;
    margin-top: 10px;
    padding: 10px 43px;
    color: #333;

    .user-info-box {
      text-align: left;
      min-height: 30px;
      display: flex;
      flex-wrap: wrap;

      .user-name {
        flex: 67%;
      }

      .user-phone {
        flex: 33%;
      }

      .user-getTime {
        margin-top: 10px;
        flex: 80%;

        label {
          margin-right: 3px;
        }
      }

      label {
        margin-right: 17px;
        color: #666;
      }

      .user-address {
        margin-top: 14px;
        flex: 80%;

        label {
          margin-right: 30px;
        }
      }
    }

    .user-remark {
      min-height: 43px;
      line-height: 43px;
      background: #f0fbff;
      border: 1px solid #88eeff;
      border-radius: 4px;
      margin-top: 10px;
      padding: 6px;
      display: flex;
      align-items: center;

      div {
        display: inline-block;
        min-width: 53px;
        height: 32px;
        background: #88eeff;
        border-radius: 4px;
        text-align: center;
        line-height: 32px;
        color: #333;
        margin-right: 30px;
      }

      span {
        color: #22ccff;
        line-height: 1.15;
      }
    }

    .orderCancel {
      background: #ffffff;
      border: 1px solid #b6b6b6;

      div {
        padding: 0 10px;
        background-color: #e5e4e4;
      }

      span {
        color: #f56c6c;
      }
    }
  }

  .dish-info {
    display: flex;
    flex-wrap: wrap;
    padding: 20px 40px;
    border-bottom: 1px solid #e7e6e6;

    .dish-label {
      color: #666;
      margin-right: 65px;
    }

    .dish-list {
      flex: 80%;
      display: flex;
      flex-wrap: wrap;

      .dish-item {
        flex: 50%;
        margin-bottom: 14px;
        color: #333;

        .dish-item-box {
          display: inline-block;
          width: 120px;
        }
      }
    }

    .dish-all-amount {
      flex: 1;
      padding-left: 92px;
      margin-top: 10px;

      label {
        color: #333333;
        font-weight: bold;
        margin-right: 5px;
      }

      span {
        color: #f56c6c;
      }
    }
  }
}

.order-bottom {
  .amount-info {
    display: flex;
    flex-wrap: wrap;
    padding: 20px 40px 0;

    .amount-label {
      color: #666;
      margin-right: 65px;
    }

    .amount-list {
      flex: 80%;
      display: flex;
      flex-wrap: wrap;
      color: #333;

      .dish-amount,
      .package-amount,
      .pay-type {
        display: inline-block;
        width: 300px;
        margin-bottom: 14px;
        flex: 50%;
      }

      .send-amount,
      .all-amount,
      .pay-time {
        display: inline-block;
        flex: 50%;
        padding-left: 10%;
      }

      .package-amount {
        .amount-name {
          margin-right: 14px;
        }
      }

      .all-amount {
        .amount-name {
          margin-right: 24px;
        }

        .amount-price {
          color: #f56c6c;
        }
      }

      .send-amount {
        .amount-name {
          margin-right: 10px;
        }
      }
    }
  }
}

:deep(.el-table tr) {
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;

  .blueBtn {
    background: #409eff;
    color: white;
  }
}
</style>
