<template>
  <div class="avatarCollection">
    <div v-if="account.currentUser.gender == 'M'" class="avatar-card-container">
      <avatar-card
        v-for="(avatar, i) in avatars.avatarMan"
        :avatar="avatar"
        :key="i"
      />
    </div>
    <div v-if="isWoman" class="avatar-card-container">
      <avatar-card
        v-for="(avatar, i) in avatars.avatarWoman"
        :avatar="avatar"
        :key="i"
      />
    </div>
  </div>
  <button class="main-btn" id="avatarBtn" @click="toggleAvatar()">
    아바타&#160;&#160;&#160;<i class="fa-solid fa-person-half-dress"></i>
  </button>
</template>

<script>
import AvatarCard from "@/components/main/AvatarCard.vue";
import { useAvatarStore } from "@/stores/main/avatar";
import { useAccountStore } from "@/stores/land/account";
import { onBeforeUnmount, onMounted } from "vue";

export default {
  name: "AvatarSelect",
  components: { AvatarCard },
  setup() {
    const avatars = useAvatarStore();
    const account = useAccountStore();
    let mediaViewContent = null;
    let viewChangeHandler = null;
    const getHiddenOffset = () => {
      const background = document.querySelector(".background");
      if (!background) {
        return "-300px";
      }

      const cssWidth = getComputedStyle(background)
        .getPropertyValue("--main-avatar-panel-width")
        .trim();

      return cssWidth ? `calc(-1 * ${cssWidth})` : "-300px";
    };

    onMounted(() => {
      //media 반응형
      mediaViewContent = window.matchMedia(`(max-width: 700px)`);
      viewChangeHandler = (mediaQuery) => {
        var toggleBtn = document.getElementById("avatarBtn");
        var toggle = document.querySelector(".avatarCollection");

        if (!toggleBtn || !toggle) {
          return;
        }

        if (mediaQuery.matches === true) {
          toggle.style.left = getHiddenOffset();
          toggleBtn.style.bottom = "50px";
        } else {
          toggle.style.left = "0px";
          toggleBtn.style.bottom = "-70px";
        }
      };
      mediaViewContent.addEventListener("change", viewChangeHandler);
      viewChangeHandler(mediaViewContent);
    });

    onBeforeUnmount(() => {
      if (mediaViewContent && viewChangeHandler) {
        mediaViewContent.removeEventListener("change", viewChangeHandler);
      }
    });

    return { avatars, account };
  },
  computed: {
    isWoman() {
      return ["W", "F"].includes(this.account.currentUser.gender);
    },
  },
  methods: {
    toggleAvatar() {
      var toggle = document.querySelector(".avatarCollection");
      const background = document.querySelector(".background");
      const hiddenOffset = background
        ? `calc(-1 * ${getComputedStyle(background)
            .getPropertyValue("--main-avatar-panel-width")
            .trim() || "300px"})`
        : "-300px";

      if (toggle.style.left == "0px") {
        toggle.style.left = hiddenOffset;
      } else {
        toggle.style.left = "0px";
      }
    },
  },
};
</script>

<style>
.avatarCollection {
  position: absolute;
  left: calc(-1 * var(--main-avatar-panel-width, 300px));
  width: var(--main-avatar-panel-width, 300px);
  box-sizing: border-box;
  z-index: 2;
  height: calc(100% - 170px);
  top: 5px;
  padding-right: 20px;
  padding-left: 20px;
  border-radius: 20px;
  background: rgba(217, 217, 217, 0.5);
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  overflow-x: hidden;
  overflow-y: auto;
  justify-content: center;
  backdrop-filter: blur(5px);
  transition: 0.5s;
}
.avatarCollection::-webkit-scrollbar {
  width: 10px;
}
.avatarCollection::-webkit-scrollbar-thumb {
  height: 30%;
  background: #a056ff;
  border-radius: 10px;
}
#avatarBtn {
  position: absolute;
  left: var(--main-avatar-button-left, 60px);
  bottom: var(--main-avatar-button-bottom, 50px);
  margin: 0px;
  z-index: 2;
  transition: 0.5s;
}
@media screen and (max-width: 700px) {
  .avatarCollection {
    left: calc(-1 * var(--main-avatar-panel-width, 300px));
  }
  #avatarBtn {
    bottom: var(--main-avatar-button-bottom, 50px);
  }
}
@media screen and (min-width: 700px) {
  .avatarCollection {
    left: 0px;
    height: calc(100% - 10px);
    top: 5px;
  }
  #avatarBtn {
    bottom: -70px;
  }
}
</style>
