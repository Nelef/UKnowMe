<template>
  <div>
    <video
      ref="videoElement"
      :class="{
        otherVideo1: main.option.matchingRoom == 1 && chat.mobile == false,
        otherVideo2: main.option.matchingRoom == 2 || chat.mobile == true,
      }"
      autoplay
      playsinline
    />
    <audio ref="audioElement" autoplay />
  </div>
</template>

<script>
import { useMainStore } from "@/stores/main/main";
import { useChatStore } from "@/stores/chat/chat";

export default {
  name: "ParticipantMedia",

  props: {
    audioTrack: Object,
    videoTrack: Object,
  },

  data() {
    return {
      attachedAudioTrack: null,
      attachedVideoTrack: null,
    };
  },

  setup() {
    const main = useMainStore();
    const chat = useChatStore();
    return { main, chat };
  },

  watch: {
    audioTrack() {
      this.attachAudioTrack();
    },
    videoTrack() {
      this.attachVideoTrack();
    },
  },

  mounted() {
    this.attachVideoTrack();
    this.attachAudioTrack();
  },

  beforeUnmount() {
    this.detachAudioTrack();
    this.detachVideoTrack();
  },

  methods: {
    attachAudioTrack() {
      const audioElement = this.$refs.audioElement;
      if (!audioElement) {
        return;
      }

      this.detachAudioTrack();

      if (!this.audioTrack) {
        return;
      }

      this.audioTrack.attach(audioElement);
      this.attachedAudioTrack = this.audioTrack;
    },

    attachVideoTrack() {
      const videoElement = this.$refs.videoElement;
      if (!videoElement) {
        return;
      }

      this.detachVideoTrack();

      if (!this.videoTrack) {
        return;
      }

      this.videoTrack.attach(videoElement);
      this.attachedVideoTrack = this.videoTrack;
    },

    detachAudioTrack() {
      const audioElement = this.$refs.audioElement;
      if (this.attachedAudioTrack && audioElement) {
        this.attachedAudioTrack.detach(audioElement);
      }
      this.attachedAudioTrack = null;
    },

    detachVideoTrack() {
      const videoElement = this.$refs.videoElement;
      if (this.attachedVideoTrack && videoElement) {
        this.attachedVideoTrack.detach(videoElement);
      }
      this.attachedVideoTrack = null;
    },
  },
};
</script>

<style>
.otherVideo1 {
  border: 3px solid purple;
  border-radius: 20px;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  max-width: calc(100vw / 2 - 40px);
  height: calc(100vh - var(--chat-sub-size) - 60px);
  max-height: calc((100vw / 2 - 40px) * 3 / 4);
}
.otherVideo2 {
  border: 3px solid purple;
  border-radius: 20px;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  max-width: calc(100vw / var(--video-size) - 40px);
  height: calc((100vh - var(--chat-sub-size)) / 2 - 80px);
  max-height: calc((100vw / var(--video-size) - 40px) * 3 / 4);
}
</style>
