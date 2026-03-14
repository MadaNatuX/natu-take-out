"use strict";
const common_vendor = require("../../common/vendor.js");
const api_order = require("../../api/order.js");
const utils_order = require("../../utils/order.js");
require("../../utils/http.js");
require("../../stores/modules/user.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "success",
  setup(__props) {
    const orderId = common_vendor.ref(0);
    const arrivalTime = common_vendor.ref("");
    const orderType = common_vendor.ref(1);
    const inNumber = common_vendor.ref(null);
    const isDineInMode = common_vendor.computed(() => utils_order.isDineInOrder(orderType.value));
    const inNumberDisplay = common_vendor.computed(() => inNumber.value === null || inNumber.value === void 0 ? "--" : inNumber.value);
    common_vendor.onLoad(async (options) => {
      orderId.value = Number(options.orderId);
      getHarfAnOur();
      if (!orderId.value) {
        return;
      }
      const res = await api_order.getOrderAPI(orderId.value);
      orderType.value = res.data.orderType || 1;
      inNumber.value = res.data.inNumber ?? null;
    });
    const getHarfAnOur = () => {
      const date = /* @__PURE__ */ new Date();
      date.setTime(date.getTime() + 36e5);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      arrivalTime.value = hours + ":" + minutes;
    };
    const toHome = () => {
      common_vendor.index.switchTab({
        url: "/pages/index/index"
      });
    };
    const toDetail = () => {
      common_vendor.index.redirectTo({
        url: "/pages/orderDetail/orderDetail?orderId=" + orderId.value
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: isDineInMode.value
      }, isDineInMode.value ? {
        b: common_vendor.t(inNumberDisplay.value)
      } : {
        c: common_vendor.t(arrivalTime.value)
      }, {
        d: common_vendor.o(($event) => toHome()),
        e: common_vendor.o(($event) => toDetail())
      });
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-03f045ab"], ["__file", "D:/code for learning/biue/natu_deliveray/natu-uniapp/src/pages/submit/success.vue"]]);
wx.createPage(MiniProgramPage);
