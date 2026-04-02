import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/configs',
    children: [
      {
        path: 'configs',
        name: 'ConfigList',
        component: () => import('@/views/ConfigList.vue'),
        meta: { title: '配置列表' }
      },
      {
        path: 'config/:id',
        name: 'ConfigEdit',
        component: () => import('@/views/ConfigEdit.vue'),
        meta: { title: '编辑配置' },
        redirect: { name: 'BasicConfig' },
        children: [
          {
            path: 'basic',
            name: 'BasicConfig',
            component: () => import('@/views/config/BasicConfig.vue'),
            meta: { title: '基础配置' }
          },
          {
            path: 'proxies',
            name: 'ProxyNodes',
            component: () => import('@/views/config/ProxyNodes.vue'),
            meta: { title: '代理节点' }
          },
          {
            path: 'providers',
            name: 'ProxyProviders',
            component: () => import('@/views/config/ProxyProviders.vue'),
            meta: { title: '代理集合' }
          },
          {
            path: 'rule-providers',
            name: 'RuleProviders',
            component: () => import('@/views/config/RuleProviders.vue'),
            meta: { title: '规则集合' }
          },
          {
            path: 'groups',
            name: 'ProxyGroups',
            component: () => import('@/views/config/ProxyGroups.vue'),
            meta: { title: '代理组' }
          },
          {
            path: 'rules',
            name: 'Rules',
            component: () => import('@/views/config/Rules.vue'),
            meta: { title: '规则' }
          },
          {
            path: 'dns',
            name: 'DNS',
            component: () => import('@/views/config/DNS.vue'),
            meta: { title: 'DNS' }
          },
          {
            path: 'advanced',
            name: 'Advanced',
            component: () => import('@/views/config/Advanced.vue'),
            meta: { title: '高级配置' }
          },
          {
            path: 'preview',
            name: 'Preview',
            component: () => import('@/views/config/Preview.vue'),
            meta: { title: 'YAML 编辑' }
          }
        ]
      },
      // 规则集合管理（独立于配置）
      {
        path: 'rule-sets',
        name: 'RuleSetList',
        component: () => import('@/views/RuleSetList.vue'),
        meta: { title: '规则集合' }
      },
      {
        path: 'rule-sets/:id',
        name: 'RuleSetEdit',
        component: () => import('@/views/RuleSetEdit.vue'),
        meta: { title: '编辑规则集合' },
        redirect: { name: 'RuleSetBasic' },
        children: [
          {
            path: 'basic',
            name: 'RuleSetBasic',
            component: () => import('@/views/rule-set/BasicInfo.vue'),
            meta: { title: '基本信息' }
          },
          {
            path: 'rules',
            name: 'RuleSetRules',
            component: () => import('@/views/rule-set/RuleList.vue'),
            meta: { title: '规则列表' }
          },
          {
            path: 'preview',
            name: 'RuleSetPreview',
            component: () => import('@/views/rule-set/YamlEdit.vue'),
            meta: { title: 'YAML 编辑' }
          }
        ]
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'Clash Config'} - Clash Configurator`
  next()
})

export default router