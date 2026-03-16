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
      
      <el-table v-else :data="proxies" stripe style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type.toUpperCase() }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="server" label="服务器" min-width="150" />
        <el-table-column prop="port" label="端口" width="80" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="editProxy(row)">编辑</el-button>
            <el-button link type="danger" @click="removeProxy(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
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
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/config'

const route = useRoute()
const store = useConfigStore()

const dialogVisible = ref(false)
const editingProxy = ref(null)
const submitting = ref(false)
const formRef = ref(null)
const wsHeadersStr = ref('')

const proxies = computed(() => store.currentConfig?.proxies || [])

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
    await store.deleteProxy(route.params.id, proxy.name)
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
      await store.updateProxy(route.params.id, editingProxy.value.name, data)
      ElMessage.success('节点已更新')
    } else {
      await store.addProxy(route.params.id, data)
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
}
</style>