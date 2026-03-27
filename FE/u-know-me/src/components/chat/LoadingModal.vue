<template>
  <div class="loading-modal-bg">
    <div class="loading-modal">
      <img class="loading-img" src="@/assets/chat/loding_anim.gif" alt="ani">
      <div class="loading-text-title">
        <span
          v-for="(letter, index) in loadingLetters"
          :key="`${letter}-${index}`"
        >
          {{ letter }}
        </span>
      </div>
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
    const loadingLetters = ["L", "O", "A", "D", "I", "N", "G"];
    return { chat, loadingLetters };
  },
};
</script>

<style>
.loading-modal-bg {
  width: 100vw;
  height: 100dvh;
  z-index: 9;
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  top: 0;
  left: 0;
  backdrop-filter: blur(5px);
}
.loading-modal {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  text-align: center;
}
.loading-img {
  position: relative;
  width: 320px;
}
.loading-text-title {
  font-size: x-large;
  color: white;
}
.loading-text-title span {
  display: inline-block;
  margin: 0 0.02em;
  animation: loading-text-title 0.5s infinite alternate;
}

.loading-text-title span:nth-child(2) {
  animation-delay: 0.1s;
}

.loading-text-title span:nth-child(3) {
  animation-delay: 0.2s;
}

.loading-text-title span:nth-child(4) {
  animation-delay: 0.3s;
}

.loading-text-title span:nth-child(5) {
  animation-delay: 0.4s;
}

.loading-text-title span:nth-child(6) {
  animation-delay: 0.5s;
}

.loading-text-title span:nth-child(7) {
  animation-delay: 0.6s;
}

@keyframes loading-text-title {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}
/*  */

.loading-text {
  margin-top: 52px;
  font-size: 20px;
  color: white;
}

.loading-progress {
  width: min(320px, 70vw);
  height: 10px;
  margin: 18px auto 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
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
  color: white;
}
</style>
