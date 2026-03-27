<template>
  <div class="game-modal-bg">
    <div class="game-modal">
      <button
        type="button"
        class="close-btn"
        @click="chat.balanceAnswerClick('선택 포기')"
      >
        <i class="fa-solid fa-xmark x-btn"></i>
      </button>
      <div class="game-modal-container">
        <div class="game-title">밸런스 게임</div>
        <div class="game-question">{{ chat.gameQ }}</div>
        <div class="game-content">
          <button
            type="button"
            class="answser"
            @click="chat.balanceAnswerClick(chat.gameA1)"
          >
            {{ chat.gameA1 }}
          </button>
          <img class="game-img" src="@/assets/chat/vs.png" alt="" />
          <button
            type="button"
            class="answser"
            @click="chat.balanceAnswerClick(chat.gameA2)"
          >
            {{ chat.gameA2 }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { storeToRefs } from "pinia";
import { useChatStore } from "@/stores/chat/chat";

export default {
  name: "GameModal",
  components: {},
  setup() {
    const chat = useChatStore();
    const { gameBtn } = storeToRefs(chat);

    return {
      chat,
      gameBtn,
    };
  },
};
</script>

<style>
.game-modal-bg {
  width: 100vw;
  height: 100dvh;
  z-index: 9;
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  top: 0;
  left: 0;
}

.game-modal {
  position: relative;
  width: min(500px, calc(100vw - 32px));
  min-height: 350px;
  background: #ffffff;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  border-radius: 27px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.game-modal .close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #f1e4ff;
  color: #6d38d1;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.game-modal .x-btn {
  font-size: 24px;
}
.game-modal-container {
  display: flex;
  flex-direction: column;
  padding: 32px 40px;
}
.game-title {
  padding: 2% 11%;
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  color: #8227fa;
}

.game-question {
  margin-top: 4px;
  color: #352653;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.6;
}

.game-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-content: center;
}
.answser {
  flex: 1;
  width: 100%;
  height: 100px;
  font-size: 16px;
  text-align: center;
  margin-top: 20px;
  margin-bottom: 20px;
  border: none;
  border-radius: 20px;
  background: #f3e8ff;
  color: #2c2341;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.answser:hover {
  background: #e2c6ff;
  transform: translateY(-1px);
}

.game-img {
  width: 75px;
  margin: auto;
}

@media screen and (max-width: 640px) {
  .game-modal-container {
    padding: 28px 20px 24px;
  }

  .game-title {
    font-size: 26px;
  }

  .game-question {
    font-size: 16px;
  }

  .answser {
    height: 88px;
    margin-top: 16px;
    margin-bottom: 16px;
  }
}
</style>
