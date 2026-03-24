<template>
  <div class="side-bar">
    <button 
      class="landing-btn landing-btn-side landing-btn-signin"
      @click="btnCh=1"
    >로그인</button>
    <button
      class="landing-btn landing-btn-side landing-btn-signup"
      @click="btnCh=2"
    >회원가입</button>
  </div>
</template>

<script>
import { storeToRefs } from 'pinia'
import { useLandStore } from '@/stores/land/land'

export default {
  name: 'SideBar',
  setup() {
    const land = useLandStore()
    const { btnCh } = storeToRefs(land)
    return {
      land,
      btnCh
    }
  },
}
</script>

<style>
.side-bar {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: min(420px, calc(100vw - 32px));
  padding: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(160, 86, 255, 0.14);
  box-shadow: 0 18px 38px rgba(55, 35, 96, 0.18);
  backdrop-filter: blur(16px);
}
.landing-btn {
  flex: 1 1 0;
  min-width: 0;
  height: 52px;
  border-radius: 999px;
  font-style: normal;
  font-weight: 700;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.02em;
  text-align: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease,
    background-color 0.15s ease;
}
.landing-btn-side {
  cursor: pointer;
}
.landing-btn-signin {
  background: rgba(255, 255, 255, 0.95);
  color: #8f4dff;
  border: 1px solid rgba(160, 86, 255, 0.45);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.landing-btn-signup {
  border: none;
  color: #ffffff;
  background: linear-gradient(135deg, #9448ff 0%, #b76dff 100%);
  box-shadow: 0 10px 22px rgba(130, 39, 250, 0.25);
}
.landing-btn-side:hover {
  transform: translateY(-1px);
}
.landing-btn-signin:hover {
  background: #faf6ff;
  box-shadow: 0 10px 22px rgba(130, 39, 250, 0.12);
}
.landing-btn-signup:hover {
  box-shadow: 0 14px 28px rgba(130, 39, 250, 0.3);
}
@media (max-width: 640px) {
  .side-bar {
    bottom: 20px;
    width: calc(100vw - 24px);
    padding: 10px;
    gap: 10px;
  }
  .landing-btn {
    height: 48px;
    font-size: 15px;
  }
}
</style>
