<script setup lang="ts">
import { loginAPI } from '@/api/employee'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserInfoStore } from '@/store'

const userInfoStore = useUserInfoStore()

const form = ref({
  account: '',
  password: ''
});
// 表单校验的ref
const loginRef = ref()

const rules = {
  account: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]{1,10}$/, message: '用户名必须是1-10的字母数字', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { pattern: /^\S{6,15}$/, message: '密码必须是6-15的非空字符', trigger: 'blur' }
  ]
}

const router = useRouter()

const loginFn = async () => {
  // 先校验输入格式是否合法
  const valid = await loginRef.value.validate()
  if (valid) {
    // 调用登录接口
    const { data: res } = await loginAPI(form.value)
    console.log(res)
    // 登录失败，提示用户，这个提示已经在响应拦截器中统一处理了，这里直接return就行
    if (res.code !== 0) {
      return false
    }
    // 登录成功，提示用户
    ElMessage.success('登录成功')
    // 把后端返回的当前登录用户信息(包括token)存储到Pinia里
    userInfoStore.userInfo = res.data
    console.log(userInfoStore.userInfo)
    // 跳转到首页
    router.push('/')
  } else {
    return false
  }
}
</script>

<template>
  <div class="auth-page auth-page--login">
    <div class="auth-shell">
      <section class="auth-copy">
        <p class="eyebrow">ADMIN CONSOLE</p>
        <div class="brand-badge">爱吃点餐后台</div>
        <h1 class="headline">欢迎回来</h1>
        <p class="subhead">
          登录后即可进入控制台，继续处理订单、菜品、套餐和员工管理。
        </p>
        <div class="tag-list">
          <span>订单管理</span>
          <span>分类管理</span>
          <span>员工管理</span>
        </div>
      </section>

      <el-form label-width="0px" class="auth-card" :model="form" :rules="rules" ref="loginRef">
        <div class="card-head">
          <div class="card-kicker">管理员入口</div>
          <div class="card-title">登录</div>
          <div class="card-desc">输入账号和密码后进入后台首页</div>
        </div>
        <el-form-item prop="account">
          <el-input v-model="form.account" placeholder="请输入账号"></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input type="password" v-model="form.password" placeholder="请输入密码"></el-input>
        </el-form-item>
        <el-form-item class="actions">
          <el-button type="primary" class="primary-btn" @click="loginFn">登录</el-button>
          <div class="switch-line">
            还没有账号？
            <el-link type="primary" @click="$router.push('/reg')">去注册</el-link>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>


<style lang="less" scoped>
.auth-page {
  min-height: 100vh;
  padding: 32px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e9f5ff;
}

.auth-shell {
  width: min(980px, 100%);
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(360px, 420px);
  gap: 32px;
  align-items: stretch;
}

.auth-copy {
  padding: 56px 48px;
  border-radius: 16px;
  background-color: #00aaff;
  color: #ffffff;
  box-shadow: 0 18px 40px rgba(0, 170, 255, 0.18);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.eyebrow {
  margin: 0 0 18px;
  font-size: 12px;
  letter-spacing: 0.28em;
  color: rgba(255, 255, 255, 0.78);
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-bottom: 22px;
  padding: 8px 14px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.headline {
  margin: 0;
  font-size: 42px;
  line-height: 1.15;
  font-weight: 700;
}

.subhead {
  margin: 20px 0 0;
  max-width: 420px;
  font-size: 16px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.88);
}

.tag-list {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tag-list span {
  padding: 10px 14px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 13px;
}

.auth-card {
  padding: 34px 30px 28px;
  border-radius: 16px;
  background-color: #ffffff;
  border-top: 6px solid #00aaff;
  box-shadow: 0 18px 40px rgba(26, 74, 115, 0.12);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-head {
  margin-bottom: 18px;
}

.card-kicker {
  font-size: 12px;
  color: #6d8aa5;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.card-title {
  margin-top: 10px;
  font-size: 32px;
  font-weight: 700;
  color: #333333;
}

.card-desc {
  margin-top: 8px;
  font-size: 14px;
  color: #666666;
}

.actions {
  margin-bottom: 0;
}

.primary-btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 10px;
  background-color: #00aaff;
}

.switch-line {
  margin-top: 18px;
  text-align: center;
  color: #666666;
  font-size: 14px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input__wrapper) {
  min-height: 46px;
  border-radius: 10px;
  background-color: #f4fbff;
  box-shadow: 0 0 0 1px #d8ecf7 inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #00aaff inset;
}

@media (max-width: 900px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .auth-copy {
    padding: 36px 28px;
  }

  .headline {
    font-size: 34px;
  }
}

@media (max-width: 520px) {
  .auth-page {
    padding: 18px;
  }

  .auth-copy,
  .auth-card {
    padding-left: 22px;
    padding-right: 22px;
  }

  .headline {
    font-size: 28px;
  }
}
</style>
