<template>
  <div class="livekit-limit-modal-bg">
    <div class="livekit-limit-modal">
      <div class="livekit-limit-modal-title">LiveKit Cloud 한도 초과</div>
      <div class="livekit-limit-modal-content">
        LiveKit Cloud 한도가 다 찼습니다.<br />
        체험을 원하시면 혼자 하기를 사용해주세요.
      </div>
      <div class="livekit-limit-modal-actions">
        <button class="livekit-limit-btn" @click="goToSoloMode">
          혼자 해보기
        </button>
        <button class="livekit-limit-btn secondary" @click="goToMain">
          메인으로
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useChatStore } from "@/stores/chat/chat";
import { buildFrontendUrl } from "@/config/runtime";

export default {
  name: "LiveKitLimitModal",
  setup() {
    const chat = useChatStore();
    return { chat };
  },
  methods: {
    goToSoloMode() {
      this.chat.liveKitQuotaModal = false;
      this.chat.soloMode = true;
      this.chat.SessionName = "solo";
      this.chat.resetSessionUiState();
      window.location.href = buildFrontendUrl("/chat?solo=1");
    },
    goToMain() {
      this.chat.liveKitQuotaModal = false;
      this.chat.soloMode = false;
      window.location.href = buildFrontendUrl("/main");
    },
  },
};
</script>

<style>
.livekit-limit-modal-bg {
  width: 100vw;
  height: 100vh;
  z-index: 12;
  background: rgba(0, 0, 0, 0.55);
  position: fixed;
  top: 0;
  left: 0;
  backdrop-filter: blur(6px);
}

.livekit-limit-modal {
  position: absolute;
  width: min(460px, calc(100vw - 32px));
  background: #ffffff;
  border-radius: 28px;
  box-shadow: 0px 20px 50px rgba(0, 0, 0, 0.2);
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 36px 32px 30px;
  text-align: center;
}

.livekit-limit-modal-title {
  color: #7d33f6;
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 20px;
}

.livekit-limit-modal-content {
  font-size: 18px;
  line-height: 1.7;
  font-weight: 600;
  color: #2d2342;
}

.livekit-limit-modal-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
  flex-wrap: wrap;
}

.livekit-limit-btn {
  min-width: 170px;
  height: 52px;
  border: none;
  border-radius: 26px;
  background: linear-gradient(90deg, #8c42ff, #c169ff);
  color: white;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0px 10px 24px rgba(140, 66, 255, 0.24);
}

.livekit-limit-btn.secondary {
  background: #ece4ff;
  color: #6338d9;
  box-shadow: none;
}

@media screen and (max-width: 640px) {
  .livekit-limit-modal {
    padding: 30px 20px 24px;
  }

  .livekit-limit-modal-title {
    font-size: 24px;
  }

  .livekit-limit-modal-content {
    font-size: 16px;
  }

  .livekit-limit-btn {
    width: 100%;
  }
}
</style>
