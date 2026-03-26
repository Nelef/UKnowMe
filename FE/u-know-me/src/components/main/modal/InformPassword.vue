<template>
  <section class="account-verify">
    <div class="modal-hero">
      <span class="modal-chip">Account Access</span>
      <h2 class="modal-title">비밀번호 확인</h2>
      <p class="modal-description">
        개인 정보와 보안 설정을 열기 전에 본인 인증이 필요합니다.
        현재 비밀번호를 입력하고 계속 진행해 주세요.
      </p>
    </div>

    <form
      id="informPasswordForm"
      class="verify-form"
      action="POST"
      @submit.prevent="[account.certificatePassword(password), (password = '')]"
    >
      <div class="verify-card">
        <label for="informPassword" class="field-label">현재 비밀번호</label>
        <input
          type="password"
          name="informPassword"
          id="informPassword"
          placeholder="비밀번호를 입력해 주세요."
          v-model="password"
        />
      </div>

      <button class="verify-btn" type="submit">확인하고 열기</button>
    </form>
  </section>
</template>

<script>
import { ref } from "vue";
import { useAccountStore } from "@/stores/land/account";

export default {
  name: "InformPassword",
  setup() {
    const account = useAccountStore();
    const password = ref("");

    return {
      account,
      password,
    };
  },
};
</script>

<style scoped>
.account-verify {
  display: grid;
  gap: 24px;
}

.modal-hero {
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

.modal-title {
  margin: 0;
  font-size: 34px;
  line-height: 1.1;
  color: #241739;
}

.modal-description {
  margin: 0;
  color: #645b73;
  font-size: 15px;
  line-height: 1.75;
}

.verify-form {
  display: grid;
  gap: 18px;
}

.verify-card {
  padding: 22px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: inset 0 0 0 1px rgba(160, 86, 255, 0.08);
}

.field-label {
  display: block;
  margin-bottom: 10px;
  color: #352653;
  font-size: 14px;
  font-weight: 700;
}

#informPasswordForm input {
  box-sizing: border-box;
  width: 100%;
  height: 52px;
  padding: 0 16px;
  border: 1px solid #dbcff0;
  border-radius: 16px;
  background: #fdfbff;
  color: #281b40;
  font-size: 15px;
}

#informPasswordForm input:focus {
  outline: none;
  border-color: #a056ff;
  box-shadow: 0 0 0 4px rgba(160, 86, 255, 0.12);
}

.verify-btn {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 18px;
  background: linear-gradient(135deg, #a056ff, #c284ff);
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 14px 26px rgba(160, 86, 255, 0.24);
}

.verify-btn:hover {
  filter: brightness(0.98);
}

@media (max-width: 720px) {
  .modal-title {
    font-size: 28px;
  }

  .verify-card {
    padding: 18px;
    border-radius: 18px;
  }
}
</style>
