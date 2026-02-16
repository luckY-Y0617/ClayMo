<template>
  <div class="travel-overview">
    <header class="travel-header">
      <div class="header-info">
        <router-link to="/" class="back-home-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          返回时间线
        </router-link>
        <h1 class="travel-title">旅行日志</h1>
        <p class="travel-subtitle">
          这里将展示你的旅行计划与旅行日志。目前仅实现前端骨架，后续会接入时间线、地图与多媒体内容。
        </p>
      </div>
      <div class="header-actions">
        <button class="action-btn primary">
          新建旅行计划
        </button>
      </div>
    </header>

    <main class="travel-main">
      <section class="placeholder-card">
        <h2>旅行节点（Travel Nodes）</h2>
        <p>
          Travel 模块将在这里以时间线的方式展示行程节点，例如【出发 / 到达 / 景点 / 用餐 / 住宿】等。
          当前版本只是搭建好页面与路由结构，方便后续在 <code>/src/editor/nodes/travel-nodes</code>
          中接入真正的旅行节点实现。
        </p>
      </section>
      <section class="placeholder-grid">
        <div class="stub-card" v-for="item in 3" :key="item">
          <h3>示例行程卡片 {{ item }}</h3>
          <p>未来用于展示单次旅程的摘要信息（封面、时间、地点、标签等）。</p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
</script>

<style scoped>
.travel-overview {
  min-height: 100vh;
  padding: 36px 48px 64px;
  background: #FAFAFA;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.travel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid #E8E8E8;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  background: transparent;
  border: 1px solid #E0E0E0;
  text-decoration: none;
  transition: all 0.2s ease;
  margin-bottom: 12px;
}

.back-home-btn:hover {
  color: #1a1a1a;
  border-color: #999;
  background: #FAFAFA;
}

.back-home-btn svg {
  flex-shrink: 0;
}

.travel-title {
  font-size: 36px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 10px 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.travel-subtitle {
  font-size: 15px;
  color: #666;
  margin: 0;
  line-height: 1.6;
  max-width: 600px;
}

.header-actions {
  flex-shrink: 0;
}

.action-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #E0E0E0;
  background: #FFFFFF;
  color: #1a1a1a;
  white-space: nowrap;
  flex-shrink: 0;
  height: 40px;
  box-sizing: border-box;
}

.action-btn.primary {
  background: #1a1a1a;
  color: #FFFFFF;
  border-color: #1a1a1a;
}

.action-btn:hover {
  background: #F7F7F7;
  border-color: #CCCCCC;
}

.action-btn.primary:hover {
  background: #333;
  border-color: #333;
}

.travel-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.placeholder-card {
  padding: 28px 32px;
  border-radius: 0;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.placeholder-card h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.placeholder-card p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.placeholder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.stub-card {
  padding: 24px;
  border-radius: 0;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stub-card h3 {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.stub-card p {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}
</style>


