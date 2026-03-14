"use strict";
const common_vendor = require("../../common/vendor.js");
const api_order = require("../../api/order.js");
const api_cart = require("../../api/cart.js");
const stores_modules_countdown = require("../../stores/modules/countdown.js");
const stores_modules_orderMode = require("../../stores/modules/orderMode.js");
const utils_order = require("../../utils/order.js");
require("../../utils/http.js");
require("../../stores/modules/user.js");
if (!Array) {
  const _easycom_uni_countdown2 = common_vendor.resolveComponent("uni-countdown");
  _easycom_uni_countdown2();
}
const _easycom_uni_countdown = () => "../../node-modules/@dcloudio/uni-ui/lib/uni-countdown/uni-countdown.js";
if (!Math) {
  (_easycom_uni_countdown + pushMsg)();
}
const pushMsg = () => "../../components/message/pushMsg.js";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "orderDetail",
  setup(__props) {
    const childComp = common_vendor.ref(null);
    const countdownStore = stores_modules_countdown.useCountdownStore();
    const orderModeStore = stores_modules_orderMode.useOrderModeStore();
    const order = common_vendor.reactive({
      id: 0,
      // 订单id
      number: "",
      // 订单号
      status: 0,
      // 订单状态 1待付款 2待接单 3已接单 4派送中 5已完成 6已取消
      userId: 0,
      // 下单用户id
      addressBookId: 0,
      // 地址id
      orderTime: /* @__PURE__ */ new Date(),
      // 下单时间
      orderDetailList: []
      // 订单详情
    });
    const isDineInMode = common_vendor.computed(() => utils_order.isDineInOrder(order.orderType));
    const isTakeoutMode = common_vendor.computed(() => !isDineInMode.value);
    const statusText = common_vendor.computed(() => utils_order.getOrderStatusText(order.status, order.orderType));
    const orderModeText = common_vendor.computed(() => utils_order.getOrderModeLabel(order.orderType));
    const showPushOrder = common_vendor.computed(() => order.status === 2 && isTakeoutMode.value);
    common_vendor.onLoad(async (options) => {
      order.id = Number(options.orderId);
      await getOrderDetail();
    });
    const getOrderDetail = async () => {
      const res = await api_order.getOrderAPI(order.id);
      Object.assign(order, res.data);
    };
    const cancelOrder = async () => {
      const res = await api_order.cancelOrderAPI(order.id);
      if (res.code === 0) {
        common_vendor.index.showToast({
          title: "订单已取消",
          icon: "none"
        });
      } else {
        common_vendor.index.showModal({
          title: "提示",
          content: "商家已接单，欲取消订单请与商家联系！",
          showCancel: false,
          // 不显示取消按钮
          success(res2) {
            if (res2.confirm) {
              console.log("用户点击确定");
            }
          }
        });
      }
      await getOrderDetail();
    };
    const pushOrder = async () => {
      await api_order.urgeOrderAPI(order.id);
      if (childComp.value) {
        childComp.value.openPopup();
      }
    };
    const reOrder = async () => {
      await api_cart.cleanCartAPI();
      await api_order.reOrderAPI(order.id);
      orderModeStore.setOrderType(order.orderType);
      common_vendor.index.redirectTo({
        url: "/pages/order/order"
      });
    };
    const connectShop = () => {
      common_vendor.index.makePhoneCall({
        phoneNumber: "1999"
      });
    };
    const toPay = async () => {
      common_vendor.index.redirectTo({
        url: "/pages/pay/pay?orderId=" + order.id + "&orderNumber=" + order.number + "&orderAmount=" + order.amount + "&orderTime=" + order.orderTime
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(statusText.value),
        b: order.status === 1
      }, order.status === 1 ? common_vendor.e({
        c: common_vendor.unref(countdownStore).showM <= 0 && common_vendor.unref(countdownStore).showS <= 0
      }, common_vendor.unref(countdownStore).showM <= 0 && common_vendor.unref(countdownStore).showS <= 0 ? {} : {
        d: common_vendor.p({
          color: "#888",
          ["show-day"]: false,
          ["show-hour"]: false,
          minute: common_vendor.unref(countdownStore).showM,
          second: common_vendor.unref(countdownStore).showS
        })
      }) : {}, {
        e: order.status <= 2
      }, order.status <= 2 ? {
        f: common_vendor.o(cancelOrder)
      } : {}, {
        g: order.status === 1 && (common_vendor.unref(countdownStore).showM > 0 || common_vendor.unref(countdownStore).showS > 0)
      }, order.status === 1 && (common_vendor.unref(countdownStore).showM > 0 || common_vendor.unref(countdownStore).showS > 0) ? {
        h: common_vendor.o(toPay)
      } : {}, {
        i: showPushOrder.value
      }, showPushOrder.value ? {
        j: common_vendor.o(pushOrder)
      } : {}, {
        k: order.status === 2 || order.status === 6
      }, order.status === 2 || order.status === 6 ? {
        l: common_vendor.o(reOrder)
      } : {}, {
        m: common_vendor.f(order.orderDetailList, (obj, index, i0) => {
          return common_vendor.e({
            a: obj.pic,
            b: common_vendor.t(obj.name),
            c: obj.dishFlavor
          }, obj.dishFlavor ? {
            d: common_vendor.t(obj.dishFlavor)
          } : {}, {
            e: obj.number && obj.number > 0
          }, obj.number && obj.number > 0 ? {
            f: common_vendor.t(obj.number)
          } : {}, {
            g: common_vendor.t(obj.amount),
            h: index
          });
        }),
        n: isTakeoutMode.value
      }, isTakeoutMode.value ? {
        o: common_vendor.t(order.packAmount)
      } : {}, {
        p: isTakeoutMode.value
      }, isTakeoutMode.value ? {} : {}, {
        q: common_vendor.t(order.amount),
        r: common_vendor.o(connectShop),
        s: common_vendor.t(order.remark),
        t: common_vendor.t(order.tablewareNumber == -1 ? "无需餐具" : order.tablewareNumber == 0 ? "商家根据餐量提供" : order.tablewareNumber),
        v: common_vendor.t(order.number),
        w: isDineInMode.value
      }, isDineInMode.value ? {
        x: common_vendor.t(order.inNumber ?? "--")
      } : {}, {
        y: common_vendor.t(order.orderTime),
        z: isTakeoutMode.value
      }, isTakeoutMode.value ? {
        A: common_vendor.t(order.address)
      } : {}, {
        B: common_vendor.t(orderModeText.value),
        C: common_vendor.sr(childComp, "2d945b00-1", {
          "k": "childComp"
        })
      });
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-2d945b00"], ["__file", "D:/code for learning/biue/natu_deliveray/natu-uniapp/src/pages/orderDetail/orderDetail.vue"]]);
wx.createPage(MiniProgramPage);
