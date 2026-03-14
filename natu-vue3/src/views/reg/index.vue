<script setup lang="ts" name:="my-register">
// 导出是命名导出，所以这里导入要加{}
import { registerAPI } from '@/api/employee'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const form = ref({ // 表单的数据对象
  account: '', // 用户名
  password: '', // 密码
  repassword: '' // 确认密码
})
// 表单校验的ref
const registerRef = ref()

// 自定义校验规则: 两次密码是否一致
// 注意：必须在data函数里定义此箭头函数，才能确保this.from能使用，从而获取到password的值
const samePwd = (rules: any, value: any, callback: any) => {
  if (value !== form.value.password) {
    // 如果验证失败，则调用 回调函数时，指定一个 Error 对象。
    callback(new Error('两次输入的密码不一致!'))
  } else {
    // 如果验证成功，则直接调用 callback 回调函数即可。
    callback()
  }
}
const rules = { // 表单的规则检验对象
  account: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9]{1,10}$/,
      message: '用户名必须是1-10的大小写字母数字',
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: /^\S{6,15}$/,
      message: '密码必须是6-15的非空字符',
      trigger: 'blur'
    }
  ],
  repassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { pattern: /^\S{6,15}$/, message: '密码必须是6-15的非空字符', trigger: 'blur' },
    { validator: samePwd, trigger: 'blur' }
  ]
}

const router = useRouter()

const registerFn = async () => {
  // 先校验输入格式是否合法
  const valid = await registerRef.value.validate()
  if (valid) {
    // 通过校验，拿到绑定的数据
    console.log('注册的表单ref:  ', registerRef)
    console.log('form.value:  ', form.value)
    // 1.调用注册接口，通过接口的return request，拿到promise对象
    const { data: res } = await registerAPI(form.value)
    console.log(res)
    // 2.注册失败，响应拦截器已经ElMessage提示用户，这里直接返回
    if (res.code !== 0) {
      console.log('注册失败！')
      return false
    }
    // 3.注册成功，提示用户
    ElMessage.success('注册成功!')
    // 4.路由跳转到登录页面
    router.push('/login')
  } else {
    return false // 阻止默认提交行为（表单下面红色提示）
  }
}
</script>

<template>
  <div class="auth-page auth-page--register">
    <div class="auth-shell">
      <section class="auth-copy">
        <p class="eyebrow">ADMIN CONSOLE</p>
        <div class="brand-badge">爱吃点餐后台</div>
        <h1 class="headline">创建后台账号</h1>
        <p class="subhead">
          新账号创建完成后，就可以回到登录页进入系统开始管理门店业务。
        </p>
        <div class="tag-list">
          <span>菜品管理</span>
          <span>套餐管理</span>
          <span>营业设置</span>
        </div>
      </section>

      <div class="auth-card">
        <div class="card-head">
          <div class="card-kicker">新账号创建</div>
          <div class="card-title">注册</div>
          <div class="card-desc">填写账号和密码，完成后台账号开通</div>
        </div>

        <el-form :model="form" label-width="0px" :rules="rules" ref="registerRef">
          <el-form-item prop="account">
            <el-input placeholder="请输入用户名" v-model="form.account"></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input type="password" placeholder="请输入密码" v-model="form.password"></el-input>
          </el-form-item>
          <el-form-item prop="repassword">
            <el-input type="password" placeholder="请再次确认密码" v-model="form.repassword"></el-input>
          </el-form-item>
          <el-form-item class="actions">
            <el-button type="primary" class="primary-btn" @click="registerFn">注册</el-button>
            <div class="switch-line">
              已有账号？
              <el-link type="primary" @click="router.push('/login')">去登录</el-link>
            </div>
          </el-form-item>
        </el-form>
      </div>
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

:deep(.el-input__inner) {
  color: #333333;
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
