<template>
  <div class="oauth-redirect-view">SNS 로그인 정보를 확인 중입니다.</div>
</template>

<script>
import { onMounted } from 'vue'
import { useAccountStore } from '@/stores/land/account'

export default {
  name: 'OAuthRedirectView',
  setup() {
    const account = useAccountStore()

    onMounted(() => {
      account.handleSocialLoginRedirect()
    })

    return {}
  },
}
</script>

<style>
.oauth-redirect-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 18px;
  font-weight: 600;
}
</style>
