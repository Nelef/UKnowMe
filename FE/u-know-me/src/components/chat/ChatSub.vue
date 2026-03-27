<template>
  <div class="chat-sub-spacer" aria-hidden="true"></div>

  <div class="chat-sub">
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
            @click="chat.motionClick()"
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
            <div>모션 인식</div>
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
              @click="chat.motionClick()"
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
              <div>모션 인식</div>
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
</template>

<script>
import { useChatStore } from "@/stores/chat/chat";
import { nextTick, onBeforeUnmount, onMounted } from "vue";

export default {
  data() {
    return {
      success: false,
      chatExpand: false,
      heartDelays: [0, 1, 2, 3],
    };
  },
  setup() {
    const chat = useChatStore();
    let mediaViewContent = null;
    let viewChangeHandler = null;

    onMounted(() => {
      nextTick(() => {
        const applyResponsiveLayout = (isMobile) => {
          document.documentElement.style.setProperty(
            "--chat-sub-size",
            isMobile ? "400px" : "200px"
          );
        };

        applyResponsiveLayout(window.innerWidth < 1120);

        mediaViewContent = window.matchMedia(`(max-width: 1120px)`);
        viewChangeHandler = (event) => {
          applyResponsiveLayout(event.matches);
        };
        mediaViewContent.addEventListener("change", viewChangeHandler);
      });
    });

    onBeforeUnmount(() => {
      if (mediaViewContent && viewChangeHandler) {
        mediaViewContent.removeEventListener("change", viewChangeHandler);
      }
    });

    return {
      chat,
    };
  },
  methods: {
    love() {
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
      this.chat.balanceClick();
    },
    openAccuseModal() {
      if (this.chat.soloMode) {
        this.chat.systemMessagePrint(
          "테스트 세션에서는 신고 기능을 사용할 수 없습니다."
        );
        return;
      }

      this.chat.accuseBtn = 1;
    },
    chatSubMobileClick() {
      this.chatExpand = !this.chatExpand;
    },
  },
};
</script>

<style>
/* 전역변수 */
:root {
  --chat-sub-size: 200px;
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
  gap: 14px;
}

.option-mobile {
  width: 100%;
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
  cursor: pointer;
  box-shadow: 0px 2.72109px 2.72109px rgba(0, 0, 0, 0.25);
  border-radius: 20px;
  background-color: #ebdcfe;
  color: #2a2140;
  transition: background-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
}

.chat-btn-lg {
  width: 190px;
  min-height: 60px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.chat-btn-lg-mobile {
  width: min(100%, 150px);
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

.chat-btn-lg img,
.chat-btn-lg-mobile img {
  width: 40px;
  height: 40px;
  object-fit: contain;
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
    width: min(100%, 132px);
    min-height: 90px;
  }

  .chat-btn-lg-mobile div {
    font-size: 16px;
  }

  .keyword-content-mobile {
    margin: 14px 16px;
  }
}
</style>
