<template>
  <HeartRain v-if="chat.heartRainFlag" />
  <div class="chat-body" id="main-container">
    <div id="session">
      <div class="chat-stage-shell">
        <div class="chat-stage-header" :style="{ maxWidth: stageMaxWidth }">
          <div class="chat-stage-copy">
            <div class="chat-stage-kicker">{{ stageKicker }}</div>
            <div class="chat-stage-title">{{ stageTitle }}</div>
            <p class="chat-stage-description">{{ stageDescription }}</p>
          </div>
          <div class="chat-stage-meta">
            <div class="chat-stage-pill">{{ stageSummaryText }}</div>
            <div class="chat-stage-pill">{{ stageModeText }}</div>
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

      </div>
      <div
        v-show="showMonitorPanel"
        ref="floatingMonitor"
        class="chat-floating-monitor"
        :class="{ 'is-dragging': Boolean(floatingMonitorDragState) }"
        :style="floatingMonitorStyle"
      >
        <div
          class="chat-floating-monitor-head"
          @pointerdown="startFloatingMonitorDrag"
        >
          <div class="chat-floating-monitor-title">내 카메라</div>
          <div class="chat-floating-monitor-subtitle">
            {{ floatingMonitorText }}
          </div>
        </div>

        <div
          class="tracking-preview-shell tracking-preview-debug chat-floating-monitor-stage"
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
  updated() {
    this.syncFloatingMonitorPosition();
  },
  computed: {
    motionStatusText() {
      if (!this.chat.motionCheck) {
        return "모션 인식 꺼짐";
      }

      if (this.chat.motionFaceCount > 0 || this.chat.motionPoseCount > 0) {
        return `얼굴 ${this.chat.motionFaceCount} · 자세 ${this.chat.motionPoseCount}`;
      }

      return "대상을 인식하는 중";
    },
    participantCount() {
      return this.remoteParticipants.length + 1;
    },
    stageLayout() {
      if (this.participantCount === 1) {
        return {
          maxWidth:
            "min(1320px, calc(100vw - 56px), calc((100dvh - var(--chat-sub-size) - 130px) * 4 / 3))",
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
      return "채팅";
    },
    stageTitle() {
      if (this.chat.loading === 1) {
        return "입장 준비 중";
      }

      if (this.participantCount === 1) {
        return this.chat.soloMode
          ? "테스트 세션"
          : "상대 연결 대기 중";
      }

      return "영상 채팅 진행 중";
    },
    stageDescription() {
      if (this.chat.loading === 1) {
        return "카메라와 아바타를 초기화하고 있습니다.";
      }

      if (this.participantCount === 1) {
        return this.chat.soloMode
          ? "카메라 입력과 아바타 움직임을 확인할 수 있습니다."
          : "상대가 입장하면 화면이 자동으로 정렬됩니다.";
      }

      return `${this.participantCount}명이 연결되어 있으며, 모든 화면은 4:3 비율을 유지합니다.`;
    },
    stageModeText() {
      return this.chat.motionCheck ? "모션 인식 켜짐" : "모션 인식 꺼짐";
    },
    stageSummaryText() {
      if (this.chat.soloMode) {
        return "테스트";
      }

      if (this.remoteParticipants.length === 0) {
        return "연결 대기 중";
      }

      return `${this.participantCount}명 연결`;
    },
    showMonitorPanel() {
      return this.chat.loading === 1 || Boolean(this.chat.camera);
    },
    floatingMonitorText() {
      if (this.chat.loading === 1) {
        return "카메라 준비 중";
      }

      return this.chat.motionCheck ? "실시간 입력 확인" : "미리보기";
    },
    floatingMonitorStyle() {
      if (
        this.floatingMonitorPosition.x == null ||
        this.floatingMonitorPosition.y == null
      ) {
        return null;
      }

      return {
        transform: `translate(${this.floatingMonitorPosition.x}px, ${this.floatingMonitorPosition.y}px)`,
      };
    },
    trackingPreviewLabel() {
      const forcedDelegate =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ukm-motion-delegate")
          : null;
      const activeDelegate = this.chat.holisticDelegate || "CPU";
      const delegateStatus = this.chat.holisticDelegateStatus;

      if (activeDelegate === "GPU") {
        return "처리 모드: GPU";
      }

      if (forcedDelegate === "GPU") {
        if (delegateStatus === "gpu-precheck-failed") {
          return "처리 모드: 호환";
        }

        if (delegateStatus === "gpu-init-failed") {
          return "처리 모드: 호환";
        }

        if (delegateStatus === "gpu-tracking-fallback") {
          return "처리 모드: 호환";
        }

        return "처리 모드: 호환";
      }

      if (forcedDelegate === "CPU") {
        return "처리 모드: CPU";
      }

      return "처리 모드: 자동";
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
      floatingMonitorPosition: { x: null, y: null },
      floatingMonitorDragState: null,
      floatingMonitorResizeHandler: null,
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
    this.floatingMonitorResizeHandler = () => {
      this.syncFloatingMonitorPosition();
    };
    window.addEventListener("resize", this.floatingMonitorResizeHandler);
    this.joinSession();
    this.chat.systemMessagePrint(
      "상대를 배려하며 대화를 시작해 주세요."
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
    if (this.floatingMonitorResizeHandler) {
      window.removeEventListener("resize", this.floatingMonitorResizeHandler);
    }
    window.removeEventListener("pointermove", this.onFloatingMonitorDrag);
    window.removeEventListener("pointerup", this.stopFloatingMonitorDrag);
    window.removeEventListener("pointercancel", this.stopFloatingMonitorDrag);
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
        this.chat.setLoadingState(0, "사용자 정보를 확인하고 있습니다.");
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
        this.chat.setLoadingState(5, "아바타 장면을 준비하고 있습니다.");
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
            this.chat.setLoadingState(90, "연결을 마무리하고 있습니다.");
            setTimeout(() => {
              if (this.chat.soloMode) {
                this.chat.setLoadingState(100, "테스트 세션 준비 완료");
                this.chat.loading = 0;
                this.chat.systemMessagePrint("테스트 세션으로 입장했습니다.");
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
        this.chat.setLoadingState(0, "모션 인식을 시작하지 못했습니다.");
        this.chat.loading = 0;
      }
    },

    async startLiveKit(avatarVideo) {
      console.log("5. LiveKit 시작");

      try {
        this.chat.setLoadingState(92, "채팅 세션에 연결하고 있습니다.");
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

        this.chat.setLoadingState(97, "아바타 화면을 전송하고 있습니다.");
        await this.chat.switchPublishedVideoTrack(avatarVideo, {
          stopPrevious: false,
          trackName: "avatar-camera",
        });

        this.syncRemoteParticipants();
        this.chat.setLoadingState(100, "입장이 완료되었습니다.");
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
    getFloatingMonitorBounds() {
      const session = document.getElementById("session");
      const floatingMonitor = this.$refs.floatingMonitor;

      if (!session || !floatingMonitor) {
        return null;
      }

      const panelWidth = floatingMonitor.offsetWidth;
      const panelHeight = floatingMonitor.offsetHeight;
      const inset = window.innerWidth <= 760 ? 12 : 16;
      const maxX = Math.max(inset, session.clientWidth - panelWidth - inset);
      const maxY = Math.max(inset, session.clientHeight - panelHeight - inset);

      return {
        maxX,
        maxY,
        inset,
      };
    },
    clampFloatingMonitorPosition(nextX, nextY) {
      const bounds = this.getFloatingMonitorBounds();
      if (!bounds) {
        return null;
      }

      return {
        x: Math.min(Math.max(nextX, bounds.inset), bounds.maxX),
        y: Math.min(Math.max(nextY, bounds.inset), bounds.maxY),
      };
    },
    syncFloatingMonitorPosition() {
      if (!this.showMonitorPanel) {
        return;
      }

      const bounds = this.getFloatingMonitorBounds();
      if (!bounds) {
        return;
      }

      const hasExistingPosition =
        this.floatingMonitorPosition.x != null &&
        this.floatingMonitorPosition.y != null;
      const fallbackY = window.innerWidth <= 1120 ? bounds.inset + 8 : 24;
      const nextPosition = hasExistingPosition
        ? this.clampFloatingMonitorPosition(
            this.floatingMonitorPosition.x,
            this.floatingMonitorPosition.y
          )
        : this.clampFloatingMonitorPosition(bounds.maxX, fallbackY);

      if (
        !nextPosition ||
        (this.floatingMonitorPosition.x === nextPosition.x &&
          this.floatingMonitorPosition.y === nextPosition.y)
      ) {
        return;
      }

      this.floatingMonitorPosition = nextPosition;
    },
    startFloatingMonitorDrag(event) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const floatingMonitor = this.$refs.floatingMonitor;
      if (!floatingMonitor) {
        return;
      }

      this.syncFloatingMonitorPosition();
      this.floatingMonitorDragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        baseX: this.floatingMonitorPosition.x || 0,
        baseY: this.floatingMonitorPosition.y || 0,
      };

      floatingMonitor.setPointerCapture?.(event.pointerId);
      window.addEventListener("pointermove", this.onFloatingMonitorDrag);
      window.addEventListener("pointerup", this.stopFloatingMonitorDrag);
      window.addEventListener("pointercancel", this.stopFloatingMonitorDrag);
    },
    onFloatingMonitorDrag(event) {
      const dragState = this.floatingMonitorDragState;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const nextPosition = this.clampFloatingMonitorPosition(
        dragState.baseX + (event.clientX - dragState.startX),
        dragState.baseY + (event.clientY - dragState.startY)
      );

      if (!nextPosition) {
        return;
      }

      this.floatingMonitorPosition = nextPosition;
    },
    stopFloatingMonitorDrag(event) {
      if (
        this.floatingMonitorDragState &&
        event?.pointerId != null &&
        this.floatingMonitorDragState.pointerId !== event.pointerId
      ) {
        return;
      }

      this.floatingMonitorDragState = null;
      window.removeEventListener("pointermove", this.onFloatingMonitorDrag);
      window.removeEventListener("pointerup", this.stopFloatingMonitorDrag);
      window.removeEventListener("pointercancel", this.stopFloatingMonitorDrag);
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
    radial-gradient(circle at top left, rgba(255, 211, 231, 0.7), transparent 24%),
    radial-gradient(circle at right top, rgba(198, 228, 255, 0.68), transparent 24%),
    linear-gradient(180deg, #fbf7ff 0%, #f2f7ff 48%, #ffffff 100%);
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

.chat-stage-shell,
.chat-stage-header,
.chat-stage {
  position: relative;
  z-index: 1;
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
  color: #7a639d;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chat-stage-title {
  color: #30214f;
  font-size: clamp(24px, 2vw, 34px);
  font-weight: 800;
  line-height: 1.15;
}

.chat-stage-description {
  max-width: 780px;
  margin: 0;
  color: #62557d;
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
  background: rgba(255, 255, 255, 0.9);
  color: #4a3e67;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow:
    0 12px 24px rgba(106, 109, 141, 0.12),
    inset 0 0 0 1px rgba(111, 96, 145, 0.1);
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
    radial-gradient(circle at top, rgba(200, 184, 255, 0.35), transparent 42%),
    linear-gradient(180deg, #ffffff 0%, #eef3ff 100%);
  box-shadow:
    0 22px 44px rgba(123, 132, 165, 0.18),
    inset 0 0 0 1px rgba(140, 150, 186, 0.16);
}

.video-item-local .video-stage {
  box-shadow:
    0 28px 54px rgba(108, 116, 154, 0.18),
    inset 0 0 0 1px rgba(140, 150, 186, 0.16);
}

.video-item-remote .video-stage {
  background:
    radial-gradient(circle at top, rgba(163, 223, 242, 0.34), transparent 40%),
    linear-gradient(180deg, #ffffff 0%, #edf6ff 100%);
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
  background: #edf2f7;
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
  background: rgba(255, 255, 255, 0.92);
  color: #554471;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  box-shadow: inset 0 0 0 1px rgba(111, 96, 145, 0.1);
}

.video-item-remote .video-card-status {
  background: rgba(238, 246, 255, 0.95);
  color: #476178;
}

.nickName {
  margin: 0;
  color: #2f2743;
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
  background: linear-gradient(180deg, #f6f8fd 0%, #e8edf7 100%);
  box-shadow: 0 16px 32px rgba(123, 132, 165, 0.18);
}
.tracking-preview-shell {
  width: 100%;
}
.tracking-preview-solo {
  width: 100%;
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
  background: rgba(255, 255, 255, 0.88);
  color: #3f3558;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  border: 0;
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 18px rgba(111, 96, 145, 0.16);
}

.chat-floating-monitor {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 4;
  width: clamp(240px, 22vw, 320px);
  max-width: calc(100vw - 24px);
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 22px 44px rgba(123, 132, 165, 0.22),
    inset 0 0 0 1px rgba(140, 150, 186, 0.18);
  backdrop-filter: blur(16px);
  will-change: transform;
}

.chat-floating-monitor-head {
  display: grid;
  gap: 4px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.chat-floating-monitor.is-dragging .chat-floating-monitor-head {
  cursor: grabbing;
}

.chat-floating-monitor-title {
  color: #2f2743;
  font-size: 15px;
  font-weight: 800;
}

.chat-floating-monitor-subtitle {
  color: #6a5d86;
  font-size: 12px;
  font-weight: 600;
}

.chat-floating-monitor-stage {
  width: 100%;
}

.motion-status {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(246, 249, 255, 0.96);
  color: #4c4166;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  box-shadow: inset 0 0 0 1px rgba(140, 150, 186, 0.14);
}
.motion-status.active {
  background: rgba(231, 243, 255, 0.98);
  color: #215b84;
}

@media screen and (min-width: 1181px) {
  .chat-stage-shell {
    padding-right: clamp(296px, 25vw, 372px);
  }
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

  .chat-floating-monitor {
    width: min(280px, calc(100vw - 32px));
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

  .chat-floating-monitor {
    width: min(230px, calc(100vw - 24px));
    padding: 12px;
    border-radius: 20px;
  }
}
</style>
