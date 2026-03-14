"use strict";
const TAKEOUT_ORDER_TYPE = 1;
const DINE_IN_ORDER_TYPE = 2;
const normalizeOrderType = (value) => {
  return Number(value) === DINE_IN_ORDER_TYPE ? DINE_IN_ORDER_TYPE : TAKEOUT_ORDER_TYPE;
};
const isDineInOrder = (value) => {
  return normalizeOrderType(value) === DINE_IN_ORDER_TYPE;
};
const getOrderStatusText = (status, orderType) => {
  if (isDineInOrder(orderType)) {
    switch (status) {
      case 1:
        return "待付款";
      case 4:
        return "备餐中";
      case 5:
        return "已完成";
      case 6:
        return "已取消";
      default:
        return "订单处理中";
    }
  }
  switch (status) {
    case 1:
      return "待付款";
    case 2:
      return "待接单";
    case 3:
      return "已接单";
    case 4:
      return "派送中";
    case 5:
      return "已完成";
    case 6:
      return "已取消";
    default:
      return "订单处理中";
  }
};
const getOrderItemCount = (orderDetailList) => {
  return (orderDetailList || []).reduce((total, item) => total + (item.number || 0), 0);
};
const getOrderModeLabel = (orderType) => {
  return isDineInOrder(orderType) ? "堂食" : "外卖";
};
exports.DINE_IN_ORDER_TYPE = DINE_IN_ORDER_TYPE;
exports.TAKEOUT_ORDER_TYPE = TAKEOUT_ORDER_TYPE;
exports.getOrderItemCount = getOrderItemCount;
exports.getOrderModeLabel = getOrderModeLabel;
exports.getOrderStatusText = getOrderStatusText;
exports.isDineInOrder = isDineInOrder;
exports.normalizeOrderType = normalizeOrderType;
