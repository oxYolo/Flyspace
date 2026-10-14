<!-- 登录页 -->
<template>
  <div class="login-page">
    <div class="login-header">
      <div class="header-container">
        <div class="header-wrap">
          <!-- 左侧菜单 -->
          <div class="header-left">
            <div class="time-info">
              <el-icon><Clock /></el-icon>
              <div class="time-display">{{ currentTime }}</div>
            </div>
          </div>

          <!-- 中间标题 -->
          <div class="header-center">
            <h1 class="main-title">{{ systemName }}</h1>
          </div>

          <!-- 右侧菜单 -->
          <div class="header-right"></div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">用户登录</div>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        size="large"
        @submit.prevent="onSubmit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" clearable>
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            clearable>
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <div class="options">
          <el-checkbox v-model="form.rememberMe">记住密码</el-checkbox>
        </div>
        <el-button
          type="primary"
          class="submit"
          :loading="loading"
          native-type="submit">
          <span v-if="!loading">登 录</span>
          <span v-else>登 录 中...</span>
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
// @ts-ignore
import Cookies from "js-cookie";
import urlConfig from "@/public-path.ts";
import useUserStore from "@/stores/modules/user";
import { encrypt, decrypt } from "@/utils/jsencrypt";

interface LoginForm {
  username: string;
  password: string;
  rememberMe: boolean;
}

const systemName = urlConfig.systemName || "低空智能时空计算引擎";

const rememberCookieKey = "rememberUAVIP";

const formRef = ref();
const form = ref<LoginForm>({
  username: "",
  password: "",
  rememberMe: false,
});

const rules = {
  username: [{ required: true, message: "请输入账号", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const loading = ref(false);

const currentTime = ref("");
let timer: any = null;

const updateTime = () => {
  currentTime.value = dayjs()
    .locale("zh-cn")
    .format("YYYY.MM.DD dddd HH:mm:ss");
};

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
  // 加载记住密码的cookie
  loadRememberCookie();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const onSubmit = () => {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    try {
      loading.value = true;
      // 记住密码
      if (form.value.rememberMe) {
        Cookies.set(
          rememberCookieKey,
          JSON.stringify({
            username: form.value.username,
            password: encrypt(form.value.password).toString(),
            rememberMe: true,
          }),
          { expires: 30 },
        );
      } else {
        Cookies.remove(rememberCookieKey);
      }
      // 登录
      await userStore.login({
        username: form.value.username,
        password: form.value.password,
        rememberMe: form.value.rememberMe,
      });
      const redirect =
        (route.query.redirect as string) || "/defaultMapPage/flyControl/project";
      router.push(redirect);
    } catch (e: any) {
      ElMessage.error(e?.message || "登录失败");
    } finally {
      loading.value = false;
    }
  });
};

// 加载记住密码的cookie
const loadRememberCookie = () => {
  const rememberAdmin = Cookies.get(rememberCookieKey);
  if (rememberAdmin) {
    try {
      const parsed = JSON.parse(rememberAdmin) as {
        username?: string;
        password?: string;
        rememberMe?: boolean;
      };
      const username = parsed?.username;
      const password = parsed?.password;
      const rememberMe = parsed?.rememberMe;

      let decryptedPwd = "";
      if (password !== undefined) {
        const output = decrypt(password);
        if (typeof output === "string") {
          decryptedPwd = output;
        }
      }

      form.value = {
        ...(form.value as any),
        username: username === undefined ? form.value.username : username,
        password: decryptedPwd !== "" ? decryptedPwd : form.value.password,
        rememberMe: Boolean(rememberMe),
      } as LoginForm;
      return;
    } catch {}
  }
};
</script>

<style scoped lang="less">
.login-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 90px;
  box-sizing: border-box;
  background:
    radial-gradient(
      900px circle at 50% -10%,
      rgba(0, 255, 255, 0.18),
      transparent 55%
    ),
    radial-gradient(
      800px circle at 18% 70%,
      rgba(0, 140, 255, 0.12),
      transparent 60%
    ),
    radial-gradient(
      900px circle at 85% 60%,
      rgba(0, 255, 200, 0.08),
      transparent 62%
    ),
    linear-gradient(180deg, #010b16 0%, #031a2c 45%, #020915 100%);
  overflow: hidden;
}
.login-page::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.35) 70%,
    rgba(0, 0, 0, 0.78) 100%
  );
}
.login-page::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.2;
  background:
    radial-gradient(circle, rgba(0, 255, 255, 0.12) 1px, transparent 1.6px) 0
      0 / 140px 140px,
    radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1.8px)
      60px 40px / 180px 180px,
    repeating-linear-gradient(
      0deg,
      rgba(0, 255, 255, 0.05),
      rgba(0, 255, 255, 0.05) 1px,
      transparent 1px,
      transparent 64px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(0, 255, 255, 0.04),
      rgba(0, 255, 255, 0.04) 1px,
      transparent 1px,
      transparent 92px
    );
}
.login-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 90px;
  background: url("@/assets/images/header/top.png") center no-repeat;
  background-size: cover;
  z-index: 10;
  pointer-events: none;

  .header-container {
    height: 90px;
    color: white;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }

  .header-wrap {
    display: flex;
    align-items: center;
    pointer-events: auto;
    margin-top: 10px;
  }
  .header-left {
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;

    .time-info {
      font-size: 16px;
      display: flex;
      align-items: center;
      font-family: com;
      .el-icon {
        color: rgb(64, 158, 255);
        margin: 0 10px;
      }
    }
  }

  .header-center {
    flex: 1.3;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;

    .main-title {
      font-size: 34px;
      font-weight: bold;
      letter-spacing: 3px;
      color: #ffffff;
      text-shadow:
        0 0 10px rgba(0, 255, 255, 0.8),
        0 0 20px rgba(0, 255, 255, 0.6),
        0 0 30px rgba(0, 255, 255, 0.4),
        2px 2px 4px rgba(0, 0, 0, 0.8);
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;
  }

  // 响应式设计
  @media (max-width: 1200px) {
    .header-container {
      padding: 0 15px;
    }

    .header-center .main-title {
      font-size: 20px;
    }

    .header-left .time-display {
      min-width: 150px;
      font-size: 12px;
    }
  }

  @media (max-width: 768px) {
    .header-container {
      flex-direction: column;
      height: auto;
      padding: 10px;
      gap: 10px;
    }

    .header-left,
    .header-right {
      flex: none;
    }

    .header-center .main-title {
      font-size: 18px;
    }

    .menu-item {
      padding: 6px 12px;
      font-size: 12px;
    }
  }
}

.panel {
  position: relative;
  z-index: 2;
  width: 420px;
  padding: 28px 28px 32px;
  border-radius: 12px;
  background: linear-gradient(
    180deg,
    rgba(0, 90, 110, 0.7) 0%,
    rgba(0, 120, 140, 0.65) 45%,
    rgba(0, 78, 114, 0.6) 100%
  );
  border: 1px solid rgba(0, 0, 0, 0.5);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.5),
    inset 0 0 0 1px rgba(0, 255, 255, 0.18),
    inset 0 10px 28px rgba(0, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}
.panel::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    0 0 0 1px rgba(0, 255, 255, 0.15),
    0 0 24px rgba(0, 255, 255, 0.08);
}
.panel-title {
  text-align: center;
  color: #9cecff;
  font-size: 26px;
  margin-bottom: 16px;

  font-weight: bold;
  letter-spacing: 3px;
  text-shadow:
    0 0 10px rgba(0, 255, 255, 0.8),
    0 0 20px rgba(0, 255, 255, 0.6),
    0 0 30px rgba(0, 255, 255, 0.4),
    2px 2px 4px rgba(0, 0, 0, 0.8);
}
.login-form {
  margin-top: 8px;
}
.options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: #b6d4e3;

  :deep(.el-checkbox) {
    --el-checkbox-text-color: #edffff;
  }
}
.submit {
  font-size: 16px;
}
.el-button {
  width: 100%;
  height: 44px;
  border-radius: 6px;
  margin-top: 12px;
  background: linear-gradient(90deg, #01d1ca 0%, #01d1ca 100%) !important;
  box-shadow: 0 0 18px rgba(0, 255, 255, 0.35);
}
</style>
