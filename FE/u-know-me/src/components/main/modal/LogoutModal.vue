<template>
  <div class="logout-head">
    <div class="logout-badge">
      <i class="fa-solid fa-arrow-right-from-bracket"></i>
    </div>
    <div class="sign-head text-center">
      <div>로그아웃</div>
    </div>
  </div>
  <div class="logout-content">
    <p class="logout-title">로그아웃 하시겠습니까?</p>
    <p class="logout-description">
      현재 세션이 종료되고 메인 랜딩 페이지로 이동합니다.
    </p>
  </div>
  <div class="logout-config-btn">
    <div class="logout-actions">
      <button class="logout-cancel-btn" @click="main.btnCh=0">취소</button>
      <button class="logout-confirm-btn" @click="account.logout()">로그아웃</button>
    </div>
  </div>
</template>

<script>
import { useMainStore } from "@/stores/main/main";
import { useAccountStore } from "@/stores/land/account";

export default {
  name: "LogoutModal",
  components: {},
  setup() {
    const main = useMainStore();
    const account = useAccountStore();
    return {
      main,
      account,
    };
  },
};
</script>

<style scoped>
.logout-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.logout-badge {
  width: 72px;
  height: 72px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, rgba(160, 86, 255, 0.16), rgba(198, 153, 255, 0.34));
  color: #8b47eb;
  font-size: 28px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.logout-content {
  margin: 12px 0 0;
  text-align: center;
}

.logout-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #1f1630;
}

.logout-description {
  margin: 14px 0 0;
  color: #5f5a6d;
  font-size: 15px;
  line-height: 1.7;
}

.logout-config-btn {
  margin: 34px 0 0;
}

.logout-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
}

.logout-config-btn button {
  width: 160px;
  height: 48px;
  font-size: 15px;
  font-weight: 700;
}

.logout-cancel-btn {
  background: #ffffff;
  color: #6c6780;
  border-color: #d8cdea;
  box-shadow: none;
}

.logout-cancel-btn:hover {
  background: #f3eefb;
  color: #4f4567;
}

.logout-confirm-btn {
  background: linear-gradient(135deg, #a056ff, #c07bff);
  color: #ffffff;
  border-color: transparent;
}

.logout-confirm-btn:hover {
  background: linear-gradient(135deg, #8f3dff, #b76dff);
}

@media (max-width: 640px) {
  .logout-title {
    font-size: 22px;
  }

  .logout-actions {
    flex-direction: column-reverse;
  }

  .logout-config-btn button {
    width: 100%;
  }
}
</style>
