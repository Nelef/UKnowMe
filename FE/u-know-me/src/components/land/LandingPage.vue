<template>
  <div class="landing-page">
    <img
      class="landing-video-poster"
      :class="{ 'landing-video-poster-hidden': landingVideoVisible }"
      :src="landingPosterSrc"
      alt=""
      aria-hidden="true"
    >
    <video
      ref="landingVideo"
      class="landing-video"
      :class="{ 'landing-video-visible': landingVideoVisible }"
      :src="landingVideoSrc"
      :poster="landingPosterSrc"
      muted
      autoplay
      loop
      playsinline
      webkit-playsinline="true"
      preload="auto"
      disablepictureinpicture
      x-webkit-airplay="deny"
      aria-hidden="true"
    />
    <img class="landing-text" src="@/assets/land/landing-text.png" alt="landing-text">
    <div class="avatar">
      <img class="me" src="@/assets/land/character_woman.webp" alt="me">
      <img class="you-know" src="@/assets/land/character_man.webp" alt="you-know">
    </div>
  </div>
  <cite class="img-cite">&copy; The Jazz Hop Café</cite>
</template>
<script>
import landingVideoSrc from '@/assets/land/landing-background.mp4'
import landingPosterSrc from '@/assets/land/landing-background-poster.jpg'

export default {
  name: 'LandingPage',
  data() {
    return {
      landingVideoSrc,
      landingPosterSrc,
      landingVideoVisible: false,
      landingVideoRetryHandler: null,
      landingVideoVisibilityHandler: null,
      landingVideoPageShowHandler: null,
      landingVideoPlayingHandler: null,
      landingVideoWaitingHandler: null,
      landingVideoErrorHandler: null,
    }
  },
  mounted() {
    const videoElement = this.$refs.landingVideo
    if (!videoElement) {
      return
    }

    this.prepareLandingVideo(videoElement)
    this.bindLandingVideoRetry(videoElement)
    this.tryPlayLandingVideo(videoElement)
  },
  beforeUnmount() {
    const videoElement = this.$refs.landingVideo
    this.unbindLandingVideoRetry(videoElement)
  },
  methods: {
    prepareLandingVideo(videoElement) {
      if (!videoElement) {
        return
      }

      videoElement.muted = true
      videoElement.defaultMuted = true
      videoElement.autoplay = true
      videoElement.loop = true
      videoElement.playsInline = true
      videoElement.setAttribute('autoplay', '')
      videoElement.setAttribute('muted', '')
      videoElement.setAttribute('playsinline', '')
      videoElement.setAttribute('webkit-playsinline', 'true')
      videoElement.setAttribute('disablepictureinpicture', '')
      videoElement.setAttribute('x-webkit-airplay', 'deny')
      videoElement.volume = 0
      videoElement.controls = false
      videoElement.poster = this.landingPosterSrc
      videoElement.load()
    },
    tryPlayLandingVideo(videoElement = this.$refs.landingVideo) {
      if (!videoElement) {
        return
      }

      const playPromise = videoElement.play?.()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          this.landingVideoVisible = false
        })
      }
    },
    bindLandingVideoRetry(videoElement) {
      if (!videoElement) {
        return
      }

      const retryPlayback = () => {
        this.tryPlayLandingVideo(videoElement)
      }
      const retryWhenVisible = () => {
        if (!document.hidden) {
          this.tryPlayLandingVideo(videoElement)
        }
      }
      const markVideoVisible = () => {
        this.landingVideoVisible = true
      }
      const markVideoHidden = () => {
        if (!videoElement.currentTime || videoElement.readyState < 2) {
          this.landingVideoVisible = false
        }
      }
      const handleVideoError = () => {
        this.landingVideoVisible = false
      }

      this.landingVideoRetryHandler = retryPlayback
      this.landingVideoVisibilityHandler = retryWhenVisible
      this.landingVideoPageShowHandler = retryPlayback
      this.landingVideoPlayingHandler = markVideoVisible
      this.landingVideoWaitingHandler = markVideoHidden
      this.landingVideoErrorHandler = handleVideoError

      videoElement.addEventListener('loadedmetadata', retryPlayback)
      videoElement.addEventListener('loadeddata', retryPlayback)
      videoElement.addEventListener('canplay', retryPlayback)
      videoElement.addEventListener('canplaythrough', retryPlayback)
      videoElement.addEventListener('playing', markVideoVisible)
      videoElement.addEventListener('timeupdate', markVideoVisible)
      videoElement.addEventListener('seeked', markVideoVisible)
      videoElement.addEventListener('pause', markVideoHidden)
      videoElement.addEventListener('suspend', retryPlayback)
      videoElement.addEventListener('stalled', retryPlayback)
      videoElement.addEventListener('error', handleVideoError)
      document.addEventListener('visibilitychange', retryWhenVisible)
      window.addEventListener('pageshow', retryPlayback)
      window.addEventListener('focus', retryPlayback)
      window.addEventListener('pointerdown', retryPlayback)
      window.addEventListener('touchstart', retryPlayback, { passive: true })
    },
    unbindLandingVideoRetry(videoElement) {
      if (!videoElement || !this.landingVideoRetryHandler) {
        return
      }

      videoElement.removeEventListener('loadedmetadata', this.landingVideoRetryHandler)
      videoElement.removeEventListener('loadeddata', this.landingVideoRetryHandler)
      videoElement.removeEventListener('canplay', this.landingVideoRetryHandler)
      videoElement.removeEventListener('canplaythrough', this.landingVideoRetryHandler)
      videoElement.removeEventListener('playing', this.landingVideoPlayingHandler)
      videoElement.removeEventListener('timeupdate', this.landingVideoPlayingHandler)
      videoElement.removeEventListener('seeked', this.landingVideoPlayingHandler)
      videoElement.removeEventListener('pause', this.landingVideoWaitingHandler)
      videoElement.removeEventListener('suspend', this.landingVideoRetryHandler)
      videoElement.removeEventListener('stalled', this.landingVideoRetryHandler)
      videoElement.removeEventListener('error', this.landingVideoErrorHandler)
      document.removeEventListener('visibilitychange', this.landingVideoVisibilityHandler)
      window.removeEventListener('pageshow', this.landingVideoPageShowHandler)
      window.removeEventListener('focus', this.landingVideoRetryHandler)
      window.removeEventListener('pointerdown', this.landingVideoRetryHandler)
      window.removeEventListener('touchstart', this.landingVideoRetryHandler)

      this.landingVideoRetryHandler = null
      this.landingVideoVisibilityHandler = null
      this.landingVideoPageShowHandler = null
      this.landingVideoPlayingHandler = null
      this.landingVideoWaitingHandler = null
      this.landingVideoErrorHandler = null
    },
  },
}
</script>

<style>
.landing-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  /* background-size: cover; */
  /* background-position: center; */
  /* background-image: url("@/assets/land/landing_background.png"); */
}
.landing-video-poster,
.landing-video {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  background: #0e0f13;
}
.landing-video-poster {
  z-index: 0;
  opacity: 1;
  transition: opacity 180ms ease;
  pointer-events: none;
}
.landing-video-poster-hidden {
  opacity: 0;
}
.landing-video {
  z-index: 1;
  opacity: 0;
  transition: opacity 220ms ease;
}
.landing-video-visible {
  opacity: 1;
}
.landing-text {
  position: absolute;
  z-index: 2;
  /* width: 210px; */
  /* height: 271px; */
  height: 30%;
  right: 50%;
  top: 0px;
  transform: translate(50%, 0%);
  filter: drop-shadow(0px 5.25522px 5.25522px rgba(0, 0, 0, 0.25));
  pointer-events: none;
}
.you-know {
  position: absolute;
  z-index: 2;
  /* width: 520px; */
  height: 78%;
  right: calc(50% - 14vh);
  bottom: 0px;
  transform: translate(50%, 0%);
  pointer-events: none;
}
.me {
  position: absolute;
  z-index: 2;
  /* width: 600px; */
  height: 74%;
  /* left: calc(42% - 40vh); */
  right: calc(50% + 18vh);
  bottom: 0px;
  transform: translate(50%, 0%);
  pointer-events: none;
}
.img-cite {
  position: fixed;
  color: white;
  font-size: 12px;
  bottom: 0;
  left: 10px;
  z-index: 3;
}
</style>
