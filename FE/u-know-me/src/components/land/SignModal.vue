<template>
  <div class="sign-modal-bg">
    <div class="sign-modal" 
    :class="{
        'signin-modal': btnCh===1, 
        'signup-modal': btnCh===2,
      }">
      <div class="close-btn" @click="signModalClose()">
        <i class="fa-solid fa-xmark x-btn"></i>
      </div>
      <div
      class="sign-modal-content"
      :class="{
        'signin-modal-content': btnCh===1, 
        'signup-modal-content': btnCh===2,
      }">
        <SignIn v-if="btnCh===1"/>
        <SignUp v-if="btnCh===2"/>
      </div>
    </div>
  </div>
</template>

<script>
import SignIn from '@/components/land/modal/SignIn.vue'
import SignUp from '@/components/land/modal/SignUp.vue'
import { storeToRefs } from 'pinia'
import { useLandStore } from '@/stores/land/land'
import { useAccountStore } from '@/stores/land/account'


export default {
  name: 'SignModal',
  components: {
    SignIn,
    SignUp,
  },
  methods: {
    signModalClose() {
      this.btnCh = 0;
      this.account.checkSign = {
        id: 0,
        nickName: 0,
      },
      this.account.$reset()
    },
  },
  setup() {
    const land = useLandStore()
    const account = useAccountStore()
    const { btnCh } = storeToRefs(land)
    return {
      land,
      btnCh,
      account,
    }
  },
}
</script>

<style>
.sign-modal-bg {
  position: fixed;
  inset: 0;
  z-index: 20;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(24px, calc(env(safe-area-inset-bottom) + 12px))
    max(16px, env(safe-area-inset-left));
  overflow-y: auto;
  min-height: 100vh;
  min-height: 100dvh;
}
.sign-modal {
  position: relative;
  width: min(550px, 100%);
  max-height: min(760px, calc(100vh - 32px));
  max-height: min(760px, calc(100dvh - 32px));
  margin: auto;
  background: #FFFFFF;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  border-radius: 27px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.signin-modal {
  min-height: min(480px, calc(100vh - 32px));
  min-height: min(480px, calc(100dvh - 32px));
}
.signup-modal {
  height: min(740px, calc(100vh - 32px));
  height: min(740px, calc(100dvh - 32px));
}
.sign-modal-content {
  flex: 1 1 auto;
  min-height: 0;
  padding: 32px 62px;
}
.signin-modal-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 40px 69px 32px;
  text-align: center;
}
.signup-modal-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 32px 62px;
}
.close-btn {
  position: absolute;
  right: 20px;
  top: 20px;
  z-index: 1;
}
.x-btn {
  font-size: 48px;
  cursor: pointer;
}

@media (max-width: 640px) {
  .sign-modal-bg {
    align-items: flex-start;
    padding-top: max(12px, calc(env(safe-area-inset-top) + 8px));
  }
  .sign-modal {
    width: 100%;
    border-radius: 24px;
    max-height: calc(100vh - 24px);
    max-height: calc(100dvh - 24px);
  }
  .signin-modal {
    min-height: auto;
  }
  .signup-modal {
    height: calc(100vh - 24px);
    height: calc(100dvh - 24px);
  }
  .sign-modal-content,
  .signin-modal-content,
  .signup-modal-content {
    padding: 72px 20px 24px;
  }
  .close-btn {
    right: 16px;
    top: 16px;
  }
  .x-btn {
    font-size: 40px;
  }
}
</style>
