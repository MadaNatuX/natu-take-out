"use strict";
const common_vendor = require("../../common/vendor.js");
const api_address = require("../../api/address.js");
const api_cart = require("../../api/cart.js");
const api_order = require("../../api/order.js");
const stores_modules_address = require("../../stores/modules/address.js");
const stores_modules_orderMode = require("../../stores/modules/orderMode.js");
const utils_order = require("../../utils/order.js");
require("../../utils/http.js");
require("../../stores/modules/user.js");
const DELIVERY_FEE = 6;
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "submit",
  setup(__props) {
    const store = stores_modules_address.useAddressStore();
    const orderModeStore = stores_modules_orderMode.useOrderModeStore();
    const cartList = common_vendor.ref([]);
    const address = common_vendor.ref("");
    const label = common_vendor.ref("");
    const consignee = common_vendor.ref("");
    const phoneNumber = common_vendor.ref("");
    const estimatedDeliveryTime = common_vendor.ref("");
    const openCooker = common_vendor.ref(false);
    const cookerNum = common_vendor.ref(-2);
    const cookers = common_vendor.ref([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const radioStatus = common_vendor.ref(false);
    const remark = common_vendor.ref("");
    const arrivalTime = common_vendor.ref("");
    const addressId = common_vendor.ref(0);
    const currentOrderType = common_vendor.computed(() => orderModeStore.orderType);
    const isTakeoutMode = common_vendor.computed(() => currentOrderType.value === utils_order.TAKEOUT_ORDER_TYPE);
    const deliveryFee = DELIVERY_FEE;
    const cartItemCount = common_vendor.computed(() => cartList.value.reduce((acc, cur) => acc + cur.number, 0));
    const dishTotalPrice = common_vendor.computed(() => cartList.value.reduce((acc, cur) => acc + cur.amount * cur.number, 0));
    const packAmount = common_vendor.computed(() => cartItemCount.value);
    const takeoutTotal = common_vendor.computed(() => dishTotalPrice.value + packAmount.value + DELIVERY_FEE);
    const dineInTotal = common_vendor.computed(() => dishTotalPrice.value);
    const displayTotalPrice = common_vendor.computed(() => formatPrice(isTakeoutMode.value ? takeoutTotal.value : dineInTotal.value));
    const selectedCookerIndex = common_vendor.computed(() => {
      const currentIndex = cookers.value.findIndex((item) => item === cookerNum.value);
      return [currentIndex >= 0 ? currentIndex : 0];
    });
    const getCartList = async () => {
      const res = await api_cart.getCartAPI();
      cartList.value = res.data;
    };
    common_vendor.onLoad(async (options) => {
      if (isTakeoutMode.value) {
        await getAddressBookDefault();
      }
      if (options.address) {
        const addressObj = JSON.parse(options.address);
        addressId.value = addressObj.id;
        label.value = addressObj.label;
        address.value = addressObj.provinceName + addressObj.cityName + addressObj.districtName + addressObj.detail;
        phoneNumber.value = addressObj.phone;
        consignee.value = addressObj.consignee;
      }
      if (options.remark) {
        remark.value = options.remark;
      }
      await getCartList();
      getHarfAnOur();
      if (store.defaultCook === "无需餐具") {
        cookerNum.value = -1;
      } else if (store.defaultCook === "商家依据餐量提供") {
        cookerNum.value = 0;
      }
    });
    common_vendor.onShow(async () => {
      await getCartList();
    });
    const formatPrice = (value) => {
      return (Math.round(value * 100) / 100).toFixed(2);
    };
    const DateToStr = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const hours = date.getHours();
      const min = date.getMinutes();
      const second = date.getSeconds();
      return year + "-" + (month + 1 > 9 ? month + 1 : "0" + (month + 1)) + "-" + (day > 9 ? day : "0" + day) + " " + (hours > 9 ? hours : "0" + hours) + ":" + (min > 9 ? min : "0" + min) + ":" + (second > 9 ? second : "0" + second);
    };
    const getHarfAnOur = () => {
      const date = /* @__PURE__ */ new Date();
      date.setTime(date.getTime() + 36e5);
      estimatedDeliveryTime.value = DateToStr(date);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      arrivalTime.value = hours + ":" + minutes;
    };
    const getAddressBookDefault = async () => {
      const res = await api_address.getDefaultAddressAPI();
      if (res.code === 0) {
        addressId.value = 0;
        if (res.data.provinceName) {
          address.value = res.data.provinceName + res.data.cityName + res.data.districtName + res.data.detail;
        }
        phoneNumber.value = res.data.phone;
        consignee.value = res.data.consignee;
        addressId.value = res.data.id;
      }
    };
    const trans = (item) => {
      switch (item) {
        case "公司":
          return "1";
        case "家":
          return "2";
        case "学校":
          return "3";
        default:
          return "4";
      }
    };
    const goAddress = () => {
      if (!isTakeoutMode.value) {
        return;
      }
      store.addressBackUrl = "/pages/submit/submit";
      common_vendor.index.redirectTo({
        url: "/pages/address/address"
      });
    };
    const goRemark = () => {
      common_vendor.index.redirectTo({
        url: "/pages/remark/remark"
      });
    };
    const chooseCooker = () => {
      openCooker.value = true;
    };
    const getCookerInfo = () => {
      if (cookerNum.value === -2)
        return "请依据实际情况填写，避免浪费";
      if (cookerNum.value === -1)
        return "无需餐具";
      if (cookerNum.value === 0)
        return "商家依据餐量提供";
      if (cookerNum.value === 11)
        return "10份以上";
      return cookerNum.value + "份";
    };
    const pickerChange = (ev) => {
      cookerNum.value = cookers.value[ev.detail.value[0]];
    };
    const radioChange = () => {
      radioStatus.value = !radioStatus.value;
      if (radioStatus.value) {
        store.defaultCook = cookerNum.value === -1 ? "无需餐具" : "商家依据餐量提供";
      } else {
        store.defaultCook = "请依据实际情况填写，避免浪费";
      }
    };
    const closeMask = () => {
      openCooker.value = false;
    };
    const payOrderHandle = async () => {
      const unPayRes = await api_order.getUnPayOrderAPI();
      if (unPayRes.data !== 0) {
        common_vendor.index.showToast({
          title: "有未支付订单，请先支付或取消！",
          icon: "none"
        });
        return false;
      }
      if (isTakeoutMode.value && !address.value) {
        common_vendor.index.showToast({
          title: "请选择收货地址",
          icon: "none"
        });
        return false;
      }
      if (cookerNum.value === -2) {
        common_vendor.index.showToast({
          title: "请选择餐具份数",
          icon: "none"
        });
        return false;
      }
      const params = {
        payMethod: 1,
        remark: remark.value,
        orderType: currentOrderType.value,
        tablewareNumber: cookerNum.value,
        tablewareStatus: cookerNum.value === 0 ? 1 : 0,
        amount: isTakeoutMode.value ? takeoutTotal.value : dineInTotal.value
      };
      if (isTakeoutMode.value) {
        Object.assign(params, {
          addressId: addressId.value,
          estimatedDeliveryTime: estimatedDeliveryTime.value,
          deliveryStatus: 1,
          packAmount: packAmount.value
        });
      }
      const res = await api_order.submitOrderAPI(params);
      if (res.code === 0) {
        common_vendor.index.redirectTo({
          url: "/pages/pay/pay?orderId=" + res.data.id + "&orderAmount=" + res.data.orderAmount + "&orderNumber=" + res.data.orderNumber + "&orderTime=" + res.data.orderTime
        });
      } else {
        common_vendor.index.showToast({
          title: res.msg || "操作失败",
          icon: "none"
        });
      }
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: isTakeoutMode.value
      }, isTakeoutMode.value ? common_vendor.e({
        b: !address.value
      }, !address.value ? {} : {
        c: common_vendor.t(label.value || "其他"),
        d: common_vendor.n("tag" + trans(label.value)),
        e: common_vendor.t(address.value),
        f: common_vendor.t(consignee.value),
        g: common_vendor.t(phoneNumber.value)
      }, {
        h: common_vendor.o(goAddress),
        i: common_vendor.t(arrivalTime.value)
      }) : {}, {
        j: common_vendor.f(cartList.value, (obj, index, i0) => {
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
        k: isTakeoutMode.value
      }, isTakeoutMode.value ? {
        l: common_vendor.t(packAmount.value)
      } : {}, {
        m: isTakeoutMode.value
      }, isTakeoutMode.value ? {
        n: common_vendor.t(common_vendor.unref(deliveryFee))
      } : {}, {
        o: common_vendor.t(displayTotalPrice.value),
        p: common_vendor.t(remark.value || "选择口味等"),
        q: common_vendor.o(goRemark),
        r: common_vendor.t(getCookerInfo()),
        s: common_vendor.o(chooseCooker),
        t: common_vendor.t(cartItemCount.value),
        v: common_vendor.t(displayTotalPrice.value),
        w: common_vendor.o(($event) => payOrderHandle()),
        x: common_vendor.o(closeMask),
        y: common_vendor.f(cookers.value, (item, k0, i0) => {
          return {
            a: common_vendor.t(item === -1 ? "无需餐具" : item === 0 ? "商家依据餐量提供" : item === 11 ? "10份以上" : item + "份"),
            b: item
          };
        }),
        z: selectedCookerIndex.value,
        A: common_vendor.o(pickerChange),
        B: radioStatus.value,
        C: common_vendor.o(radioChange),
        D: common_vendor.t(cookerNum.value === -2 || cookerNum.value === -1 ? "以后都无需餐具" : "以后都需要餐具，商家依据餐量提供"),
        E: common_vendor.o(($event) => openCooker.value = !openCooker.value),
        F: common_vendor.o(($event) => openCooker.value = openCooker.value),
        G: openCooker.value,
        H: common_vendor.o(($event) => openCooker.value = !openCooker.value)
      });
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-fb87e98c"], ["__file", "D:/code for learning/biue/natu_deliveray/natu-uniapp/src/pages/submit/submit.vue"]]);
wx.createPage(MiniProgramPage);
