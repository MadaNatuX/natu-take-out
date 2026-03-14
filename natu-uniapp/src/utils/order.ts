import type {Order, OrderDetail} from '@/types/order'

export const TAKEOUT_ORDER_TYPE = 1
export const DINE_IN_ORDER_TYPE = 2

export const normalizeOrderType = (value?: number | string | null) => {
  return Number(value) === DINE_IN_ORDER_TYPE ? DINE_IN_ORDER_TYPE : TAKEOUT_ORDER_TYPE
}

export const isDineInOrder = (value?: number | string | null) => {
  return normalizeOrderType(value) === DINE_IN_ORDER_TYPE
}

export const getOrderStatusText = (status?: number, orderType?: number | string | null) => {
  if (isDineInOrder(orderType)) {
    switch (status) {
      case 1:
        return '待付款'
      case 4:
        return '备餐中'
      case 5:
        return '已完成'
      case 6:
        return '已取消'
      default:
        return '订单处理中'
    }
  }

  switch (status) {
    case 1:
      return '待付款'
    case 2:
      return '待接单'
    case 3:
      return '已接单'
    case 4:
      return '派送中'
    case 5:
      return '已完成'
    case 6:
      return '已取消'
    default:
      return '订单处理中'
  }
}

export const getOrderItemCount = (orderDetailList?: OrderDetail[]) => {
  return (orderDetailList || []).reduce((total, item) => total + (item.number || 0), 0)
}

export const formatAmount = (amount?: number | string | null) => {
  const numericAmount = Number(amount)
  return Number.isNaN(numericAmount) ? '0.00' : numericAmount.toFixed(2)
}

export const getOrderModeLabel = (orderType?: Order['orderType']) => {
  return isDineInOrder(orderType) ? '堂食' : '外卖'
}
