<template>
  <div class="container">
    <h2 class="title">字体提取工具</h2>

    <!-- 1. 拖拽上传区域 -->
    <div
      class="upload-area"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerUpload"
      :class="{ dragging: isDragging }"
    >
      <input
        type="file"
        ref="fileInput"
        accept=".ttf,.otf,.woff"
        class="hidden-input"
        @change="handleFileSelect"
      />
      <div v-if="!loadedFont" class="upload-placeholder">
        <span class="icon">📂</span>
        <p>点击或拖拽字体文件到这里</p>
        <p class="sub-text">支持 .ttf, .otf, .woff</p>
      </div>
      <div v-else class="file-info">
        <span class="icon">✅</span>
        <p class="filename">{{ fileName }}</p>
        <p class="sub-text">{{ glyphCount }} 个字形</p>
        <button class="btn-text" @click.stop="resetFile">重新上传</button>
      </div>
    </div>

    <!-- 2. 输入框区域 -->
    <div class="input-section">
      <label>输入需要提取的文字</label>
      <textarea v-model="inputText" placeholder="在此输入需要保留的字符..." rows="5"></textarea>
      <div class="char-count">已选 {{ uniqueCharCount }} 个字符</div>
    </div>

    <!-- 3. 快捷按钮区域 -->
    <div class="actions-section">
      <div class="preset-buttons">
        <button class="btn-sm" @click="addPreset('number')">+ 数字</button>
        <button class="btn-sm" @click="addPreset('alpha_lower')">+ 小写字母</button>
        <button class="btn-sm" @click="addPreset('alpha_upper')">+ 大写字母</button>
        <button class="btn-sm" @click="addPreset('punctuation')">+ 常用标点</button>
      </div>
    </div>

    <!-- 4. 导出按钮 -->
    <div class="export-section">
      <button
        class="btn-primary"
        :disabled="!loadedFont || uniqueCharCount === 0 || isProcessing"
        @click="extractFont"
      >
        {{ isProcessing ? '处理中...' : '提取并下载字体' }}
      </button>
      <p v-if="message" :class="['message', messageType]">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import opentype from 'opentype.js'

const fileInput = ref(null)
const isDragging = ref(false)
const loadedFont = ref(null)
const fileName = ref('')
const glyphCount = ref(0)
const inputText = ref('')
const isProcessing = ref(false)
const message = ref('')
const messageType = ref('info')

const uniqueCharCount = computed(() => {
  return new Set(inputText.value).size
})

const triggerUpload = () => {
  fileInput.value.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) processFile(file)
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file) processFile(file)
}

const processFile = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const buffer = e.target.result
      const font = opentype.parse(buffer)
      loadedFont.value = font
      fileName.value = file.name
      glyphCount.value = font.numGlyphs
      showMessage('字体加载成功', 'success')
    } catch (err) {
      console.error(err)
      showMessage('无法解析字体文件', 'error')
    }
  }
  reader.readAsArrayBuffer(file)
}

const resetFile = () => {
  loadedFont.value = null
  fileName.value = ''
  glyphCount.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

const addPreset = (type) => {
  let chars = ''
  switch (type) {
    case 'number':
      chars = '0123456789'
      break
    case 'alpha_lower':
      chars = 'abcdefghijklmnopqrstuvwxyz'
      break
    case 'alpha_upper':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      break
    case 'punctuation':
      chars = '.,!?:;"\'()[]{}<>/\\|@#$%^&*-+=_~`'
      break
  }

  // Append only new characters
  const currentSet = new Set(inputText.value)
  for (const char of chars) {
    if (!currentSet.has(char)) {
      inputText.value += char
    }
  }
}

const showMessage = (msg, type = 'info') => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

const extractFont = async () => {
  if (!loadedFont.value) return
  isProcessing.value = true

  try {
    const chars = Array.from(new Set(inputText.value)).sort()
    const font = loadedFont.value

    // Always include .notdef
    const notdefGlyph = font.glyphs.get(0)
    const glyphs = [notdefGlyph]

    // Get glyphs for selected characters
    chars.forEach((char) => {
      const glyph = font.charToGlyph(char)
      if (glyph && glyph !== notdefGlyph) {
        glyphs.push(glyph)
      }
    })

    // Create new font
    const newFont = new opentype.Font({
      familyName: font.names.fontFamily?.en || 'SubsetFont',
      styleName: font.names.fontSubfamily?.en || 'Regular',
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      glyphs: glyphs,
    })

    newFont.download()
    showMessage(`成功提取 ${glyphs.length} 个字形`, 'success')
  } catch (err) {
    console.error(err)
    showMessage('提取失败: ' + err.message, 'error')
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
.container {
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #333;
  max-width: 400px;
  margin: 0 auto;
}

.title {
  font-size: 18px;
  margin-bottom: 16px;
  text-align: center;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f9f9f9;
  margin-bottom: 16px;
}

.upload-area:hover,
.upload-area.dragging {
  border-color: #42b983;
  background: #eef9f5;
}

.hidden-input {
  display: none;
}

.icon {
  font-size: 24px;
  display: block;
  margin-bottom: 8px;
}

.sub-text {
  font-size: 12px;
  color: #666;
  margin: 4px 0;
}

.filename {
  font-weight: bold;
  word-break: break-all;
}

.btn-text {
  background: none;
  border: none;
  color: #d9534f;
  text-decoration: underline;
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
}

.input-section {
  margin-bottom: 16px;
}

.input-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 14px;
}

textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: vertical;
  font-family: monospace;
  box-sizing: border-box;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.preset-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-sm:hover {
  background: #f0f0f0;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-primary:disabled {
  background: #a8d5c2;
  cursor: not-allowed;
}

.btn-primary:hover:not(:disabled) {
  background: #3aa876;
}

.message {
  margin-top: 10px;
  text-align: center;
  font-size: 14px;
  padding: 8px;
  border-radius: 4px;
}

.message.success {
  background: #e6fffa;
  color: #2c7a7b;
}

.message.error {
  background: #fff5f5;
  color: #c53030;
}

.message.info {
  background: #ebf8ff;
  color: #2b6cb0;
}
</style>
