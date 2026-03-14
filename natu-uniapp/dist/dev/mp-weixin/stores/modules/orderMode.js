"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_order = require("../../utils/order.js");
const useOrderModeStore = common_vendor.defineStore(
  "order-mode",
  () => {
    const orderType = common_vendor.ref(utils_order.TAKEOUT_ORDER_TYPE);
    const setOrderType = (value) => {
      orderType.value = utils_order.normalizeOrderType(value);
    };
    return {
      orderType,
      setOrderType
    };
  },
  {
    persist: {
      storage: {
        getItem: (key) => common_vendor.index.getStorageSync(key),
        setItem: (key, value) => common_vendor.index.setStorageSync(key, value)
      }
    }
  }
);
exports.useOrderModeStore = useOrderModeStore;
