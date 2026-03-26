<template>
  <section id="modifyInform">
    <div class="secure-card">
      <div class="inform-secure-head">비밀번호 변경</div>
      <p class="secure-description">현재 비밀번호를 확인한 뒤 새 비밀번호로 교체합니다.</p>

      <Form id="informSecureForm" action="POST" class="text-center" @submit="account.changePassword(password)">
        <div>
          <div>
            <div class="text-inform"><label for="informSecurePassword">현재 비밀번호</label></div>
            <div>
              <div><Field type="password" name="informSecurePassword" id="informSecurePassword" placeholder="비밀번호를 입력해주세요.." :rules="validateCurrentPassword" /></div>
              <div class="text-left"><ErrorMessage class="error-message" name="informSecurePassword"/></div>
            </div>
          </div>
          <div>
            <div class="text-inform"><label for="informSecureNewPassword">새 비밀번호</label></div>
            <div>
              <div><Field type="password" name="informSecureNewPassword" id="informSecureNewPassword" placeholder="비밀번호를 입력해주세요.." v-model="password.changePassword" :rules="validatePassword" /></div>
              <div class="text-left"><ErrorMessage class="error-message" name="informSecureNewPassword"/></div>
            </div>
          </div>
          <div>
            <div class="text-inform"><label for="informSecureNewConfigPassword">새 비밀번호 확인</label></div>
            <div>
              <div><Field type="password" name="informSecureNewConfigPassword" id="informSecureNewConfigPassword" placeholder="비밀번호를 재입력해주세요." :rules="validateRePassword" /></div>
              <div class="text-left"><ErrorMessage class="error-message" name="informSecureNewConfigPassword"/></div>
            </div>
          </div>
        </div>
        <div><button type="submit" class="inform-secure-btn">비밀번호 변경하기</button></div>
      </Form>
    </div>

    <div class="secure-card secure-danger-card">
      <div class="inform-secure-head">회원탈퇴</div>
      <p class="secure-description">탈퇴하면 현재 계정 정보가 비활성화되며 되돌릴 수 없습니다.</p>
      <div class="text-center">
        <button @click="account.deleteAccount()" class="inform-secure-btn inform-delete-btn">회원탈퇴</button>
      </div>
    </div>
  </section>
</template>

<script>
import { ref } from 'vue'
import { Field, Form, ErrorMessage } from 'vee-validate';
import { useMainStore } from "@/stores/main/main";
import { useAccountStore } from "@/stores/land/account";

export default {
  name: "InformSecure",
  components: {
    Field, 
    Form, 
    ErrorMessage,
  },
  methods: {
    validateCurrentPassword(value) {
      if (!value) {
        return '필수정보 입니다.';
      }
      this.account.modifyCertificatePassword(value)
      if (!this.account.correctPassword) {
        return '현재 비밀번호와 일치하지 않습니다.'
      }
      return true;
    },
    validatePassword(value) {
      if (!value) {
        return '필수정보 입니다.';
      }
      const pwJ = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{8,16}$/;
      if (!pwJ.test(value)) {
        return '8~16자의 영문 대소문자, 숫자, 특수문자 중 3가지 이상 조합해야 합니다.';
      }
      return true;
    },
    validateRePassword(value) {
      if (!value) {
        return '필수정보 입니다.';
      }
      if (this.password.changePassword !== value) {
        return '비밀번호가 일치하지 않습니다.';
      }
      return true;
    },
  },
  setup() {
    const main = useMainStore();
    const account = useAccountStore();
    const password = ref({
      changePassword: '',
    })
    return {
      main,
      account,
      password,
    };
  },
};
</script>

<style scoped>
#modifyInform {
  display: grid;
  gap: 16px;
  max-height: min(54vh, 520px);
  padding-right: 8px;
  overflow-x: hidden;
  overflow-y: auto;
}
#modifyInform::-webkit-scrollbar {
  width: 10px;
}
#modifyInform::-webkit-scrollbar-thumb {
  height: 30%;
  background: #A056FF;
  border-radius: 10px;
}
#modifyInform::-webkit-scrollbar-track {
  background: rgba(160, 86, 255, .1);
}
.secure-card {
  padding: 20px 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(160, 86, 255, 0.08);
}

.secure-danger-card {
  box-shadow: inset 0 0 0 1px rgba(221, 92, 124, 0.12);
}

.inform-secure-head {
  font-weight: 700;
  font-size: 24px;
  color: #241739;
}

.secure-description {
  margin: 8px 0 18px;
  color: #675f78;
  font-size: 14px;
  line-height: 1.7;
}

.text-left {
  text-align: left;
  margin-left: 0;
}
.text-inform {
  text-align: left;
  margin-left: 0;
  margin-top: 0;
}
.inform-secure-btn {
  margin: 18px 0 0;
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
#informSecureForm div {
  padding-top: 0;
}
#informSecureForm div label {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  color: #352653;
  display: inline-block;
  margin-bottom: 8px;
}
#informSecureForm div input, #informSecureForm div select {
  box-sizing: border-box;
  width: 100%;
  height: 50px;
  background: #fdfbff;
  border: 1px solid #dbcff0;
  border-radius: 16px;
  padding: 0 16px;
  color: #281b40;
  font-size: 15px;
}

#informSecureForm input:focus {
  outline: none;
  border-color: #a056ff;
  box-shadow: 0 0 0 4px rgba(160, 86, 255, 0.12);
}

.inform-secure-btn:hover {
  filter: brightness(0.98);
}

.inform-delete-btn {
  background: linear-gradient(135deg, #e56786, #ff8daa);
  box-shadow: 0 14px 26px rgba(229, 103, 134, 0.22);
}

:deep(.error-message) {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: #d53b57;
}

@media (max-width: 720px) {
  #modifyInform {
    max-height: none;
  }

  .secure-card {
    padding: 18px;
    border-radius: 18px;
  }
}
</style>
