import router from './index'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from "@/utils/auth.ts";
import useUserStore from '@/stores/modules/user'
// ==================== 配置 ====================
NProgress.configure({ showSpinner: false })

// 全局前置守卫 - 基于 Token 的校验
router.beforeEach(async (to: any, from: any, next: any) => {
  NProgress.start()

  try {
    const token = getToken()
    if (to.path === '/login') {
      if (token) {
        next({ path: '/' })
      } else {
        next()
      }
      return
    }

    if (token) {
      const userStore = useUserStore()
      await userStore.getUserInfo()
      next()
    } else {
      next({
        path: '/login',
        query: { redirect: to.fullPath },
      })
    }
  } catch (error: any) {
    console.error('路由守卫执行出错:', error)
    next({ path: '/login' })
  }
})

// 全局后置守卫
router.afterEach(() => {
  NProgress.done()
})
