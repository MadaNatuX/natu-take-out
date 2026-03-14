import {defineStore} from 'pinia'
import {ref} from 'vue'
import type {OrderType} from '@/types/order'
import {normalizeOrderType, TAKEOUT_ORDER_TYPE} from '@/utils/order'

export const useOrderModeStore = defineStore(
  'order-mode',
  () => {
    const orderType = ref<OrderType>(TAKEOUT_ORDER_TYPE)

    const setOrderType = (value?: number | string | null) => {
      orderType.value = normalizeOrderType(value) as OrderType
    }

    return {
      orderType,
      setOrderType
    }
  },
  {
    persist: {
      storage: {
        getItem: (key: string) => uni.getStorageSync(key),
        setItem: (key: string, value: unknown) => uni.setStorageSync(key, value)
      }
    }
  }
)
