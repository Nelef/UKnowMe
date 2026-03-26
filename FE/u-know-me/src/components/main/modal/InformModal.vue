<template>
  <section class="account-settings-shell">
    <div class="settings-hero">
      <span class="modal-chip">Account Settings</span>
      <h2 class="settings-title">개인 정보 수정</h2>
      <p class="settings-description">
        프로필 정보와 보안 설정을 이 화면에서 관리할 수 있습니다.
      </p>
    </div>

    <div class="settings-panel">
      <InformProfile v-if="pBtnCh === 1" />
      <InformSecure v-if="pBtnCh === 2" />
    </div>
  </section>
</template>

<script>
import { storeToRefs } from "pinia";
import { useMainStore } from "@/stores/main/main";
import InformProfile from "@/components/main/modal/InformProfile.vue";
import InformSecure from "@/components/main/modal/InformSecure.vue";

export default {
  name: "InformModal",
  components: {
    InformProfile,
    InformSecure,
  },
  setup() {
    const main = useMainStore();
    const { pBtnCh } = storeToRefs(main);

    return {
      pBtnCh,
    };
  },
};
</script>

<style scoped>
.account-settings-shell {
  display: grid;
  gap: 22px;
}

.settings-hero {
  display: grid;
  gap: 12px;
}

.modal-chip {
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(160, 86, 255, 0.12);
  color: #7b49d8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.settings-title {
  margin: 0;
  font-size: 34px;
  line-height: 1.1;
  color: #241739;
}

.settings-description {
  margin: 0;
  color: #645b73;
  font-size: 15px;
  line-height: 1.75;
}

.settings-panel {
  min-height: 0;
}

@media (max-width: 720px) {
  .settings-title {
    font-size: 28px;
  }
}
</style>
