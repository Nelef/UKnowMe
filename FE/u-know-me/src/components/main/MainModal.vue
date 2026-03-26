<template>
  <div class="main-modal-bg" @click.self="closeModal">
    <div class="main-modal" :class="modalShellClass">
      <button class="close-btn" type="button" @click="closeModal" aria-label="닫기">
        <i class="fa-solid fa-xmark x-btn"></i>
      </button>

      <div v-if="btnCh === 3" class="modal-tabbar">
        <button
          class="modal-tab"
          :class="{ 'modal-tab-active': main.pBtnCh === 1 }"
          type="button"
          @click="main.pBtnCh = 1"
        >
          내 프로필
        </button>
        <button
          class="modal-tab"
          :class="{ 'modal-tab-active': main.pBtnCh === 2 }"
          type="button"
          @click="main.pBtnCh = 2"
        >
          보안 설정
        </button>
      </div>

      <div class="main-modal-content" :class="modalContentClass">
        <Logout v-if="btnCh === 1" />
        <InformPassword v-if="btnCh === 2" />
        <Inform v-if="btnCh === 3" />
        <MatchingOption v-if="btnCh === 4" />
        <MainNotice v-if="btnCh === 5" />
        <MainNoticeDetail v-if="btnCh === 6" />
      </div>
    </div>
  </div>
</template>

<script>
import Inform from "@/components/main/modal/InformModal.vue";
import InformPassword from "@/components/main/modal/InformPassword.vue";
import Logout from "@/components/main/modal/LogoutModal.vue";
import MatchingOption from "@/components/main/modal/MatchingOption.vue";
import MainNotice from "@/components/main/modal/MainNotice.vue";
import MainNoticeDetail from "@/components/main/modal/MainNoticeDetail.vue";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useMainStore } from "@/stores/main/main";

export default {
  name: "MainModal",
  components: {
    Inform,
    InformPassword,
    Logout,
    MatchingOption,
    MainNotice,
    MainNoticeDetail,
  },
  setup() {
    const main = useMainStore();
    const { btnCh } = storeToRefs(main);

    const modalShellClass = computed(() => ({
      "main-modal-compact": [1, 2, 4].includes(btnCh.value),
      "main-modal-wide": [3, 5, 6].includes(btnCh.value),
      "main-modal-with-tabs": btnCh.value === 3,
    }));

    const modalContentClass = computed(() => ({
      "main-modal-content-compact": [1, 2, 4].includes(btnCh.value),
      "main-modal-content-form": [2, 3, 4].includes(btnCh.value),
      "main-modal-content-notice": [5, 6].includes(btnCh.value),
    }));

    const closeModal = () => {
      main.btnCh = 0;
      main.pBtnCh = 0;
    };

    return {
      main,
      btnCh,
      modalShellClass,
      modalContentClass,
      closeModal,
    };
  },
};
</script>

<style scoped>
.main-modal-bg {
  position: fixed;
  inset: 0;
  z-index: 9;
  display: grid;
  place-items: center;
  padding: 18px;
  background:
    radial-gradient(circle at top left, rgba(196, 173, 255, 0.26), transparent 34%),
    rgba(15, 9, 24, 0.46);
  backdrop-filter: blur(10px);
}

.main-modal {
  position: relative;
  width: min(560px, calc(100vw - 36px));
  max-height: min(86vh, 860px);
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 244, 255, 0.98));
  box-shadow:
    0 22px 60px rgba(27, 13, 55, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  overflow: hidden;
}

.main-modal::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, rgba(160, 86, 255, 0.14), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.54), transparent 58%);
  pointer-events: none;
}

.main-modal-compact {
  width: min(560px, calc(100vw - 36px));
}

.main-modal-wide {
  width: min(900px, calc(100vw - 36px));
}

.main-modal-with-tabs {
  width: min(980px, calc(100vw - 36px));
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 3;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  color: #26193f;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(70, 38, 121, 0.12);
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.close-btn:hover {
  background: rgba(244, 235, 255, 0.96);
  transform: translateY(-1px);
}

.x-btn {
  font-size: 28px;
}

.modal-tabbar {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 10px;
  padding: 26px 28px 0;
}

.modal-tab {
  min-width: 132px;
  height: 46px;
  border: 1px solid rgba(160, 86, 255, 0.22);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  color: #6e5d8b;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-tab:hover {
  background: rgba(246, 238, 255, 0.96);
  color: #513975;
}

.modal-tab-active {
  background: linear-gradient(135deg, #a056ff, #c284ff);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 10px 20px rgba(160, 86, 255, 0.24);
}

.main-modal-content {
  position: relative;
  z-index: 1;
  overflow: auto;
  padding: 34px 32px 32px;
  max-height: min(86vh, 860px);
}

.main-modal-content-compact {
  padding-top: 40px;
}

.main-modal-content-form {
  max-height: min(86vh, 860px);
}

.main-modal-content-notice {
  padding-top: 40px;
}

@media (max-width: 900px) {
  .main-modal-bg {
    padding: 14px;
  }

  .main-modal,
  .main-modal-compact,
  .main-modal-wide,
  .main-modal-with-tabs {
    width: min(100%, calc(100vw - 20px));
    max-height: calc(100dvh - 20px);
    border-radius: 24px;
  }

  .main-modal-content {
    padding: 28px 18px 20px;
    max-height: calc(100dvh - 20px);
  }

  .modal-tabbar {
    padding: 22px 18px 0;
    gap: 8px;
  }

  .modal-tab {
    min-width: 0;
    flex: 1 1 0;
    height: 44px;
    font-size: 14px;
  }

  .close-btn {
    top: 14px;
    right: 14px;
    width: 42px;
    height: 42px;
    border-radius: 14px;
  }

  .x-btn {
    font-size: 24px;
  }
}
</style>
