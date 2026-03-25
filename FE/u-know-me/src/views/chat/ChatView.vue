<template>
  <HeartRain v-if="chat.heartRainFlag" />
  <div class="chat-body" id="main-container">
    <div id="session">
      <div
        :class="{
          'video-container1':
            main.option.matchingRoom == 1 && chat.mobile == false,
          'video-container2':
            main.option.matchingRoom == 2 || chat.mobile == true,
        }"
      >
        <div class="video-item" id="my-video">
          <video
            :class="{
              'my-real-video1':
                main.option.matchingRoom == 1 && chat.mobile == false,
              'my-real-video2':
                main.option.matchingRoom == 2 || chat.mobile == true,
            }"
            autoplay
            muted
            playsinline
            style="display: none"
          ></video>
          <video
            id="test-video"
            style="display: none"
            autoplay
            muted
            playsinline
          ></video>
          <div :class="['preview', { 'preview-solo': chat.soloMode }]">
            <video
              class="input_video"
              autoplay
              muted
              playsinline
              style="position: absolute; left: 0%"
            ></video>
            <video
              class="input_video2"
              autoplay
              muted
              playsinline
              style="position: absolute; left: 0%; display: none"
            ></video>
            <canvas
              class="guides"
              style="position: absolute; left: 0%"
            ></canvas>
            <div
              class="motion-status"
              :class="{ active: chat.motionFaceCount > 0 || chat.motionPoseCount > 0 }"
            >
              {{ motionStatusText }}
            </div>
          </div>
          <div>
            <p>{{ account.currentUser.nickname }}</p>
          </div>
        </div>
        <user-video
          v-for="participant in remoteParticipants"
          :key="participant.identity"
          :participant="participant"
        />
      </div>
    </div>
    <chat-sub />
    <accuse-modal v-if="chat.accuseBtn === 1" />
    <game-modal v-if="chat.gameBtn === 1" />
    <!-- <chat-something /> -->
    <loading-modal v-if="chat.loading === 1" />
    <live-kit-limit-modal v-if="chat.liveKitQuotaModal" />
  </div>
</template>

<script>
import axios from "axios";
import { Room, RoomEvent, Track, createLocalAudioTrack } from "livekit-client";
import { nextTick } from "vue";
import UserVideo from "@/components/chat/UserVideo";
import { useChatStore } from "@/stores/chat/chat";
import { storeToRefs } from "pinia";
import { useAccountStore } from "@/stores/land/account";

// import ChatSomething from "@/components/chat/ChatSomething.vue";
import ChatSub from "@/components/chat/ChatSub.vue";
import AccuseModal from "@/components/chat/AccuseModal.vue";
import GameModal from "@/components/chat/GameModal.vue";
import LoadingModal from "@/components/chat/LoadingModal.vue";
import HeartRain from "@/components/chat/HeartRain.vue";
import LiveKitLimitModal from "@/components/chat/LiveKitLimitModal.vue";
import { useMainStore } from "@/stores/main/main";
import sr from "@/api/spring-rest";

axios.defaults.headers.post["Content-Type"] = "application/json";

export default {
  name: "App",

  components: {
    UserVideo,
    ChatSub,
    AccuseModal,
    GameModal,
    LoadingModal,
    HeartRain,
    LiveKitLimitModal,
  },
  setup() {
    const account = useAccountStore();
    const chat = useChatStore();
    const main = useMainStore();

    let { SessionName } = storeToRefs(chat);

    return {
      main,
      account,
      chat,
      SessionName,
    };
  },
  computed: {
    motionStatusText() {
      if (!this.chat.motionCheck) {
        return "모션 인식이 꺼져 있습니다";
      }

      if (this.chat.motionFaceCount > 0 || this.chat.motionPoseCount > 0) {
        return `모션 인식 중 · 얼굴 ${this.chat.motionFaceCount} / 자세 ${this.chat.motionPoseCount}`;
      }

      return "얼굴을 카메라 중앙에 맞춰주세요";
    },
  },

  data() {
    return {
      mySessionId: "",
      myUserName: "",
      timeIntervalId: null,
      keywordIntervalId: null,
      readyIntervalId: null,
      beforeUnloadHandler: null,
      remoteParticipants: [],
    };
  },
  mounted() {
    this.timeIntervalId = window.setInterval(() => {
      this.chat.getTime();
    }, 1000);
    this.keywordIntervalId = window.setInterval(() => {
      this.chat.keywordMessage();
    }, 30000);
    this.beforeUnloadHandler = () => {
      this.chat.leaveSession({ navigate: false });
    };
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
    this.joinSession();
    this.chat.systemMessagePrint(
      "상호간에 매너채팅은 필수! 좋은 만남 보내세요~"
    );
  },
  beforeUnmount() {
    if (this.timeIntervalId) {
      window.clearInterval(this.timeIntervalId);
    }
    if (this.keywordIntervalId) {
      window.clearInterval(this.keywordIntervalId);
    }
    if (this.readyIntervalId) {
      window.clearInterval(this.readyIntervalId);
    }
    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    }
  },
  beforeRouteLeave(to, from, next) {
    this.chat.leaveSession({ navigate: false }).finally(() => next());
  },
  methods: {
    async joinSession() {
      try {
        this.chat.logDebug("joinSession:start", {
          route: this.$route.fullPath,
          sessionName: this.SessionName,
        });
        this.chat.loading = 1;
        this.chat.setLoadingState(0, "사용자 정보를 확인하는 중..");
        await this.account.fetchCurrentUser();
        this.chat.logDebug("joinSession:userFetched", {
          userSeq: this.account.currentUser.seq,
          avatarSeq: this.account.currentUser.avatar?.seq,
          nickname: this.account.currentUser.nickname,
        });
        await nextTick();
        this.chat.soloMode = this.$route.query.solo === "1";
        this.chat.liveKitQuotaModal = false;
        this.chat.getTime();
        this.mySessionId = String(this.SessionName || "SessionA");
        this.myUserName = this.account.currentUser.nickname;
        if (!this.chat.soloMode) {
          this.chat.logDebug("joinSession:socketConnect", {
            userSeq: this.account.currentUser.seq,
          });
          this.chat.socketConnect(this.account.currentUser.seq);
        }
        this.chat.setLoadingState(5, "아바타 장면을 준비하는 중..");
        await this.chat.avatarLoad(this.account.currentUser.avatar.seq);
        this.chat.logDebug("joinSession:avatarLoadCalled", {
          avatarSeq: this.account.currentUser.avatar.seq,
        });
        await nextTick();
        var avatarVideo = await this.chat.startHolistic();
        this.chat.logDebug("joinSession:startHolisticDone", {
          hasAvatarVideo: Boolean(avatarVideo),
          avatarTrackReadyState: avatarVideo?.readyState,
        });
        this.readyIntervalId = window.setInterval(() => {
          if (this.chat.ready) {
            this.chat.logDebug("joinSession:readyIntervalSatisfied");
            this.chat.setLoadingState(90, "안정화 중..");
            setTimeout(() => {
              if (this.chat.soloMode) {
                this.chat.setLoadingState(100, "혼자 해보기 준비 완료");
                this.chat.loading = 0;
                this.chat.systemMessagePrint("혼자 해보기 모드입니다.");
                return;
              }

              this.startLiveKit(avatarVideo);
            }, 3000);
            if (this.readyIntervalId) {
              window.clearInterval(this.readyIntervalId);
              this.readyIntervalId = null;
            }
          }
        }, 1000);
      } catch (error) {
        this.chat.logDebug("joinSession:error", {
          message: error?.message || String(error),
          stack: error?.stack || null,
        });
        console.error("채팅 초기화 중 오류가 발생했습니다.", error);
        this.chat.setLoadingState(0, "모션 인식 초기화에 실패했습니다.");
        this.chat.loading = 0;
      }
    },

    async startLiveKit(avatarVideo) {
      console.log("5. LiveKit 시작");

      try {
        this.chat.setLoadingState(92, "채팅 세션에 연결하는 중..");
        const connection = await this.createParticipantToken(this.mySessionId);
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        this.chat.room = room;
        this.chat.roomServerUrl = connection.serverUrl;
        this.chat.participantToken = connection.participantToken;

        this.bindRoomEvents(room);
        await room.connect(connection.serverUrl, connection.participantToken);

        const audioTrack = await createLocalAudioTrack();
        const audioPublication = await room.localParticipant.publishTrack(audioTrack, {
          source: Track.Source.Microphone,
          name: "microphone",
        });
        this.chat.localAudioTrack = audioPublication.track || audioTrack;

        this.chat.setLoadingState(97, "아바타 비디오를 게시하는 중..");
        await this.chat.switchPublishedVideoTrack(avatarVideo, {
          stopPrevious: false,
          trackName: "avatar-camera",
        });

        this.syncRemoteParticipants();
        this.chat.setLoadingState(100, "입장 완료");
        this.chat.loading = 0;
      } catch (error) {
        console.error("LiveKit 연결 중 오류가 발생했습니다.", error);
        this.chat.loading = 0;

        if (this.isLiveKitQuotaExceededError(error)) {
          this.chat.liveKitQuotaModal = true;

          if (this.chat.webSocket) {
            try {
              this.chat.webSocket.close();
            } catch (closeError) {
              console.warn("채팅 웹소켓 종료 중 오류가 발생했습니다.", closeError);
            }
            this.chat.webSocket = null;
          }
        }
      }
    },

    bindRoomEvents(room) {
      const syncParticipants = () => this.syncRemoteParticipants();

      room.on(RoomEvent.TrackSubscribed, syncParticipants);
      room.on(RoomEvent.TrackUnsubscribed, syncParticipants);
      room.on(RoomEvent.ParticipantConnected, syncParticipants);
      room.on(RoomEvent.ParticipantDisconnected, syncParticipants);
      room.on(RoomEvent.Disconnected, () => {
        this.remoteParticipants = [];
      });
    },

    syncRemoteParticipants() {
      if (!this.chat.room) {
        this.remoteParticipants = [];
        return;
      }

      const participants = [];

      this.chat.room.remoteParticipants.forEach((participant) => {
        let videoTrack = null;
        let audioTrack = null;

        participant.trackPublications.forEach((publication) => {
          if (!publication.isSubscribed || !publication.track) {
            return;
          }

          if (publication.track.kind === Track.Kind.Video && !videoTrack) {
            videoTrack = publication.track;
          }

          if (publication.track.kind === Track.Kind.Audio && !audioTrack) {
            audioTrack = publication.track;
          }
        });

        participants.push({
          identity: participant.identity,
          name: participant.name || participant.identity,
          videoTrack,
          audioTrack,
        });
      });

      this.remoteParticipants = participants.filter(
        participant => participant.videoTrack || participant.audioTrack
      );
    },

    createParticipantToken(mySessionId) {
      return axios({
        url: sr.sessions.connect(),
        method: "post",
        data: {
          roomSeq: String(mySessionId),
          participantIdentity: String(this.account.currentUser.seq),
          participantName: this.account.currentUser.nickname,
          participantMetadata: JSON.stringify({
            memberSeq: this.account.currentUser.seq,
          }),
        },
        headers: this.account.authHeader,
      }).then((response) => response.data);
    },
    isLiveKitQuotaExceededError(error) {
      const candidates = [
        error?.message,
        error?.reason,
        error?.details,
        error?.response?.data?.message,
        error?.response?.data?.error,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        error?.status === 429 ||
        error?.response?.status === 429 ||
        candidates.includes("quota") ||
        candidates.includes("limit") ||
        candidates.includes("exceed") ||
        candidates.includes("resource_exhausted") ||
        candidates.includes("concurrent")
      );
    },
  },
};
</script>

<style>
h1 {
  margin: 0;
}
#join,
#session {
  position: relative;
  flex: 1;
}
.chat-body {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* background: radial-gradient(
    61.17% 61.17% at 50% 50%,
    #ebdcfe 56.77%,
    #ffffff 100%
  ); */
}

.video-container1 {
  position: absolute;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  width: 100vw;
  height: calc(100vh - var(--chat-sub-size));
  max-height: calc((100vw / 2 -40px) / 4 * 3 + 60px);
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.video-container2 {
  position: absolute;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  width: calc((100vh - var(--chat-sub-size) -20px) / 3 * 2 * var(--video-size));
  height: calc(100vh - var(--chat-sub-size));
  max-height: calc(100vw * 3 / 2 / var(--video-size));
  max-width: 100vw;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.video-item {
  position: relative;
  height: calc((100vh - var(--chat-sub-size)) / 2 - 40px);
  max-height: calc(100vw * 3 / 4 / var(--video-size));
  max-width: calc(100vw / var(--video-size) - 40px);
  margin: 20px;
  text-align: center;
}
/* 1:1일때 canvas 크기 */
#avatarCanvas1,
.my-real-video1 {
  border: 3px solid purple;
  border-radius: 20px;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  width: auto !important;
  max-width: calc(100vw / 2 - 40px) !important;
  height: calc(100vh - var(--chat-sub-size) - 60px) !important;
  max-height: calc((100vw / 2 - 40px) * 3 / 4) !important;
}
/* 2:2일때 canvas 크기 */
#avatarCanvas2,
.my-real-video2 {
  border: 3px solid purple;
  border-radius: 20px;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  width: auto !important;
  max-width: calc(100vw / var(--chat-sub-size) - 40px) !important;
  height: calc((100vh - var(--chat-sub-size)) / 2 - 80px) !important;
  max-height: calc((100vw / var(--video-size) - 40px) * 3 / 4) !important;
}
.my-real-video1,
.my-real-video2 {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg); /* Safari and Chrome */
  -moz-transform: rotateY(180deg); /* Firefox */
}
.preview {
  position: absolute;
  width: 30%;
  aspect-ratio: 4 / 3;
  left: 5%;
  top: 5%;
  z-index: 2;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(8, 10, 23, 0.78);
  box-shadow: 0px 14px 32px rgba(0, 0, 0, 0.28);
}
.preview.preview-solo {
  width: min(260px, 42%);
}
.preview video,
.preview .guides {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg); /* Safari and Chrome */
  -moz-transform: rotateY(180deg); /* Firefox */
}
.preview .guides {
  border: 0;
}
.motion-status {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 3;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(11, 13, 29, 0.72);
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  backdrop-filter: blur(8px);
}
.motion-status.active {
  background: rgba(60, 28, 124, 0.78);
}
.nickName {
  height: 20px;
}
</style>
