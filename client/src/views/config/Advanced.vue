<template>
  <div class="advanced-config">
    <el-card>
      <template #header>
        <span>高级配置</span>
      </template>
      
      <el-form :model="advancedForm" label-width="140px" @submit.prevent>
        <!-- Sniffer 配置 -->
        <el-divider content-position="left">
          <el-icon><View /></el-icon>
          Sniffer（嗅探）配置
        </el-divider>
        
        <el-form-item label="启用 Sniffer">
          <el-switch v-model="sniffer.enable" />
        </el-form-item>
        
        <template v-if="sniffer.enable">
          <el-form-item label="解析纯 IP">
            <el-switch v-model="sniffer['parse-pure-ip']" />
          </el-form-item>
          
          <el-form-item label="嗅探 HTTP">
            <el-switch v-model="sniffConfig.http.enable" />
          </el-form-item>
          <el-form-item label="HTTP 端口" v-if="sniffConfig.http.enable">
            <el-input v-model="sniffConfig.http.portsStr" placeholder="80, 8080-8880" />
          </el-form-item>
          
          <el-form-item label="嗅探 TLS">
            <el-switch v-model="sniffConfig.tls.enable" />
          </el-form-item>
          <el-form-item label="TLS 端口" v-if="sniffConfig.tls.enable">
            <el-input v-model="sniffConfig.tls.portsStr" placeholder="443, 8443" />
          </el-form-item>
          
          <el-form-item label="嗅探 QUIC">
            <el-switch v-model="sniffConfig.quic.enable" />
          </el-form-item>
          <el-form-item label="QUIC 端口" v-if="sniffConfig.quic.enable">
            <el-input v-model="sniffConfig.quic.portsStr" placeholder="443, 8443" />
          </el-form-item>
        </template>
        
        <!-- TUN 配置 -->
        <el-divider content-position="left">
          <el-icon><Connection /></el-icon>
          TUN 配置
        </el-divider>
        
        <el-form-item label="启用 TUN">
          <el-switch v-model="tun.enable" />
        </el-form-item>
        
        <template v-if="tun.enable">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="TUN 模式">
                <el-select v-model="tun.stack" placeholder="选择模式">
                  <el-option label="gVisor" value="gvisor" />
                  <el-option label="System" value="system" />
                  <el-option label="Mixed" value="mixed" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="DNS Hijack">
                <el-switch v-model="tun['dns-hijack']" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="Auto Route">
                <el-switch v-model="tun['auto-route']" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Auto Detect Interface">
                <el-switch v-model="tun['auto-detect-interface']" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>
        
        <!-- 其他高级选项 -->
        <el-divider content-position="left">
          <el-icon><Setting /></el-icon>
          其他高级选项
        </el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="统一延迟">
              <el-switch v-model="advancedForm['unified-delay']" />
              <el-tooltip content="统一所有节点的延迟测试方式" placement="top">
                <el-icon style="margin-left: 4px;"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="TCP 并发">
              <el-switch v-model="advancedForm['tcp-concurrent']" />
              <el-tooltip content="并发 TCP 连接测试" placement="top">
                <el-icon style="margin-left: 4px;"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Geodata 模式">
              <el-switch v-model="advancedForm['geodata-mode']" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="进程匹配模式">
              <el-select v-model="advancedForm['find-process-mode']" placeholder="选择模式">
                <el-option label="关闭" value="off" />
                <el-option label="严格模式" value="strict" />
                <el-option label="宽松模式" value="always" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="客户端指纹">
          <el-select v-model="advancedForm['global-client-fingerprint']" placeholder="选择指纹" clearable>
            <el-option label="Chrome" value="chrome" />
            <el-option label="Firefox" value="firefox" />
            <el-option label="Safari" value="safari" />
            <el-option label="iOS" value="ios" />
            <el-option label="Android" value="android" />
            <el-option label="Edge" value="edge" />
            <el-option label="360" value="360" />
            <el-option label="QQ" value="qq" />
            <el-option label="随机" value="random" />
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="saveAdvancedConfig" :loading="saving">
            保存高级配置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '@/stores/config'

const route = useRoute()
const store = useConfigStore()

const saving = ref(false)

const advancedForm = reactive({
  'unified-delay': false,
  'tcp-concurrent': false,
  'geodata-mode': false,
  'find-process-mode': 'off',
  'global-client-fingerprint': ''
})

const defaultSniffer = {
  enable: true,
  'parse-pure-ip': true,
  sniff: {
    HTTP: {
      ports: [80, '8080-8880'],
      'override-destination': true
    },
    TLS: {
      ports: [443, 8443]
    },
    QUIC: {
      ports: [443, 8443]
    }
  }
}

const defaultTun = {
  enable: false,
  stack: 'gvisor',
  'dns-hijack': true,
  'auto-route': true,
  'auto-detect-interface': true
}

const sniffer = reactive({ ...defaultSniffer })
const tun = reactive({ ...defaultTun })

const sniffConfig = reactive({
  http: { enable: true, portsStr: '80, 8080-8880' },
  tls: { enable: true, portsStr: '443, 8443' },
  quic: { enable: true, portsStr: '443, 8443' }
})

onMounted(() => {
  loadConfig()
})

watch(() => store.currentConfig, () => {
  loadConfig()
}, { deep: true })

function loadConfig() {
  if (store.currentConfig) {
    const config = store.currentConfig
    
    // 加载高级配置
    if (config['unified-delay'] !== undefined) advancedForm['unified-delay'] = config['unified-delay']
    if (config['tcp-concurrent'] !== undefined) advancedForm['tcp-concurrent'] = config['tcp-concurrent']
    if (config['geodata-mode'] !== undefined) advancedForm['geodata-mode'] = config['geodata-mode']
    if (config['find-process-mode'] !== undefined) advancedForm['find-process-mode'] = config['find-process-mode']
    if (config['global-client-fingerprint'] !== undefined) advancedForm['global-client-fingerprint'] = config['global-client-fingerprint']
    
    // 加载 Sniffer 配置
    if (config.sniffer) {
      Object.assign(sniffer, defaultSniffer, config.sniffer)
      
      if (config.sniffer.sniff) {
        sniffConfig.http.enable = !!config.sniffer.sniff.HTTP
        sniffConfig.tls.enable = !!config.sniffer.sniff.TLS
        sniffConfig.quic.enable = !!config.sniffer.sniff.QUIC
        
        if (config.sniffer.sniff.HTTP?.ports) {
          sniffConfig.http.portsStr = config.sniffer.sniff.HTTP.ports.join(', ')
        }
        if (config.sniffer.sniff.TLS?.ports) {
          sniffConfig.tls.portsStr = config.sniffer.sniff.TLS.ports.join(', ')
        }
        if (config.sniffer.sniff.QUIC?.ports) {
          sniffConfig.quic.portsStr = config.sniffer.sniff.QUIC.ports.join(', ')
        }
      }
    }
    
    // 加载 TUN 配置
    if (config.tun) {
      Object.assign(tun, defaultTun, config.tun)
    }
  }
}

function parsePorts(portsStr) {
  if (!portsStr.trim()) return []
  return portsStr.split(',').map(p => {
    const trimmed = p.trim()
    if (trimmed.includes('-')) {
      return trimmed
    }
    return parseInt(trimmed) || trimmed
  })
}

async function saveAdvancedConfig() {
  saving.value = true
  
  try {
    const data = { ...advancedForm }
    
    // 构建 Sniffer 配置
    if (sniffer.enable) {
      data.sniffer = {
        enable: true,
        'parse-pure-ip': sniffer['parse-pure-ip'],
        sniff: {}
      }
      
      if (sniffConfig.http.enable) {
        data.sniffer.sniff.HTTP = {
          ports: parsePorts(sniffConfig.http.portsStr),
          'override-destination': true
        }
      }
      
      if (sniffConfig.tls.enable) {
        data.sniffer.sniff.TLS = {
          ports: parsePorts(sniffConfig.tls.portsStr)
        }
      }
      
      if (sniffConfig.quic.enable) {
        data.sniffer.sniff.QUIC = {
          ports: parsePorts(sniffConfig.quic.portsStr)
        }
      }
    } else {
      data.sniffer = { enable: false }
    }
    
    // 构建 TUN 配置
    if (tun.enable) {
      data.tun = {
        enable: true,
        stack: tun.stack,
        'dns-hijack': tun['dns-hijack'],
        'auto-route': tun['auto-route'],
        'auto-detect-interface': tun['auto-detect-interface']
      }
    } else {
      data.tun = { enable: false }
    }
    
    await store.updateAdvancedConfig(route.params.id, data)
    ElMessage.success('高级配置已保存')
  } catch (e) {
    // 错误已处理
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.advanced-config {
  max-width: 900px;
  
  .el-divider {
    margin: 24px 0 16px;
    
    .el-icon {
      margin-right: 8px;
    }
  }
  
  .el-select {
    width: 100%;
  }
}
</style>