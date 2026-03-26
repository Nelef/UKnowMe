<template>
  <main-modal v-if="main.btnCh !== 0" />
  <div class="background">
    <avatar-select />
    <now-avatar />
    <button-list />
  </div>
</template>

<script>
import { onMounted } from "vue";
import AvatarSelect from "@/components/main/AvatarSelect.vue";
import NowAvatar from "@/components/main/NowAvatar.vue";
import ButtonList from "@/components/main/ButtonList.vue";
import MainModal from "@/components/main/MainModal.vue";
import { useMainStore } from "@/stores/main/main";
import { useAccountStore } from '@/stores/land/account';

export default {
  name: "MainPage",
  components: { AvatarSelect, NowAvatar, ButtonList, MainModal },
  setup() {
    const main = useMainStore();
    const account = useAccountStore();

    onMounted(() => {
      account.fetchCurrentUser();
    });

    return { main, account };
  },
};
</script>

<style>
body {
  margin: 0;
}
.background {
  --main-side-gap: 20px;
  --main-top-gap: 15px;
  --main-avatar-panel-width: 300px;
  --main-right-panel-width: 240px;
  --main-right-offset: 50px;
  --main-avatar-button-left: 60px;
  --main-avatar-button-bottom: 50px;
  background: linear-gradient(180deg, #ebdcfe 0%, rgba(217, 217, 217, 0) 100%);
  width: 100vw;
  height: 100vh;
}

@media screen and (max-width: 700px) {
  .background {
    --main-side-gap: 12px;
    --main-top-gap: 10px;
    --main-avatar-panel-width: min(300px, calc(100vw - 24px));
    --main-right-panel-width: 190px;
    --main-right-offset: 12px;
    --main-avatar-button-left: 12px;
    --main-avatar-button-bottom: 50px;
  }
}
</style>
