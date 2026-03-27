<template>
  <div class="loading-modal-bg">
    <div class="loading-modal">
      <img class="loading-img" src="@/assets/chat/loding_anim.gif" alt="입장 준비 중" />
      <div class="loading-text-title">입장 준비 중</div>
      <div class="loading-progress">
        <div class="loading-progress-bar" :style="{ width: `${chat.loadingProgress}%` }"></div>
      </div>
      <div class="loading-progress-label">{{ chat.loadingProgress }}%</div>
      <div class="loading-text" v-html="chat.loadingText"></div>
    </div>
  </div>
</template>

<script>
import { useChatStore } from "@/stores/chat/chat";

export default {
  setup() {
    const chat = useChatStore();
    return { chat };
  },
};
</script>

<style>
.loading-modal-bg {
  width: 100vw;
  height: 100dvh;
  z-index: 9;
  background: rgba(246, 248, 255, 0.78);
  position: fixed;
  top: 0;
  left: 0;
  backdrop-filter: blur(10px);
}
.loading-modal {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  text-align: center;
  padding: 24px 24px 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 22px 46px rgba(120, 128, 164, 0.18),
    inset 0 0 0 1px rgba(140, 150, 186, 0.12);
}
.loading-img {
  position: relative;
  width: 320px;
}
.loading-text-title {
  font-size: 24px;
  font-weight: 800;
  color: #2e2447;
}

.loading-text {
  margin-top: 24px;
  font-size: 18px;
  color: #5c5176;
}

.loading-progress {
  width: min(320px, 70vw);
  height: 10px;
  margin: 18px auto 0;
  border-radius: 999px;
  background: rgba(150, 162, 196, 0.18);
  overflow: hidden;
}

.loading-progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #a056ff, #e2c6ff);
  transition: width 0.2s ease;
}

.loading-progress-label {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #43375c;
}
</style>
