<template>
  <HeartRain v-if="chat.heartRainFlag" />
  <div class="chat-body" id="main-container">
    <div id="session">
      <div class="chat-stage-shell">
        <div class="chat-stage-header" :style="{ maxWidth: stageMaxWidth }">
          <div class="chat-stage-copy">
            <div class="chat-stage-kicker">{{ stageKicker }}</div>
            <div class="chat-stage-title">{{ stageTitle }}</div>
            <p class="chat-stage-description">
              {{ stageDescription }}
            </p>
          </div>
          <div class="chat-stage-meta">
            <div class="chat-stage-pill">{{ stageSummaryText }}</div>
            <div class="chat-stage-pill">4:3 Canvas</div>
          </div>
        </div>

        <div class="chat-stage" :style="stageGridStyle">
          <div class="video-item video-item-local">
            <div class="video-stage" id="my-video">
              <video
                class="my-real-video"
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
              <div
                :class="[
                  'tracking-preview',
                  'tracking-preview-primary',
                  'tracking-preview-hidden',
                  { 'tracking-preview-solo': chat.soloMode },
                ]"
              >
                <video
                  class="tracking-primary-video"
                  autoplay
                  muted
                  playsinline
                ></video>
                <video
                  class="tracking-primary-video-passive"
                  autoplay
                  muted
                  playsinline
                  style="display: none"
                ></video>
                <canvas class="tracking-primary-canvas"></canvas>
                <canvas
                  class="tracking-gpu-canvas tracking-gpu-canvas-hidden"
                ></canvas>
              </div>
            </div>
            <div class="video-card-footer">
              <div class="video-card-status">{{ stageSummaryText }}</div>
              <p class="nickName">{{ account.currentUser.nickname }}</p>
            </div>
          </div>

          <user-video
            v-for="(participant, index) in remoteParticipants"
            :key="participant.renderKey || participant.identity"
            :participant="participant"
            :index="index + 1"
          />
        </div>

        <div
          v-if="showMonitorPanel"
          class="chat-monitor-panel"
          :style="{ maxWidth: stageMaxWidth }"
        >
          <div class="chat-monitor-copy">
            <div class="chat-monitor-kicker">Camera Preview</div>
            <div class="chat-monitor-title">실제 카메라와 인식 상태</div>
            <p class="chat-monitor-description">
              메인 아바타 캔버스와 분리해서 실제 입력 영상을 따로 확인합니다.
            </p>
          </div>

          <div class="chat-monitor-stage">
            <div
              class="tracking-preview-shell tracking-preview-debug"
              :class="{ 'tracking-preview-solo': chat.soloMode }"
            >
              <div class="tracking-preview tracking-preview-active">
                <video
                  class="tracking-debug-video"
                  autoplay
                  muted
                  playsinline
                  style="display: none"
                ></video>
                <canvas
                  class="tracking-debug-canvas"
                  style="display: none"
                ></canvas>
                <button
                  type="button"
                  class="tracking-preview-label"
                  @click.stop="toggleMotionDelegate"
                >
                  {{ trackingPreviewLabel }}
                </button>
              </div>
              <div
                class="motion-status"
                :class="{ active: chat.motionFaceCount > 0 || chat.motionPoseCount > 0 }"
              >
                {{ motionStatusText }}
              </div>
            </div>
          </div>
        </div>
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
    let { SessionName } = storeToRefs(chat);

    return {
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
    participantCount() {
      return this.remoteParticipants.length + 1;
    },
    stageLayout() {
      if (this.participantCount === 1) {
        const reservedHeight = this.showMonitorPanel ? 330 : 180;

        return {
          maxWidth: `min(1320px, calc(100vw - 32px), calc((100dvh - var(--chat-sub-size) - ${reservedHeight}px) * 4 / 3))`,
          minCardWidth: 720,
        };
      }

      const columnCount = Math.min(4, Math.ceil(Math.sqrt(this.participantCount)));
      const targetCardWidth =
        columnCount === 2 ? 520 : columnCount === 3 ? 360 : 300;
      const minCardWidth =
        columnCount === 2 ? 400 : columnCount === 3 ? 320 : 260;
      const maxWidth = columnCount * targetCardWidth + (columnCount - 1) * 24;

      return {
        maxWidth: `min(calc(100vw - 32px), ${maxWidth}px)`,
        minCardWidth,
      };
    },
    stageMaxWidth() {
      return this.stageLayout.maxWidth;
    },
    stageGridStyle() {
      return {
        maxWidth: this.stageMaxWidth,
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${this.stageLayout.minCardWidth}px), 1fr))`,
      };
    },
    stageKicker() {
      return this.chat.soloMode ? "Solo Stage" : "Live Stage";
    },
    stageTitle() {
      if (this.chat.loading === 1) {
        return "아바타 스테이지를 준비하는 중입니다";
      }

      if (this.participantCount === 1) {
        return this.chat.soloMode
          ? "혼자서도 크게 보이는 4:3 캔버스"
          : "상대를 기다리는 동안 메인 캔버스를 크게 유지합니다";
      }

      return `참가자 ${this.participantCount}명에 맞춰 자동 정렬됩니다`;
    },
    stageDescription() {
      if (this.chat.loading === 1) {
        return "모션 인식과 카메라 입력을 안정화한 뒤 채팅 세션으로 연결합니다.";
      }

      if (this.participantCount === 1) {
        return "실제 캠 프리뷰는 아래 별도 패널로 분리하고, 메인 영역은 아바타 캔버스에 집중되도록 구성했습니다.";
      }

      return "참가자 수가 늘어나면 카드가 정사각형에 가까운 그리드로 재배치되어 행과 열이 덜 어색하게 보이도록 맞춥니다.";
    },
    stageSummaryText() {
      if (this.chat.soloMode) {
        return "혼자 해보기";
      }

      if (this.remoteParticipants.length === 0) {
        return "연결 대기 중";
      }

      return `참가자 ${this.participantCount}명`;
    },
    showMonitorPanel() {
      return this.chat.loading === 1 || this.chat.motionCheck;
    },
    trackingPreviewLabel() {
      const forcedDelegate =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ukm-motion-delegate")
          : null;
      const activeDelegate = this.chat.holisticDelegate || "CPU";
      const delegateStatus = this.chat.holisticDelegateStatus;

      if (activeDelegate === "GPU") {
        return "GPU 사용 중";
      }

      if (forcedDelegate === "GPU") {
        if (delegateStatus === "gpu-precheck-failed") {
          return "CPU · GPU 미지원";
        }

        if (delegateStatus === "gpu-init-failed") {
          return "CPU · GPU 초기화 실패";
        }

        if (delegateStatus === "gpu-tracking-fallback") {
          return "CPU · GPU 불안정";
        }

        return "CPU · GPU 실패";
      }

      if (forcedDelegate === "CPU") {
        return "CPU 고정";
      }

      return "CPU 자동 · GPU 시도";
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
      remoteParticipantSignature: "",
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
        this.chat.refreshTrackingDebugPreviewFlag();
        this.chat.refreshDebugLoggingFlag();
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
      room.on(RoomEvent.TrackPublished, syncParticipants);
      room.on(RoomEvent.TrackUnpublished, syncParticipants);
      room.on(RoomEvent.ParticipantConnected, syncParticipants);
      room.on(RoomEvent.ParticipantDisconnected, syncParticipants);
      room.on(RoomEvent.Disconnected, () => {
        this.remoteParticipants = [];
        this.remoteParticipantSignature = "";
      });
    },

    syncRemoteParticipants() {
      if (!this.chat.room) {
        this.remoteParticipants = [];
        this.remoteParticipantSignature = "";
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
          renderKey: `${participant.identity}:${videoTrack?.sid || "no-video"}:${audioTrack?.sid || "no-audio"}`,
        });
      });

      const nextParticipants = participants.filter(
        participant => participant.videoTrack || participant.audioTrack
      );
      const nextSignature = nextParticipants
        .map((participant) => participant.renderKey)
        .join("|");

      if (nextSignature === this.remoteParticipantSignature) {
        return;
      }

      this.remoteParticipantSignature = nextSignature;
      this.remoteParticipants = nextParticipants;

      this.chat.logDebug("syncRemoteParticipants", {
        count: this.remoteParticipants.length,
        participants: this.remoteParticipants.map((participant) => ({
          identity: participant.identity,
          videoSid: participant.videoTrack?.sid || null,
          audioSid: participant.audioTrack?.sid || null,
        })),
      });
    },

    createParticipantToken(mySessionId) {
      const liveKitClientId = this.getOrCreateLiveKitClientId();

      return axios({
        url: sr.sessions.connect(),
        method: "post",
        data: {
          roomSeq: String(mySessionId),
          participantIdentity: `${this.account.currentUser.seq}:${liveKitClientId}`,
          participantName: this.account.currentUser.nickname,
          participantMetadata: JSON.stringify({
            memberSeq: this.account.currentUser.seq,
            clientId: liveKitClientId,
          }),
        },
        headers: this.account.authHeader,
      }).then((response) => response.data);
    },
    getOrCreateLiveKitClientId() {
      const storageKey = "ukm-livekit-client-id";
      const existingClientId = window.sessionStorage.getItem(storageKey);

      if (existingClientId) {
        return existingClientId;
      }

      const generatedClientId =
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      window.sessionStorage.setItem(storageKey, generatedClientId);
      return generatedClientId;
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
    toggleMotionDelegate() {
      const currentForcedDelegate =
        window.localStorage.getItem("ukm-motion-delegate");

      if (currentForcedDelegate === "GPU") {
        window.localStorage.setItem("ukm-motion-delegate", "CPU");
      } else if (currentForcedDelegate === "CPU") {
        window.localStorage.removeItem("ukm-motion-delegate");
      } else {
        window.localStorage.setItem("ukm-motion-delegate", "GPU");
      }
      this.chat
        .reconfigureHolisticDelegate()
        .catch((error) =>
          console.error("모션 delegate 전환 중 오류가 발생했습니다.", error)
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
  min-height: 0;
  display: flex;
}
.chat-body {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(161, 102, 255, 0.2), transparent 24%),
    radial-gradient(circle at right center, rgba(77, 208, 225, 0.12), transparent 20%),
    linear-gradient(180deg, #120d1f 0%, #090710 100%);
}

.chat-stage-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
  padding: 20px 20px 0;
  overflow: auto;
}

.chat-stage-header {
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.chat-stage-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.chat-stage-kicker {
  color: rgba(216, 197, 255, 0.82);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chat-stage-title {
  color: #f8f5ff;
  font-size: clamp(24px, 2vw, 34px);
  font-weight: 800;
  line-height: 1.15;
}

.chat-stage-description {
  max-width: 780px;
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  line-height: 1.6;
}

.chat-stage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.chat-stage-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(18, 14, 31, 0.86);
  color: #f5efff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.chat-stage {
  width: 100%;
  display: grid;
  gap: clamp(14px, 2vw, 24px);
  align-items: start;
  justify-content: center;
  margin: 0 auto;
}

.video-item {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.video-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 28px;
  background:
    radial-gradient(circle at top, rgba(151, 92, 255, 0.24), transparent 40%),
    linear-gradient(180deg, #26193f 0%, #140f22 100%);
  box-shadow:
    0 24px 50px rgba(0, 0, 0, 0.34),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.video-item-local .video-stage {
  box-shadow:
    0 30px 65px rgba(0, 0, 0, 0.38),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.video-item-remote .video-stage {
  background:
    radial-gradient(circle at top, rgba(90, 207, 225, 0.16), transparent 40%),
    linear-gradient(180deg, #1f1a34 0%, #130f22 100%);
}

#my-video {
  isolation: isolate;
}

#my-video canvas[id^="avatarCanvas"],
.my-real-video {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  display: block;
  object-fit: cover;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.my-real-video {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
  -moz-transform: rotateY(180deg);
  background: #120f1b;
}

.video-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 6px;
}

.video-card-status {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(245, 236, 255, 0.92);
  color: #7442d8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.video-item-remote .video-card-status {
  background: rgba(255, 255, 255, 0.14);
  color: rgba(245, 239, 255, 0.96);
}

.nickName {
  margin: 0;
  color: #f7f4ff;
  font-size: 16px;
  font-weight: 700;
  text-align: right;
}

.tracking-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(8, 10, 23, 0.78);
  box-shadow: 0px 14px 32px rgba(0, 0, 0, 0.28);
}
.tracking-preview-shell {
  width: clamp(220px, 24vw, 300px);
}
.tracking-preview-solo {
  width: clamp(260px, 28vw, 360px);
}
.tracking-preview-hidden {
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}
.tracking-gpu-canvas-hidden {
  position: absolute;
  inset: 0;
  width: 1px !important;
  height: 1px !important;
  opacity: 0;
  pointer-events: none;
}
.tracking-preview-debug {
  display: block;
}
.tracking-preview video,
.tracking-preview canvas {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}
.tracking-preview-active video {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg); /* Safari and Chrome */
  -moz-transform: rotateY(180deg); /* Firefox */
}
.tracking-preview-active canvas {
  border: 0;
  transform: none;
  -webkit-transform: none;
  -moz-transform: none;
}
.tracking-preview-label {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(11, 13, 29, 0.72);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  border: 0;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.chat-monitor-panel {
  width: 100%;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px 18px;
  border-radius: 28px;
  background: rgba(16, 12, 28, 0.82);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.22),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.chat-monitor-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.chat-monitor-kicker {
  color: rgba(213, 194, 255, 0.78);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chat-monitor-title {
  color: #f8f5ff;
  font-size: 18px;
  font-weight: 700;
}

.chat-monitor-description {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  line-height: 1.6;
}

.chat-monitor-stage {
  display: flex;
  align-items: flex-start;
}

.motion-status {
  margin-top: 10px;
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

@media screen and (max-width: 1120px) {
  .chat-stage-shell {
    padding: 16px 16px 0;
    gap: 14px;
  }

  .chat-stage-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .chat-stage-meta {
    justify-content: flex-start;
  }

  .chat-monitor-panel {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .chat-monitor-stage {
    width: 100%;
  }

  .tracking-preview-shell {
    width: min(100%, 320px);
  }
}

@media screen and (max-width: 760px) {
  .chat-stage-shell {
    padding: 12px 12px 0;
    gap: 12px;
  }

  .chat-stage-title {
    font-size: 22px;
  }

  .chat-stage-description {
    font-size: 13px;
  }

  .chat-stage {
    gap: 12px;
  }

  .video-stage {
    border-radius: 22px;
  }

  .video-card-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .nickName {
    text-align: left;
  }

  .chat-monitor-panel {
    padding: 14px;
    border-radius: 22px;
  }

  .chat-monitor-title {
    font-size: 16px;
  }

  .chat-monitor-description {
    font-size: 13px;
  }
}
</style>
