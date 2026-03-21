<template>
  <div class="proxy-nodes">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>代理节点</span>
          <div class="actions">
            <el-button type="primary" size="small" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              添加节点
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-if="!proxies.length" description="暂无代理节点">
        <el-button type="primary" @click="showAddDialog">添加第一个节点</el-button>
      </el-empty>
      
      <div v-else class="nodes-container">
        <div class="drag-hint">
          <el-icon><Rank /></el-icon>
          <span>拖拽节点可调整顺序，拖拽到不同分组可移动节点</span>
        </div>
        
        <GroupedContainer
          v-model="proxyNodeGroups"
          draggable-group="proxies"
          content-class="nodes-list"
          @change="onGroupsChange"
        >
          <template #item="{ element, groupIndex, itemIndex }">
            <div class="node-item">
              <div class="drag-handle">
                <el-icon><Rank /></el-icon>
              </div>
              <div class="node-index">{{ getGlobalIndex(groupIndex, itemIndex) }}</div>
              <div class="node-name">{{ element.name }}</div>
              <div class="node-type">
                <el-tag size="small">{{ element.type?.toUpperCase() }}</el-tag>
              </div>
              <div class="node-server">{{ element.server }}:{{ element.port }}</div>
              <div class="node-actions">
                <el-button link type="primary" @click="editProxy(element)">编辑</el-button>
                <el-button link type="danger" @click="removeProxy(element)">删除</el-button>
              </div>
            </div>
          </template>
        </GroupedContainer>
      </div>
    </el-card>
    
    <!-- 添加/编辑节点对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingProxy ? '编辑节点' : '添加节点'"
      width="600px"
      destroy-on-close
    >
      <el-form :model="proxyForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="节点名称" prop="name">
          <el-input v-model="proxyForm.name" placeholder="请输入节点名称" />
        </el-form-item>
        
        <el-form-item label="节点类型" prop="type">
          <el-select v-model="proxyForm.type" placeholder="选择节点类型" @change="onTypeChange">
            <el-option label="Shadowsocks" value="ss" />
            <el-option label="ShadowsocksR" value="ssr" />
            <el-option label="VMess" value="vmess" />
            <el-option label="Trojan" value="trojan" />
            <el-option label="VLESS" value="vless" />
            <el-option label="Hysteria" value="hysteria" />
            <el-option label="Hysteria2" value="hysteria2" />
            <el-option label="SOCKS5" value="socks5" />
            <el-option label="HTTP" value="http" />
          </el-select>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="服务器地址" prop="server">
              <el-input v-model="proxyForm.server" placeholder="服务器 IP 或域名" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="端口" prop="port">
              <el-input-number v-model="proxyForm.port" :min="1" :max="65535" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- SS 特有字段 -->
        <template v-if="proxyForm.type === 'ss'">
          <el-form-item label="加密方式" prop="cipher">
            <el-select v-model="proxyForm.cipher" placeholder="选择加密方式">
              <el-option label="aes-128-gcm" value="aes-128-gcm" />
              <el-option label="aes-256-gcm" value="aes-256-gcm" />
              <el-option label="chacha20-ietf-poly1305" value="chacha20-ietf-poly1305" />
              <el-option label="2022-blake3-aes-128-gcm" value="2022-blake3-aes-128-gcm" />
              <el-option label="2022-blake3-aes-256-gcm" value="2022-blake3-aes-256-gcm" />
              <el-option label="2022-blake3-chacha20-poly1305" value="2022-blake3-chacha20-poly1305" />
              <el-option label="none" value="none" />
            </el-select>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="proxyForm.password" placeholder="密码" show-password />
          </el-form-item>
          <el-form-item label="UDP">
            <el-switch v-model="proxyForm.udp" />
          </el-form-item>
        </template>
        
        <!-- SSR 特有字段 -->
        <template v-if="proxyForm.type === 'ssr'">
          <el-form-item label="加密方式" prop="cipher">
            <el-input v-model="proxyForm.cipher" placeholder="加密方式" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="proxyForm.password" placeholder="密码" show-password />
          </el-form-item>
          <el-form-item label="协议" prop="protocol">
            <el-input v-model="proxyForm.protocol" placeholder="协议" />
          </el-form-item>
          <el-form-item label="协议参数" prop="protocol-param">
            <el-input v-model="proxyForm['protocol-param']" placeholder="协议参数" />
          </el-form-item>
          <el-form-item label="混淆" prop="obfs">
            <el-input v-model="proxyForm.obfs" placeholder="混淆方式" />
          </el-form-item>
          <el-form-item label="混淆参数" prop="obfs-param">
            <el-input v-model="proxyForm['obfs-param']" placeholder="混淆参数" />
          </el-form-item>
        </template>
        
        <!-- VMess 特有字段 -->
        <template v-if="proxyForm.type === 'vmess'">
          <el-form-item label="UUID" prop="uuid">
            <el-input v-model="proxyForm.uuid" placeholder="UUID" />
          </el-form-item>
          <el-form-item label="Alter ID">
            <el-input-number v-model="proxyForm.alterId" :min="0" />
          </el-form-item>
          <el-form-item label="加密方式">
            <el-input v-model="proxyForm.cipher" placeholder="auto" />
          </el-form-item>
          <el-form-item label="传输方式">
            <el-select v-model="proxyForm.network" placeholder="传输方式">
              <el-option label="TCP" value="tcp" />
              <el-option label="WebSocket" value="ws" />
              <el-option label="HTTP/2" value="h2" />
              <el-option label="gRPC" value="grpc" />
            </el-select>
          </el-form-item>
          <template v-if="proxyForm.network === 'ws'">
            <el-form-item label="WS Path">
              <el-input v-model="proxyForm['ws-path']" placeholder="WebSocket 路径" />
            </el-form-item>
            <el-form-item label="WS Headers">
              <el-input v-model="wsHeadersStr" placeholder='{"Host": "example.com"}' />
            </el-form-item>
          </template>
          <el-form-item label="TLS">
            <el-switch v-model="proxyForm.tls" />
          </el-form-item>
          <el-form-item label="跳过证书验证" v-if="proxyForm.tls">
            <el-switch v-model="proxyForm['skip-cert-verify']" />
          </el-form-item>
          <el-form-item label="服务器名称" v-if="proxyForm.tls">
            <el-input v-model="proxyForm.servername" placeholder="SNI" />
          </el-form-item>
        </template>
        
        <!-- Trojan 特有字段 -->
        <template v-if="proxyForm.type === 'trojan'">
          <el-form-item label="密码" prop="password">
            <el-input v-model="proxyForm.password" placeholder="密码" show-password />
          </el-form-item>
          <el-form-item label="SNI">
            <el-input v-model="proxyForm.sni" placeholder="服务器名称指示" />
          </el-form-item>
          <el-form-item label="跳过证书验证">
            <el-switch v-model="proxyForm['skip-cert-verify']" />
          </el-form-item>
          <el-form-item label="UDP">
            <el-switch v-model="proxyForm.udp" />
          </el-form-item>
          <el-form-item label="传输方式">
            <el-select v-model="proxyForm.network" placeholder="传输方式" clearable>
              <el-option label="TCP" value="tcp" />
              <el-option label="WebSocket" value="ws" />
              <el-option label="gRPC" value="grpc" />
            </el-select>
          </el-form-item>
        </template>
        
        <!-- VLESS 特有字段 -->
        <template v-if="proxyForm.type === 'vless'">
          <el-form-item label="UUID" prop="uuid">
            <el-input v-model="proxyForm.uuid" placeholder="UUID" />
          </el-form-item>
          <el-form-item label="Flow">
            <el-input v-model="proxyForm.flow" placeholder="xtls-rprx-vision" />
          </el-form-item>
          <el-form-item label="传输方式">
            <el-select v-model="proxyForm.network" placeholder="传输方式">
              <el-option label="TCP" value="tcp" />
              <el-option label="WebSocket" value="ws" />
              <el-option label="gRPC" value="grpc" />
            </el-select>
          </el-form-item>
          <el-form-item label="TLS">
            <el-switch v-model="proxyForm.tls" />
          </el-form-item>
          <el-form-item label="跳过证书验证" v-if="proxyForm.tls">
            <el-switch v-model="proxyForm['skip-cert-verify']" />
          </el-form-item>
        </template>
        
        <!-- SOCKS5/HTTP 特有字段 -->
        <template v-if="['socks5', 'http'].includes(proxyForm.type)">
          <el-form-item label="用户名">
            <el-input v-model="proxyForm.username" placeholder="用户名（可选）" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="proxyForm.password" placeholder="密码（可选）" show-password />
          </el-form-item>
          <el-form-item label="TLS" v-if="proxyForm.type === 'http'">
            <el-switch v-model="proxyForm.tls" />
          </el-form-item>
        </template>
        
        <!-- Hysteria/Hysteria2 特有字段 -->
        <template v-if="['hysteria', 'hysteria2'].includes(proxyForm.type)">
          <el-form-item label="密码" prop="password">
            <el-input v-model="proxyForm.password" placeholder="密码" show-password />
          </el-form-item>
          <el-form-item label="跳过证书验证">
            <el-switch v-model="proxyForm['skip-cert-verify']" />
          </el-form-item>
          <el-form-item label="SNI">
            <el-input v-model="proxyForm.sni" placeholder="服务器名称指示" />
          </el-form-item>
        </template>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Rank } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import GroupedContainer from '@/components/GroupedContainer.vue'

const route = useRoute()
const store = useConfigStore()

const dialogVisible = ref(false)
const editingProxy = ref(null)
const submitting = ref(false)
const formRef = ref(null)
const wsHeadersStr = ref('')

const proxies = computed(() => store.currentConfig?.proxies || [])

// 获取分组信息
const proxyNodeGroups = computed({
  get() {
    const groupsData = store.getFieldGroups('proxies')
    if (groupsData && Array.isArray(groupsData)) {
      // 确保每个 item 都有 id
      return groupsData.map(group => ({
        ...group,
        items: (group.items || []).map((item, index) => ({
          ...item,
          id: item.id || item.name || `proxy-${group.name || 'default'}-${index}`
        }))
      }))
    }
    // 如果没有分组信息，将所有代理节点放入默认分组
    const items = proxies.value.map((proxy, index) => ({
      ...proxy,
      id: proxy.name || `proxy-${index}`
    }))
    return [{ name: null, collapsed: false, items }]
  },
  set(value) {
    // 更新本地分组数据
    localGroups.value = value
  }
})

// 本地分组数据（用于临时存储修改）
const localGroups = ref([])

// 计算全局索引
function getGlobalIndex(groupIndex, itemIndex) {
  let index = itemIndex + 1
  for (let i = 0; i < groupIndex; i++) {
    index += (proxyNodeGroups.value[i]?.items?.length || 0)
  }
  return index
}

// 分组变更处理
async function onGroupsChange(newGroups) {
  // 如果传入了新数据，直接使用；否则使用本地缓存或 computed 值
  const groupsToSave = newGroups || (localGroups.value.length > 0 ? localGroups.value : proxyNodeGroups.value)
  await saveGroups(groupsToSave)
}

// 保存分组
async function saveGroups(groupsToSave) {
  try {
    // 如果没有传入数据，使用本地缓存或 computed 值
    if (!groupsToSave) {
      groupsToSave = localGroups.value.length > 0 ? localGroups.value : proxyNodeGroups.value
    }
    await store.updateConfigGroups(route.params.id, 'proxies', groupsToSave)
    // 清空本地缓存
    localGroups.value = []
    ElMessage.success('代理节点分组已保存')
  } catch (e) {
    // 错误已处理
  }
}

const defaultProxyForm = {
  name: '',
  type: 'vmess',
  server: '',
  port: 443,
  // SS
  cipher: 'aes-128-gcm',
  password: '',
  udp: false,
  // SSR
  protocol: '',
  'protocol-param': '',
  obfs: '',
  'obfs-param': '',
  // VMess
  uuid: '',
  alterId: 0,
  network: 'tcp',
  'ws-path': '',
  tls: true,
  'skip-cert-verify': false,
  servername: '',
  // Trojan
  sni: '',
  // VLESS
  flow: ''
}

const proxyForm = reactive({ ...defaultProxyForm })

const rules = {
  name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择节点类型', trigger: 'change' }],
  server: [{ required: true, message: '请输入服务器地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口号', trigger: 'blur' }]
}

function showAddDialog() {
  editingProxy.value = null
  Object.assign(proxyForm, defaultProxyForm)
  wsHeadersStr.value = ''
  dialogVisible.value = true
}

function editProxy(proxy) {
  editingProxy.value = proxy
  Object.assign(proxyForm, defaultProxyForm, { ...proxy })
  if (proxy['ws-headers']) {
    wsHeadersStr.value = JSON.stringify(proxy['ws-headers'])
  } else {
    wsHeadersStr.value = ''
  }
  dialogVisible.value = true
}

async function removeProxy(proxy) {
  try {
    await ElMessageBox.confirm(
      `确定要删除节点「${proxy.name}」吗？`,
      '删除确认',
      { type: 'warning' }
    )
    
    // 从分组中删除
    const newGroups = proxyNodeGroups.value.map(g => ({
      ...g,
      items: (g.items || []).filter(item => item.name !== proxy.name)
    }))
    
    await store.updateConfigGroups(route.params.id, 'proxies', newGroups)
    ElMessage.success('节点已删除')
  } catch (e) {
    // 取消或错误
  }
}

function onTypeChange() {
  // 重置一些字段
  proxyForm.cipher = 'aes-128-gcm'
  proxyForm.tls = ['vmess', 'trojan', 'vless', 'hysteria', 'hysteria2'].includes(proxyForm.type)
  proxyForm.udp = false
}

async function submitForm() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  
  submitting.value = true
  
  try {
    const data = { ...proxyForm }
    
    // 处理 WS Headers
    if (data.network === 'ws' && wsHeadersStr.value) {
      try {
        data['ws-headers'] = JSON.parse(wsHeadersStr.value)
      } catch {
        ElMessage.warning('WS Headers 格式不正确，请使用 JSON 格式')
        submitting.value = false
        return
      }
    }
    
    // 清理不需要的字段
    Object.keys(data).forEach(key => {
      if (data[key] === '' || data[key] === null || data[key] === undefined) {
        delete data[key]
      }
    })
    
    if (editingProxy.value) {
      // 编辑模式：更新分组中的节点
      const newGroups = proxyNodeGroups.value.map(g => ({
        ...g,
        items: (g.items || []).map(item => 
          item.name === editingProxy.value.name ? { ...item, ...data } : item
        )
      }))
      await store.updateConfigGroups(route.params.id, 'proxies', newGroups)
      ElMessage.success('节点已更新')
    } else {
      // 添加模式：添加到最后一个分组
      const newGroups = [...proxyNodeGroups.value]
      const newProxy = { ...data, id: data.name }
      if (newGroups.length === 0) {
        newGroups.push({ name: null, collapsed: false, items: [newProxy] })
      } else {
        newGroups[newGroups.length - 1] = {
          ...newGroups[newGroups.length - 1],
          items: [...(newGroups[newGroups.length - 1].items || []), newProxy]
        }
      }
      await store.updateConfigGroups(route.params.id, 'proxies', newGroups)
      ElMessage.success('节点已添加')
    }
    
    dialogVisible.value = false
  } catch (e) {
    // 错误已处理
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.proxy-nodes {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .el-select {
    width: 100%;
  }
  
  .nodes-container {
    .drag-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #909399;
      font-size: 12px;
      margin-bottom: 12px;
    }
  }
  
  .node-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: #fafafa;
    border-radius: 4px;
    margin-bottom: 8px;
    transition: all 0.2s;
    
    &:hover {
      background: #f0f0f0;
    }
    
    .drag-handle {
      cursor: grab;
      color: #c0c4cc;
      margin-right: 12px;
      display: flex;
      align-items: center;
      
      &:hover {
        color: #909399;
      }
      
      &:active {
        cursor: grabbing;
      }
    }
    
    .node-index {
      width: 40px;
      color: #909399;
      font-size: 12px;
    }
    
    .node-name {
      min-width: 150px;
      font-weight: 500;
      margin-right: 12px;
    }
    
    .node-type {
      width: 80px;
      flex-shrink: 0;
    }
    
    .node-server {
      flex: 1;
      color: #606266;
      font-size: 13px;
    }
    
    .node-actions {
      width: 100px;
      text-align: right;
      flex-shrink: 0;
    }
  }
}

// 拖拽样式
.ghost {
  opacity: 0.5;
  background: #f0f0f0;
  border: 1px dashed #dcdfe6;
}
</style>