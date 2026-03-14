"use strict";
const common_vendor = require("../../../common/vendor.js");
const common_assets = require("../../../common/assets.js");
const api_shop = require("../../../api/shop.js");
const stores_modules_orderMode = require("../../../stores/modules/orderMode.js");
const utils_order = require("../../../utils/order.js");
require("../../../utils/http.js");
require("../../../stores/modules/user.js");
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  _easycom_uni_icons2();
}
const _easycom_uni_icons = () => "../../../node-modules/@dcloudio/uni-ui/lib/uni-icons/uni-icons.js";
if (!Math) {
  _easycom_uni_icons();
}
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "Navbar",
  setup(__props) {
    const status = common_vendor.ref(true);
    const orderModeStore = stores_modules_orderMode.useOrderModeStore();
    const orderTypeOptions = [
      { label: "外卖", value: utils_order.TAKEOUT_ORDER_TYPE },
      { label: "堂食", value: utils_order.DINE_IN_ORDER_TYPE }
    ];
    const currentOrderType = common_vendor.computed(() => orderModeStore.orderType);
    const serviceText = common_vendor.computed(() => currentOrderType.value === utils_order.DINE_IN_ORDER_TYPE ? "堂食用餐" : "配送费6元");
    const { safeAreaInsets } = common_vendor.index.getSystemInfoSync();
    common_vendor.onLoad(async () => {
      const res = await api_shop.getStatusAPI();
      console.log("店铺状态---------", res);
      status.value = res.data === 1 ? true : false;
    });
    const back = () => {
      common_vendor.index.switchTab({ url: "/pages/index/index" });
    };
    const phone = () => {
      common_vendor.index.makePhoneCall({ phoneNumber: "1999" });
    };
    const switchOrderType = (value) => {
      orderModeStore.setOrderType(value);
    };
    return (_ctx, _cache) => {
      var _a;
      return {
        a: common_assets._imports_0$1,
        b: common_vendor.o(back),
        c: common_assets._imports_1,
        d: ((_a = common_vendor.unref(safeAreaInsets)) == null ? void 0 : _a.top) + "px",
        e: common_vendor.t(status.value === true ? "营业中" : "打烊中"),
        f: common_vendor.p({
          ["custom-prefix"]: "iconfont",
          type: "icon-qian",
          size: "15"
        }),
        g: common_vendor.t(serviceText.value),
        h: common_vendor.o(phone),
        i: common_vendor.p({
          ["custom-prefix"]: "iconfont",
          type: "icon-dianhua",
          size: "20"
        }),
        j: common_vendor.f(orderTypeOptions, (item, k0, i0) => {
          return {
            a: common_vendor.t(item.label),
            b: item.value,
            c: currentOrderType.value === item.value ? 1 : "",
            d: common_vendor.o(($event) => switchOrderType(item.value), item.value)
          };
        })
      };
    };
  }
});
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-e1a17746"], ["__file", "D:/code for learning/biue/natu_deliveray/natu-uniapp/src/pages/order/components/Navbar.vue"]]);
wx.createComponent(Component);
