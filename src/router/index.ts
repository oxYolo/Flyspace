import { createRouter, createWebHashHistory } from "vue-router";
import type { AppRouteRecordRaw } from "@/model/routesModel";

/**
 * Note: 路由配置项
 *
 * hidden: true                     // 当设置 true 的时候该路由不会再侧边栏出现 如401，login等页面，或者如一些编辑页面/edit/1
 * alwaysShow: true                 // 当你一个路由下面的 children 声明的路由大于1个时，自动会变成嵌套的模式--如组件页面
 *                                  // 只有一个时，会将那个子路由当做根路由显示在侧边栏--如引导页面
 *                                  // 若你想不管路由下面的 children 声明的个数都显示你的根路由
 *                                  // 你可以设置 alwaysShow: true，这样它就会忽略之前定义的规则，一直显示根路由
 * redirect: noRedirect             // 当设置 noRedirect 的时候该路由在面包屑导航中不可被点击
 * name:'router-name'               // 设定路由的名字，一定要填写不然使用<keep-alive>时会出现各种问题
 * query: '{"id": 1, "name": "ry"}' // 访问路由的默认传递参数
 * roles: ['admin', 'common']       // 访问路由的角色权限
 * permissions: ['a:a:a', 'b:b:b']  // 访问路由的菜单权限
 * meta : {
    noCache: true                   // 如果设置为true，则不会被 <keep-alive> 缓存(默认 false)
    title: 'title'                  // 设置该路由在侧边栏和面包屑中展示的名字
    icon: 'svg-name'                // 设置该路由的图标，对应路径src/assets/icons/svg
    breadcrumb: false               // 如果设置为false，则不会在breadcrumb面包屑中显示
    activeMenu: '/system/user'      // 当路由设置了该属性，则会高亮相对应的侧边栏。
  }
 */

// 公共路由
export const constantRoutes: AppRouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/modules/login/Login.vue"),
    meta: { title: "登录", hidden: true },
  },
  {
    path: "/",
    component: () => import("@/views/index.vue"),
    redirect: "/defaultMapPage",
    children: [
      {
        path: "twinMap",
        component: () => import("@/views/modules/twinMap/index.vue"),
      },
      {
        path: "defaultMapPage",
        component: () => import("@/views/modules/defaultMapPage/index.vue"),
        redirect: "/defaultMapPage/flyControl/project",
        children: [
          // {
          //   path: "home",
          //   component: () =>
          //     import("@/views/modules/defaultMapPage/home/index.vue"),
          //   meta: { title: "首页" },
          // },
          {
            path: "flyControl",
            component: () => import("@/views/modules/flyControl/index.vue"),
            redirect: "/defaultMapPage/flyControl/project",
            children: [
              {
                path: "project",
                component: () =>
                  import("@/views/modules/flyControl/project/index.vue"),
                meta: { title: "态势感知", hidden: true },
              },
              {
                path: "requirement",
                name: "RequirementManage",
                component: () =>
                  import(
                    "@/views/modules/flyControl/requirement/RequirementManagePage.vue"
                  ),
                meta: { title: "需求管理", hidden: true },
              },
              {
                path: "task",
                component: () =>
                  import("@/views/modules/flyControl/control.vue"),
              },
              {
                path: "route",
                component: () =>
                  import("@/views/modules/flyControl/control.vue"),
              },
              {
                path: "routeSim",
                name: "RouteSim",
                component: () =>
                  import(
                    "@/views/modules/flyControl/RouteLibrary/RouteSimulation.vue"
                  ),
                meta: { title: "飞行模拟", hidden: true },
              },
              {
                path: "achievement",
                component: () =>
                  import("@/views/modules/flyControl/control.vue"),
              },
              {
                path: "smartService",
                name: "SmartService",
                component: () =>
                  import(
                    "@/views/modules/flyControl/smartService/SmartServicePage.vue"
                  ),
                meta: { title: "智能服务", hidden: true },
              },
            ],
          },
          {
            path: ":pathMatch(.*)*",
            redirect: "/defaultMapPage/flyControl/project",
            meta: { hidden: true },
          },
        ],
      },
      {
        path: "airspace-management",
        component: () =>
          import("@/views/modules/airspace-management/Container.vue"),
        redirect: "/airspace-management/list",
        children: [
          {
            path: "list",
            component: () =>
              import("@/views/modules/airspace-management/list/index.vue"),
            name: "AirspaceManagement",
            meta: { title: "空域管理", keepAlive: true },
          },
          {
            path: "application",
            component: () =>
              import(
                "@/views/modules/airspace-management/application/index.vue"
              ),
            name: "AirspaceApplication",
            meta: { title: "空域申请" },
          },
          {
            path: "detail/:id",
            component: () =>
              import("@/views/modules/airspace-management/AirspaceForm.vue"),
            name: "AirspaceDetail",
            meta: { title: "空域详情", hidden: true },
          },
          {
            path: "edit/:id",
            component: () =>
              import("@/views/modules/airspace-management/AirspaceForm.vue"),
            name: "AirspaceEdit",
            meta: { title: "编辑空域", hidden: true },
          },
          {
            path: "no-fly-zone",
            component: () =>
              import("@/views/modules/airspace/no-fly-zone/index.vue"),
            name: "NoFlyZone",
            meta: { title: "禁飞区" },
          },
        ],
      },
      {
        path: "/flyControl",
        name: "FlyControl",
        component: () =>
          import("@/views/modules/flyControl/liveFly/FlyControlPage.vue"),
      },
      {
        path: "/replay",
        name: "Replay",
        component: () =>
          import("@/views/modules/flyControl/replayPage/index.vue"),
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/defaultMapPage/flyControl/project",
    meta: { hidden: true },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes as any,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

export default router;
