<template>
  <div class="dns-config">
    <el-card>
      <template #header>
        <span>DNS 配置</span>
      </template>
      
      <el-form :model="dnsForm" label-width="120px" @submit.prevent>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="启用 DNS">
              <el-switch v-model="dnsForm.enable" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="IPv6">
              <el-switch v-model="dnsForm.ipv6" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="增强模式">
              <el-select v-model="dnsForm['enhanced-mode']" placeholder="选择增强模式">
                <el-option label="关闭" value="normal" />
                <el-option label="Fake-IP" value="fake-ip" />
                <el-option label="Redir-Host" value="redir-host" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Fake-IP 范围">
              <el-input v-model="dnsForm['fake-ip-range']" placeholder="198.18.0.1/16" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="Fake-IP 过滤">
          <div class="tag-input">
            <el-tag
              v-for="(tag, index) in dnsForm['fake-ip-filter']"
              :key="index"
              closable
              @close="removeFakeIpFilter(index)"
              style="margin-right: 8px; margin-bottom: 8px;"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-model="newFakeIpFilter"
              size="small"
              placeholder="输入后按回车添加"
              style="width: 200px;"
              @keyup.enter="addFakeIpFilter"
            />
          </div>
        </el-form-item>
        
        <el-form-item label="Nameserver">
          <div class="dns-list">
            <div v-for="(ns, index) in dnsForm.nameserver" :key="index" class="dns-item">
              <el-input v-model="dnsForm.nameserver[index]" placeholder="DNS 服务器地址" />
              <el-button type="danger" link @click="removeNameserver(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" link @click="addNameserver">
              <el-icon><Plus /></el-icon>
              添加
            </el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="Fallback">
          <div class="dns-list">
            <div v-for="(fb, index) in dnsForm.fallback" :key="index" class="dns-item">
              <el-input v-model="dnsForm.fallback[index]" placeholder="Fallback DNS 服务器" />
              <el-button type="danger" link @click="removeFallback(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" link @click="addFallback">
              <el-icon><Plus /></el-icon>
              添加
            </el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="Fallback Filter">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="GeoIP">
                <el-switch v-model="fallbackFilter.geoip" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="GeoIP Code">
                <el-input v-model="fallbackFilter['geoip-code']" placeholder="CN" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="IPCIDR">
            <div class="dns-list">
              <div v-for="(ip, index) in fallbackFilter.ipcidr" :key="index" class="dns-item">
                <el-input v-model="fallbackFilter.ipcidr[index]" placeholder="IP CIDR" />
                <el-button type="danger" link @click="removeFallbackFilterIp(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-button type="primary" link @click="addFallbackFilterIp">
                <el-icon><Plus /></el-icon>
                添加
              </el-button>
            </div>
          </el-form-item>
          
          <el-form-item label="Domain">
            <div class="dns-list">
              <div v-for="(domain, index) in fallbackFilter.domain" :key="index" class="dns-item">
                <el-input v-model="fallbackFilter.domain[index]" placeholder="域名" />
                <el-button type="danger" link @click="removeFallbackFilterDomain(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-button type="primary" link @click="addFallbackFilterDomain">
                <el-icon><Plus /></el-icon>
                添加
              </el-button>
            </div>
          </el-form-item>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="saveDNSConfig" :loading="saving">
            保存 DNS 配置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '@/stores/config'

const route = useRoute()
const store = useConfigStore()

const saving = ref(false)
const newFakeIpFilter = ref('')

const defaultDnsForm = {
  enable: true,
  ipv6: false,
  'enhanced-mode': 'fake-ip',
  'fake-ip-range': '198.18.0.1/16',
  'fake-ip-filter': [
    '*.lan',
    'localhost.ptlogin2.qq.com'
  ],
  nameserver: [
    '223.5.5.5',
    '119.29.29.29'
  ],
  fallback: [
    'tls://8.8.8.8:853',
    'tls://1.1.1.1:853'
  ],
  'fallback-filter': {
    geoip: true,
    'geoip-code': 'CN',
    ipcidr: ['240.0.0.0/4'],
    domain: ['+.google.com', '+.facebook.com', '+.youtube.com']
  }
}

const dnsForm = reactive({ ...defaultDnsForm })
const fallbackFilter = reactive({
  geoip: true,
  'geoip-code': 'CN',
  ipcidr: ['240.0.0.0/4'],
  domain: ['+.google.com', '+.facebook.com', '+.youtube.com']
})

onMounted(() => {
  loadConfig()
})

watch(() => store.currentConfig, () => {
  loadConfig()
}, { deep: true })

function loadConfig() {
  if (store.currentConfig?.dns) {
    const dns = store.currentConfig.dns
    Object.keys(defaultDnsForm).forEach(key => {
      if (dns[key] !== undefined) {
        if (Array.isArray(dns[key])) {
          dnsForm[key] = [...dns[key]]
        } else if (typeof dns[key] === 'object') {
          dnsForm[key] = { ...dns[key] }
        } else {
          dnsForm[key] = dns[key]
        }
      }
    })
    
    // 处理 fallback-filter
    if (dns['fallback-filter']) {
      fallbackFilter.geoip = dns['fallback-filter'].geoip ?? true
      fallbackFilter['geoip-code'] = dns['fallback-filter']['geoip-code'] || 'CN'
      fallbackFilter.ipcidr = dns['fallback-filter'].ipcidr || []
      fallbackFilter.domain = dns['fallback-filter'].domain || []
    }
  }
}

function addFakeIpFilter() {
  if (newFakeIpFilter.value.trim()) {
    dnsForm['fake-ip-filter'].push(newFakeIpFilter.value.trim())
    newFakeIpFilter.value = ''
  }
}

function removeFakeIpFilter(index) {
  dnsForm['fake-ip-filter'].splice(index, 1)
}

function addNameserver() {
  dnsForm.nameserver.push('')
}

function removeNameserver(index) {
  dnsForm.nameserver.splice(index, 1)
}

function addFallback() {
  dnsForm.fallback.push('')
}

function removeFallback(index) {
  dnsForm.fallback.splice(index, 1)
}

function addFallbackFilterIp() {
  fallbackFilter.ipcidr.push('')
}

function removeFallbackFilterIp(index) {
  fallbackFilter.ipcidr.splice(index, 1)
}

function addFallbackFilterDomain() {
  fallbackFilter.domain.push('')
}

function removeFallbackFilterDomain(index) {
  fallbackFilter.domain.splice(index, 1)
}

async function saveDNSConfig() {
  saving.value = true
  
  try {
    const data = {
      ...dnsForm,
      'fallback-filter': {
        geoip: fallbackFilter.geoip,
        'geoip-code': fallbackFilter['geoip-code'],
        ipcidr: fallbackFilter.ipcidr.filter(ip => ip.trim()),
        domain: fallbackFilter.domain.filter(d => d.trim())
      }
    }
    
    // 清理空值
    data.nameserver = data.nameserver.filter(ns => ns.trim())
    data.fallback = data.fallback.filter(fb => fb.trim())
    data['fake-ip-filter'] = data['fake-ip-filter'].filter(f => f.trim())
    
    await store.updateDNSConfig(route.params.id, data)
    ElMessage.success('DNS 配置已保存')
  } catch (e) {
    // 错误已处理
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.dns-config {
  max-width: 900px;
  
  .tag-input {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
  
  .dns-list {
    width: 100%;
    
    .dns-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      
      .el-input {
        flex: 1;
        margin-right: 8px;
      }
    }
  }
  
  .el-select {
    width: 100%;
  }
}
</style>