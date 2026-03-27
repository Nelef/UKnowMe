<template>
  <div class="participant-media">
    <video ref="videoElement" class="participant-video" autoplay playsinline />
    <audio ref="audioElement" autoplay />
  </div>
</template>

<script>
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

      const attachedElement = this.audioTrack.attach(audioElement);
      attachedElement.autoplay = true;
      attachedElement.muted = false;
      attachedElement
        .play()
        .catch((error) => {
          console.warn("상대방 오디오 재생 요청에 실패했습니다.", error);
        });
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

      const attachedElement = this.videoTrack.attach(videoElement);
      attachedElement.autoplay = true;
      attachedElement.playsInline = true;
      attachedElement
        .play()
        .catch((error) => {
          console.warn("상대방 비디오 재생 요청에 실패했습니다.", error);
        });
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
.participant-media {
  width: 100%;
  height: 100%;
}

.participant-video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background: #161223;
}
</style>
