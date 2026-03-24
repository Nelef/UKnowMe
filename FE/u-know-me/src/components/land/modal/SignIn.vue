<template>
  <div class="signin-shell">
    <div class="sign-head signin-head">
      <div>너, 나 알아?</div>
      <div class="signin-subtitle">Welcome Back</div>
    </div>
    <form
      id="signInForm"
      action="POST"
      @submit.prevent="account.login(credentials)"
    >
      <label class="signin-label" for="signInId">아이디</label>
      <div class="signin-input">
        <div class="icon-signin">
          <i class="fa-solid fa-user"></i>
        </div>
        <input
          type="text"
          name="signInId"
          id="signInId"
          placeholder="아이디를 입력해 주세요"
          v-model="credentials.id"
        />
      </div>
      <label class="signin-label" for="signInPassword">비밀번호</label>
      <div class="signin-input">
        <div class="icon-signin">
          <i class="fa-solid fa-unlock-keyhole"></i>
        </div>
        <input
          type="password"
          name="signInPassword"
          id="signInPassword"
          placeholder="비밀번호를 입력해 주세요"
          v-model="credentials.password"
        />
      </div>
      <div class="signin-error" v-if="account.authError.login === 1">
        아이디 또는 비밀번호를 잘못 입력했습니다.
        <br />입력하신 내용을 다시 확인해주세요.
      </div>
      <button class="login-btn">로그인</button>
    </form>
    <p class="login-signup">
      계정이 없으신가요?
      <span @click="land.btnCh = 2">계정 만들기</span>
    </p>
  </div>
</template>

<script>
import { ref } from "vue";
import { useAccountStore } from "@/stores/land/account";
import { useLandStore } from "@/stores/land/land";

export default {
  name: "SignIn",
  setup() {
    const account = useAccountStore();
    const land = useLandStore();
    const credentials = ref({
      id: "",
      password: "",
    });
    return {
      account,
      credentials,
      land,
    };
  },
};
</script>

<style scoped>
.signin-shell {
  display: flex;
  flex-direction: column;
  gap: 22px;
  height: 100%;
  min-height: 0;
}
.sign-head {
  font-weight: 700;
  font-size: 32px;
  line-height: 39px;
  color: #8227fa;
}
.signin-head {
  margin: 0 auto;
  text-align: center;
  padding-top: 8px;
}
.signin-subtitle {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 400;
  line-height: 20px;
  color: #8227fa;
}
#signInForm {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.signin-label {
  padding-left: 8px;
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  color: #544a71;
}
.signin-input {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 58px;
  padding: 0 18px;
  background: linear-gradient(180deg, #f8f4ff 0%, #eef4ff 100%);
  border: 1px solid #d9cdf8;
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
  transition: border-color 0.15s ease, box-shadow 0.15s ease,
    transform 0.15s ease;
}
.signin-input:focus-within {
  border-color: #9b62ff;
  box-shadow: 0 0 0 4px rgba(160, 86, 255, 0.14);
}
.icon-signin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 999px;
  color: #9d57ff;
  background: rgba(160, 86, 255, 0.14);
  font-size: 16px;
}
.signin-error {
  padding-left: 8px;
  font-size: 13px;
  line-height: 19px;
  color: #de5068;
}
.login-btn {
  width: 100%;
  height: 56px;
  margin-top: 8px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #8e43ff 0%, #b96dff 100%);
  box-shadow: 0 14px 24px rgba(130, 39, 250, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 28px rgba(130, 39, 250, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.login-btn:active {
  transform: translateY(0);
}
#signInForm input {
  width: 100%;
  height: 56px;
  border: 0;
  padding: 0;
  background: transparent;
  color: #21173a;
  font-size: 17px;
}
#signInForm input::placeholder {
  color: #9b93b3;
}
#signInForm input:focus {
  outline: none;
}
.login-signup {
  margin: 2px 0 0;
  text-align: center;
  font-size: 14px;
  color: #9d95b7;
}
.login-signup span {
  font-size: 14px;
  font-weight: 700;
  color: #8a4cff;
  margin-left: 6px;
}
.login-signup span:hover {
  cursor: pointer;
  color: #8227fa;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .signin-shell {
    gap: 18px;
  }
  .sign-head {
    font-size: 28px;
    line-height: 34px;
  }
  .signin-subtitle {
    margin-top: 6px;
    font-size: 15px;
  }
  .signin-input {
    min-height: 54px;
    padding: 0 14px;
    gap: 12px;
    border-radius: 16px;
  }
  .icon-signin {
    width: 30px;
    height: 30px;
    flex-basis: 30px;
    font-size: 15px;
  }
  #signInForm input {
    height: 52px;
    font-size: 16px;
  }
  .login-btn {
    height: 52px;
    font-size: 18px;
    margin-top: 6px;
  }
  .login-signup {
    font-size: 13px;
  }
  .login-signup span {
    font-size: 13px;
  }
}
</style>
