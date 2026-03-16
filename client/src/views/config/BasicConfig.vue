<template>
  <div class="basic-config">
    <el-card>
      <template #header>
        <span>基础配置</span>
      </template>
      
      <el-form :model="form" label-width="120px" @submit.prevent>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="混合端口">
              <el-input-number v-model="form['mixed-port']" :min="1" :max="65535" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="HTTP 端口">
              <el-input-number v-model="form.port" :min="1" :max="65535" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="SOCKS 端口">
              <el-input-number v-model="form['socks-port']" :min="1" :max="65535" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="允许局域网">
              <el-switch v-model="form['allow-lan']" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="绑定地址">
              <el-input v-model="form['bind-address']" placeholder="*" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="运行模式">
              <el-select v-model="form.mode">
                <el-option label="规则模式" value="rule" />
                <el-option label="全局模式" value="global" />
                <el-option label="直连模式" value="direct" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="日志级别">
              <el-select v-model="form['log-level']">
                <el-option label="信息 (info)" value="info" />
                <el-option label="警告 (warning)" value="warning" />
                <el-option label="错误 (error)" value="error" />
                <el-option label="调试 (debug)" value="debug" />
                <el-option label="静默 (silent)" value="silent" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="IPv6">
              <el-switch v-model="form.ipv6" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item>
          <el-button type="primary" @click="saveBasicConfig" :loading="saving">
            保存配置
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
const form = reactive({
  'mixed-port': 7890,
  port: undefined,
  'socks-port': undefined,
  'allow-lan': false,
  'bind-address': '*',
  mode: 'rule',
  'log-level': 'info',
  ipv6: false
})

onMounted(() => {
  loadConfig()
})

watch(() => store.currentConfig, () => {
  loadConfig()
}, { deep: true })

function loadConfig() {
  if (store.currentConfig) {
    Object.keys(form).forEach(key => {
      if (store.currentConfig[key] !== undefined) {
        form[key] = store.currentConfig[key]
      }
    })
  }
}

async function saveBasicConfig() {
  saving.value = true
  try {
    await store.updateConfig(route.params.id, { ...form })
    ElMessage.success('基础配置已保存')
  } catch (e) {
    // 错误已处理
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.basic-config {
  max-width: 800px;
  
  .el-input-number {
    width: 100%;
  }
  
  .el-select {
    width: 100%;
  }
}
</style>