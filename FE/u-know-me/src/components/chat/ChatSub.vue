<template>
  <div class="chat-sub-spacer" aria-hidden="true"></div>

  <div ref="chatSubDesktop" class="chat-sub">
    <section class="chat-keyword-container">
      <div class="keyword-box">
        <div class="keyword-content">
          <p
            v-for="message in chat.chatMessages"
            :key="message.id"
            class="chat-message"
          >
            <template v-if="message.type === 'keyword'">
              {{ message.time }} :
              <span class="chat-message-keyword">{{ message.keyword }}</span>
              은(는) 어떠신가요?
            </template>
            <template v-else>
              {{ message.time }} : {{ message.text }}
            </template>
          </p>
        </div>
      </div>
    </section>

    <section class="chat-love-container">
      <div class="chat-love-stage">
        <button type="button" class="heart-img" @click="love()">
          <img class="heart-img-src" src="@/assets/main/heart.png" alt="" />
        </button>
        <div
          v-for="delay in heartDelays"
          :key="`desktop-heart-${delay}`"
          :class="{
            circle: success === false,
            'success-circle': success === true,
          }"
          :style="{ animationDelay: `${delay}s` }"
        ></div>
      </div>
    </section>

    <section class="chat-icon-container">
      <div class="option-btn-list">
        <div class="option">
          <button type="button" class="chat-btn-lg" @click="openBalanceGame()">
            <img src="@/assets/chat/game-img.png" alt="" />
            <div>밸런스 게임</div>
          </button>
          <button type="button" class="chat-btn-lg" @click="openAccuseModal()">
            <img src="@/assets/chat/accuse-img.png" alt="" />
            <div>신고하기</div>
          </button>
        </div>
        <div class="option">
          <button
            type="button"
            class="chat-btn-lg motionBtn"
            :class="{ 'motionBtn-busy': chat.motionProfileSwitching }"
            aria-haspopup="dialog"
            :aria-expanded="chat.motionSettingsOpen ? 'true' : 'false'"
            :aria-disabled="chat.motionProfileSwitching ? 'true' : 'false'"
            @pointerup.prevent.stop="openMotionSheet"
            @click.prevent.stop="openMotionSheet"
          >
            <img
              v-if="chat.motionCheck == true"
              src="@/assets/chat/option-on-img.png"
              alt=""
            />
            <img
              v-if="chat.motionCheck == false"
              src="@/assets/chat/option-off-img.png"
              alt=""
            />
            <div class="chat-btn-copy">
              <span>모션 인식</span>
              <small class="motion-mode-label">
                {{ chat.motionProcessingModeLabel }}
              </small>
            </div>
          </button>
          <button type="button" class="chat-btn-lg" @click="chat.leaveSession()">
            <img src="@/assets/chat/exit-img.png" alt="" />
            <div>나가기</div>
          </button>
        </div>
        <div class="logo">
          <img src="@/assets/chat/youknowme-img.png" alt="" />
        </div>
      </div>
    </section>
  </div>

  <div
    ref="chatSubMobile"
    :class="[
      'chat-sub-mobile',
      { 'chat-sub-mobile-expanded': chatExpand },
    ]"
  >
    <section class="chat-keyword-container">
      <div class="keyword-box">
        <div class="keyword-content-mobile" @click="chatSubMobileClick()">
          <p
            v-for="message in chat.chatMessages"
            :key="`${message.id}-mobile`"
            class="chat-message"
          >
            <template v-if="message.type === 'keyword'">
              {{ message.time }} :
              <span class="chat-message-keyword">{{ message.keyword }}</span>
              은(는) 어떠신가요?
            </template>
            <template v-else>
              {{ message.time }} : {{ message.text }}
            </template>
          </p>
        </div>
      </div>
    </section>

    <div class="chat-sub-mobile-child">
      <section class="chat-left-container">
        <div class="option-btn-list option-btn-list-mobile">
          <div class="option option-mobile option-mobile-end">
            <button
              type="button"
              class="chat-btn-lg-mobile"
              @click="openBalanceGame()"
            >
              <img src="@/assets/chat/game-img.png" alt="" />
              <div>밸런스 게임</div>
            </button>
            <button
              type="button"
              class="chat-btn-lg-mobile"
              @click="openAccuseModal()"
            >
              <img src="@/assets/chat/accuse-img.png" alt="" />
              <div>신고하기</div>
            </button>
          </div>
        </div>
      </section>

      <section class="chat-love-container chat-love-container-mobile">
        <div class="chat-love-stage">
          <button type="button" class="heart-img" @click="love()">
            <img class="heart-img-src" src="@/assets/main/heart.png" alt="" />
          </button>
          <div
            v-for="delay in heartDelays"
            :key="`mobile-heart-${delay}`"
            :class="{
              circle: success === false,
              'success-circle': success === true,
            }"
            :style="{ animationDelay: `${delay}s` }"
          ></div>
        </div>
      </section>

      <section class="chat-right-container">
        <div class="option-btn-list option-btn-list-mobile">
          <div class="option option-mobile option-mobile-start">
            <button
              type="button"
              class="chat-btn-lg-mobile motionBtn"
              :class="{ 'motionBtn-busy': chat.motionProfileSwitching }"
              aria-haspopup="dialog"
              :aria-expanded="chat.motionSettingsOpen ? 'true' : 'false'"
              :aria-disabled="chat.motionProfileSwitching ? 'true' : 'false'"
              @pointerup.prevent.stop="openMotionSheet"
              @click.prevent.stop="openMotionSheet"
            >
              <img
                v-if="chat.motionCheck == true"
                src="@/assets/chat/option-on-img.png"
                alt=""
              />
              <img
                v-if="chat.motionCheck == false"
                src="@/assets/chat/option-off-img.png"
                alt=""
              />
              <div class="chat-btn-copy">
                <span>모션 인식</span>
                <small class="motion-mode-label">
                  {{ chat.motionProcessingModeLabel }}
                </small>
              </div>
            </button>
            <button
              type="button"
              class="chat-btn-lg-mobile"
              @click="chat.leaveSession()"
            >
              <img src="@/assets/chat/exit-img.png" alt="" />
              <div>나가기</div>
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>

  <teleport to="body">
    <transition name="motion-sheet">
      <div
        v-if="chat.motionSettingsOpen"
        class="motion-sheet-backdrop"
        @click.self="chat.closeMotionSettings()"
      >
        <section
          class="motion-sheet-panel"
          role="dialog"
          aria-modal="true"
          aria-label="모션 인식 설정"
          @click.stop
        >
          <header class="motion-sheet-header">
            <div class="motion-sheet-copy">
              <strong>모션 인식</strong>
              <p>현재 기기에서 사용할 방식을 선택하세요.</p>
            </div>
          </header>

          <p v-if="motionSettingsHint" class="motion-sheet-note">
            {{ motionSettingsHint }}
          </p>

          <div class="motion-sheet-option-list">
            <button
              v-for="option in motionProfileOptions"
              :key="option.value"
              type="button"
              class="motion-sheet-option"
              :class="{
                'motion-sheet-option-active':
                  chat.motionRequestedProfile === option.value,
              }"
              :disabled="chat.motionProfileSwitching || option.disabled"
              @click="selectMotionProfile(option.value)"
            >
              <div class="motion-sheet-option-main">
                <div class="motion-sheet-option-copy">
                  <strong>{{ option.label }}</strong>
                  <p>{{ option.description }}</p>
                </div>
                <span v-if="option.badge" class="motion-sheet-option-badge">
                  {{ option.badge }}
                </span>
              </div>
              <p
                v-if="option.disabled && option.disabledReason"
                class="motion-sheet-option-reason"
              >
                {{ option.disabledReason }}
              </p>
            </button>
          </div>

          <footer class="motion-sheet-footer">
            <button
              type="button"
              class="motion-sheet-close"
              @click="chat.closeMotionSettings()"
            >
              닫기
            </button>
          </footer>
        </section>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { useChatStore } from "@/stores/chat/chat";

export default {
  data() {
    return {
      success: false,
      chatExpand: false,
      heartDelays: [0, 1, 2, 3],
      chatSubResizeObserver: null,
      chatSubResizeFrame: null,
      chatSubWindowResizeHandler: null,
      lastMotionTriggerAt: 0,
      lastMotionTriggerType: "",
    };
  },
  setup() {
    const chat = useChatStore();
    return {
      chat,
    };
  },
  computed: {
    motionSettingsSelectable() {
      return (
        this.chat.ready === true ||
        this.chat.holisticDelegateStatus === "main-cpu-failed" ||
        this.chat.holisticDelegateStatus === "worker-unavailable" ||
        this.chat.holisticDelegateStatus === "worker-cpu-failed" ||
        this.chat.holisticDelegateStatus === "worker-gpu-failed"
      );
    },
    motionSettingsHint() {
      if (this.chat.motionProfileSwitching) {
        return "설정을 적용하고 있습니다.";
      }

      if (this.chat.holisticDelegateStatus === "worker-unavailable") {
        return "이 기기에서는 브라우저 + CPU를 사용해 주세요.";
      }

      if (this.chat.holisticDelegateStatus === "main-cpu-failed") {
        return "브라우저 + CPU 설정에 실패했습니다. 다른 모드를 선택할 수 있습니다.";
      }

      if (
        this.chat.holisticDelegateStatus === "worker-cpu-failed" ||
        this.chat.holisticDelegateStatus === "worker-gpu-failed"
      ) {
        return "이전 시도가 실패했습니다. 다른 모드를 선택할 수 있습니다.";
      }

      if (!this.motionSettingsSelectable) {
        return "준비가 끝나면 바로 선택할 수 있습니다.";
      }

      return "";
    },
    motionProfileOptions() {
      const settingsReady = this.motionSettingsSelectable;
      const mainSupported =
        settingsReady && this.chat.supportsHolisticMainThread();
      const workerSupported =
        settingsReady && this.chat.supportsHolisticWorker();
      const workerGpuSupported =
        settingsReady && this.chat.supportsHolisticWorkerGpu();
      const mainCpuDisabledReason = !settingsReady
        ? "아바타 준비가 끝나면 선택할 수 있습니다."
        : !mainSupported
        ? "이 브라우저에서는 직접 처리 모드를 사용할 수 없습니다."
        : "";
      const workerCpuDisabledReason = !settingsReady
        ? "아바타 준비가 끝나면 선택할 수 있습니다."
        : !workerSupported
        ? "이 기기 브라우저는 워커 실행을 지원하지 않습니다."
        : "";
      const workerGpuDisabledReason = !settingsReady
        ? "아바타 준비가 끝나면 선택할 수 있습니다."
        : !workerSupported
        ? "워커를 지원하지 않아 GPU 모드를 사용할 수 없습니다."
        : !workerGpuSupported
        ? "OffscreenCanvas 또는 WebGL2를 지원하지 않습니다."
        : "";

      return [
        {
          value: "main-cpu",
          label: "브라우저 + CPU",
          description: "워커가 어려운 기기에서 쓰는 호환 모드",
          badge: "호환",
          disabled: !settingsReady || !mainSupported,
          disabledReason: mainCpuDisabledReason,
        },
        {
          value: "worker-cpu",
          label: "워커 + CPU",
          description: !settingsReady
            ? "준비가 끝나면 선택 가능"
            : workerSupported
            ? "안정적으로 쓰기 좋은 기본 모드"
            : "이 기기에서는 사용할 수 없음",
          badge: "기본",
          disabled: !settingsReady || !workerSupported,
          disabledReason: workerCpuDisabledReason,
        },
        {
          value: "worker-gpu",
          label: "워커 + GPU",
          description: !settingsReady
            ? "준비가 끝나면 선택 가능"
            : workerGpuSupported
            ? "지원 기기에서 더 가볍게 처리"
            : "현재 기기에서는 지원하지 않음",
          badge: "실험",
          disabled: !settingsReady || !workerGpuSupported,
          disabledReason: workerGpuDisabledReason,
        },
        {
          value: "off",
          label: "모션 끄기",
          description: "지금은 모션 인식을 사용하지 않음",
          badge: "",
          disabled: false,
          disabledReason: "",
        },
      ];
    },
  },
  mounted() {
    this.chatSubWindowResizeHandler = () => {
      this.scheduleChatSubSpacerSync();
    };
    window.addEventListener("resize", this.chatSubWindowResizeHandler);

    if (typeof window !== "undefined" && "ResizeObserver" in window) {
      this.chatSubResizeObserver = new window.ResizeObserver(() => {
        this.scheduleChatSubSpacerSync();
      });

      [this.$refs.chatSubDesktop, this.$refs.chatSubMobile]
        .filter(Boolean)
        .forEach((element) => {
          this.chatSubResizeObserver.observe(element);
        });
    }

    this.scheduleChatSubSpacerSync();
  },
  beforeUnmount() {
    if (this.chatSubWindowResizeHandler) {
      window.removeEventListener("resize", this.chatSubWindowResizeHandler);
    }

    if (this.chatSubResizeObserver) {
      this.chatSubResizeObserver.disconnect();
      this.chatSubResizeObserver = null;
    }

    if (this.chatSubResizeFrame) {
      window.cancelAnimationFrame(this.chatSubResizeFrame);
      this.chatSubResizeFrame = null;
    }
  },
  methods: {
    scheduleChatSubSpacerSync() {
      if (typeof window === "undefined") {
        return;
      }

      if (this.chatSubResizeFrame) {
        window.cancelAnimationFrame(this.chatSubResizeFrame);
      }

      this.chatSubResizeFrame = window.requestAnimationFrame(() => {
        this.chatSubResizeFrame = null;
        this.syncChatSubSpacerSize();
      });
    },
    measureCollapsedMobilePanelHeight() {
      const mobilePanel = this.$refs.chatSubMobile;
      if (!mobilePanel) {
        return 400;
      }

      const panelRect = mobilePanel.getBoundingClientRect();
      const clone = mobilePanel.cloneNode(true);

      clone.classList.remove("chat-sub-mobile-expanded");
      clone.style.position = "fixed";
      clone.style.left = "-10000px";
      clone.style.bottom = "0";
      clone.style.width = `${Math.max(panelRect.width, 0)}px`;
      clone.style.maxWidth = `${Math.max(panelRect.width, 0)}px`;
      clone.style.visibility = "hidden";
      clone.style.pointerEvents = "none";
      clone.style.opacity = "1";
      clone.style.transform = "none";
      clone.style.transition = "none";

      document.body.appendChild(clone);
      const nextSize = clone.offsetHeight || 400;
      clone.remove();

      return nextSize;
    },
    syncChatSubSpacerSize() {
      const isMobile = window.innerWidth <= 1120;
      const fallbackSize = isMobile ? 400 : 200;
      const nextSize = isMobile
        ? this.measureCollapsedMobilePanelHeight()
        : this.$refs.chatSubDesktop?.offsetHeight || fallbackSize;

      document.documentElement.style.setProperty(
        "--chat-sub-size",
        `${nextSize}px`
      );
    },
    love() {
      this.chat.closeMotionSettings();
      if (this.chat.soloMode) {
        this.chat.heartClick();
        return;
      }

      if (!this.success) {
        this.chat.heartClick();
        this.success = true;
        var heartBtn = document.querySelectorAll(".heart-img");
        var heartImg = document.querySelectorAll(".heart-img-src");

        for (let i = 0; i < heartBtn.length; i++) {
          heartBtn[i].style.width = "100px";
          heartBtn[i].style.height = "100px";
          heartImg[i].style.animationDuration = "1s";
          heartImg[i].style.animationName = "heartScaleIn";
          heartImg[i].style.animationIterationCount = "infinite";
        }
      }
    },
    openBalanceGame() {
      this.chat.closeMotionSettings();
      this.chat.balanceClick();
    },
    openAccuseModal() {
      this.chat.closeMotionSettings();
      if (this.chat.soloMode) {
        this.chat.systemMessagePrint(
          "테스트 세션에서는 신고 기능을 사용할 수 없습니다."
        );
        return;
      }

      this.chat.accuseBtn = 1;
    },
    chatSubMobileClick() {
      this.chat.closeMotionSettings();
      this.chatExpand = !this.chatExpand;
      this.scheduleChatSubSpacerSync();
    },
    openMotionSheet(event) {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const eventType = event?.type || "manual";

      if (
        eventType === "click" &&
        now - this.lastMotionTriggerAt < 450 &&
        this.lastMotionTriggerType === "pointerup"
      ) {
        return;
      }

      this.lastMotionTriggerAt = now;
      this.lastMotionTriggerType = eventType;
      this.chat.motionClick();
    },
    async selectMotionProfile(profile) {
      await this.chat.applyMotionProcessingProfile(profile);
    },
  },
};
</script>

<style>
/* 전역변수 */
:root {
  --chat-sub-size: 200px;
  --chat-action-width-desktop: 190px;
  --chat-action-width-mobile: clamp(124px, 28vw, 150px);
}

.chat-sub-spacer {
  height: var(--chat-sub-size);
  flex: 0 0 auto;
}

.chat-sub,
.chat-sub-mobile {
  position: absolute;
  bottom: 0;
  box-sizing: border-box;
  width: 100%;
  padding: 14px 20px 18px;
  z-index: 3;
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.chat-sub {
  left: 0;
  display: grid;
  grid-template-columns: minmax(280px, 1.2fr) auto minmax(280px, 1fr);
  gap: 20px;
  align-items: stretch;
}

.chat-sub-mobile {
  left: 50%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transform: translate(-50%, 0);
}

.chat-sub-mobile-child {
  display: grid;
  grid-template-columns: minmax(132px, 1fr) auto minmax(132px, 1fr);
  gap: 12px;
  align-items: center;
}

.chat-keyword-container,
.chat-icon-container,
.chat-left-container,
.chat-right-container {
  min-width: 0;
  display: flex;
  align-items: stretch;
}

.chat-keyword-container {
  flex: 1 1 auto;
}

.chat-love-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.chat-love-stage {
  position: relative;
  width: clamp(190px, 18vw, 230px);
  min-width: 190px;
  height: 180px;
  display: grid;
  place-items: center;
  overflow: visible;
}

.chat-love-container-mobile .chat-love-stage {
  width: 180px;
  min-width: 180px;
}

.chat-icon-container,
.chat-left-container,
.chat-right-container {
  justify-content: center;
}

.option-btn-list {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.option-btn-list-mobile {
  justify-content: center;
}

.option {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  width: var(--chat-action-width-desktop);
}

.option-mobile {
  width: var(--chat-action-width-mobile);
}

.option-mobile-end {
  align-items: flex-end;
}

.option-mobile-start {
  align-items: flex-start;
}

.chat-btn-lg,
.chat-btn-lg-mobile {
  border: 0;
  outline: 0;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  box-shadow: 0px 2.72109px 2.72109px rgba(0, 0, 0, 0.25);
  border-radius: 20px;
  background-color: #ebdcfe;
  color: #2a2140;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: background-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
}

.chat-btn-lg {
  width: 100%;
  min-height: 60px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.chat-btn-lg-mobile {
  width: 100%;
  min-height: 96px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.chat-btn-lg:hover,
.chat-btn-lg-mobile:hover {
  background-color: #d5b6ff;
  transform: translateY(-1px);
}

.chat-btn-lg:disabled,
.chat-btn-lg-mobile:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.chat-btn-lg div,
.chat-btn-lg-mobile div {
  min-width: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
}

.chat-btn-lg div {
  flex: 1 1 auto;
}

.chat-btn-copy {
  display: flex;
  flex-direction: column;
  align-items: inherit;
  justify-content: center;
  gap: 2px;
}

.motionBtn {
  position: relative;
  z-index: 1;
}

.motionBtn-busy {
  opacity: 0.72;
  cursor: progress;
}

.motion-mode-label {
  display: block;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: rgba(42, 33, 64, 0.72);
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.chat-btn-lg .chat-btn-copy {
  align-items: flex-start;
  text-align: left;
}

.chat-btn-lg-mobile .chat-btn-copy {
  align-items: center;
  text-align: center;
}

.chat-btn-lg img,
.chat-btn-lg-mobile img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.motion-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  padding: 24px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.3), transparent 42%),
    rgba(24, 15, 41, 0.36);
  backdrop-filter: blur(18px);
}

.motion-sheet-panel {
  width: min(100%, 560px);
  max-height: min(86dvh, 780px);
  padding: 28px;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  background:
    linear-gradient(160deg, rgba(255, 248, 255, 0.98), rgba(237, 225, 255, 0.95));
  box-shadow: 0px 22px 60px rgba(34, 20, 58, 0.24);
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
}

.motion-sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 16px;
}

.motion-sheet-copy {
  min-width: 0;
}

.motion-sheet-copy strong {
  display: block;
  font-size: 24px;
  font-weight: 900;
  line-height: 1.1;
  color: #241936;
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.motion-sheet-copy p {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(36, 25, 54, 0.72);
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.motion-sheet-note {
  margin: -2px 0 2px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(134, 92, 195, 0.14);
  font-size: 13px;
  line-height: 1.6;
  color: rgba(60, 40, 89, 0.78);
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.motion-sheet-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(89, 55, 139, 0.12);
  color: #3c2859;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.motion-sheet-close:hover {
  background: rgba(89, 55, 139, 0.18);
  transform: translateY(-1px);
}

.motion-sheet-option-list {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  align-items: stretch;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.motion-sheet-option {
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  border: 0;
  border-radius: 22px;
  min-height: 144px;
  padding: 28px 24px 24px;
  background: rgba(255, 255, 255, 0.82);
  color: #241936;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: inset 0 0 0 1px rgba(134, 92, 195, 0.08);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease,
    opacity 0.18s ease;
}

.motion-sheet-option:hover {
  transform: translateY(-1px);
  background: rgba(243, 233, 255, 0.96);
  box-shadow: inset 0 0 0 1px rgba(134, 92, 195, 0.16);
}

.motion-sheet-option:disabled {
  opacity: 0.56;
  cursor: not-allowed;
  transform: none;
}

.motion-sheet-option-active {
  background: linear-gradient(135deg, #f1e2ff, #e2c9ff);
  box-shadow:
    inset 0 0 0 1px rgba(111, 64, 174, 0.22),
    0px 10px 24px rgba(102, 64, 155, 0.12);
}

.motion-sheet-option-main {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.motion-sheet-option-copy {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.motion-sheet-option-copy strong {
  font-size: 19px;
  font-weight: 900;
  line-height: 1.2;
  min-width: 0;
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.motion-sheet-option-copy p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(36, 25, 54, 0.72);
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.motion-sheet-option-badge {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(74, 45, 116, 0.1);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #52307d;
  flex-shrink: 0;
  align-self: flex-start;
}

.motion-sheet-option-reason {
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid rgba(111, 64, 174, 0.12);
  font-size: 12px;
  line-height: 1.5;
  color: rgba(82, 48, 125, 0.82);
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.motion-sheet-footer {
  margin-top: auto;
  padding-top: 2px;
}

.motion-sheet-footer .motion-sheet-close {
  width: 100%;
}

.motion-sheet-enter-active,
.motion-sheet-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.motion-sheet-enter-from,
.motion-sheet-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.keyword-box {
  width: min(100%, 560px);
  margin: auto;
  background-color: #ebdcfead;
  backdrop-filter: blur(5px);
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  border-radius: 20px;
  font-weight: 600;
  overflow: hidden;
}

.keyword-content,
.keyword-content-mobile {
  margin: 16px 20px;
  overflow: auto;
  transition: height 0.35s ease;
}

.keyword-content {
  min-height: 108px;
  max-height: 136px;
}

.keyword-content-mobile {
  height: 50px;
  cursor: pointer;
}

.chat-sub-mobile-expanded .keyword-content-mobile {
  height: min(320px, calc(100dvh - 220px));
}

.keyword-content::-webkit-scrollbar,
.keyword-content-mobile::-webkit-scrollbar {
  width: 10px;
}

.keyword-content::-webkit-scrollbar-thumb,
.keyword-content-mobile::-webkit-scrollbar-thumb {
  background: #c1c3fc;
  border-radius: 10px;
}

.chat-message {
  margin: 0 0 10px;
  color: #2f2643;
  line-height: 1.6;
  word-break: keep-all;
}

.chat-message:last-child {
  margin-bottom: 0;
}

.chat-message-keyword {
  color: #d82946;
  font-weight: 800;
}

.logo {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.35s ease;
}

.logo img {
  width: auto;
  max-height: 136px;
  object-fit: contain;
}

.heart-img {
  position: relative;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  background-color: white;
  z-index: 1;
  padding: 5px;
  display: grid;
  place-items: center;
  filter: drop-shadow(0px 1.92647px 1.92647px rgba(0, 0, 0, 0.25));
  transition: width 0.5s ease, height 0.5s ease, filter 0.2s ease;
}

.heart-img:hover {
  filter: brightness(90%);
}

.heart-img-src {
  width: 50px;
  height: 50px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: 0.5s;
  animation-name: heartSpin;
  animation-duration: 0s;
  animation-iteration-count: infinite;
}

.circle,
.success-circle {
  border-radius: 50%;
  width: 80px;
  height: 80px;
  position: absolute;
  opacity: 0;
  animation: scaleIn 4s infinite cubic-bezier(0.36, 0.11, 0.89, 0.32);
}

.circle {
  background-color: #a056ff;
}

.success-circle {
  background-color: red;
}

@keyframes scaleIn {
  from {
    transform: scale(0.5, 0.5);
    opacity: 1;
  }
  to {
    transform: scale(2.5, 2.5);
    opacity: 0;
  }
}

@keyframes heartSpin {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes heartScaleIn {
  0% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
}

@media screen and (max-width: 1450px) {
  .logo {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }
}

@media screen and (min-width: 1121px) {
  .chat-sub {
    opacity: 1;
    transform: translateY(0);
  }

  .chat-sub-mobile {
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, 100%);
  }

  :root {
    --chat-sub-size: 200px;
  }
}

@media screen and (max-width: 1120px) {
  .chat-sub {
    opacity: 0;
    pointer-events: none;
    transform: translateY(100%);
  }

  .chat-sub-mobile {
    opacity: 1;
  }

  :root {
    --chat-sub-size: 400px;
  }

  .motion-sheet-backdrop {
    align-items: end;
    padding: 16px;
  }

  .motion-sheet-panel {
    width: min(100%, 520px);
    max-height: min(88dvh, 760px);
    padding: 24px 20px 18px;
    border-radius: 26px;
  }
}

@media screen and (max-width: 760px) {
  .chat-sub-mobile {
    padding: 12px 12px 16px;
  }

  .chat-sub-mobile-child {
    grid-template-columns: minmax(110px, 1fr) auto minmax(110px, 1fr);
    gap: 8px;
  }

  .chat-love-stage,
  .chat-love-container-mobile .chat-love-stage {
    width: 150px;
    min-width: 150px;
    height: 150px;
  }

  .chat-btn-lg-mobile {
    min-height: 90px;
  }

  .chat-btn-lg-mobile div {
    font-size: 16px;
  }

  .motion-mode-label {
    font-size: 10px;
  }

  .keyword-content-mobile {
    margin: 14px 16px;
  }

  .motion-sheet-backdrop {
    padding: 12px;
  }

  .motion-sheet-panel {
    width: 100%;
    max-height: min(88dvh, 720px);
    padding: 22px 16px 16px;
    border-radius: 24px;
    gap: 14px;
  }

  .motion-sheet-header {
    flex-direction: column;
    align-items: stretch;
  }

  .motion-sheet-copy strong {
    font-size: 21px;
  }

  .motion-sheet-close {
    width: 100%;
    justify-content: center;
  }

  .motion-sheet-option {
    min-height: 132px;
    padding: 24px 18px 20px;
  }

  .motion-sheet-option-main {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .motion-sheet-option-copy {
    width: 100%;
  }
}
</style>
