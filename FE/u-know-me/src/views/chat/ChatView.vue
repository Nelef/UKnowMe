<template>
  <HeartRain v-if="chat.heartRainFlag" />
  <div class="chat-body" id="main-container">
    <div id="session" ref="session">
      <div ref="stageShell" class="chat-stage-shell">
        <div ref="stageGrid" class="chat-stage" :style="stageGridStyle">
          <div class="video-item video-item-local">
            <div ref="localVideoStage" class="video-stage" id="my-video">
              <video
                class="my-real-video"
                autoplay
                muted
                playsinline
                style="display: none"
              ></video>
              <video
                id="test-video"
                class="capture-monitor-video"
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
        :class="{
          'is-dragging': Boolean(floatingMonitorDragState),
          'is-resizing': Boolean(floatingMonitorResizeState),
        }"
        :style="floatingMonitorStyle"
        @pointerdown="startFloatingMonitorDrag"
      >
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
          </div>
        </div>
        <button
          type="button"
          class="chat-floating-monitor-resize"
          aria-label="플로팅 패널 크기 조절"
          @pointerdown.stop.prevent="startFloatingMonitorResize"
        ></button>
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

const isIOSSafariBrowser = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  const isAppleTouchDevice =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (!isAppleTouchDevice) {
    return false;
  }

  return (
    /Safari/i.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo|GSA/i.test(userAgent)
  );
};

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
    participantCount() {
      return this.remoteParticipants.length + 1;
    },
    stageLayout() {
      const layoutMetrics = this.getStageViewportMetrics();
      const participantCount = this.participantCount + this.layoutRevision * 0;
      const maxColumns = Math.min(4, participantCount);
      let bestLayout = null;

      for (let columns = 1; columns <= maxColumns; columns += 1) {
        const rows = Math.ceil(participantCount / columns);
        const widthBudget =
          layoutMetrics.availableWidth - layoutMetrics.gridGap * (columns - 1);
        const heightBudget =
          layoutMetrics.availableHeight - layoutMetrics.gridGap * (rows - 1);

        if (widthBudget <= 0 || heightBudget <= 0) {
          continue;
        }

        const maxCardWidthByWidth = widthBudget / columns;
        const maxVideoHeightByHeight =
          heightBudget / rows - layoutMetrics.cardChromeHeight;

        if (maxVideoHeightByHeight <= 0) {
          continue;
        }

        const cardWidth = Math.floor(
          Math.min(maxCardWidthByWidth, (maxVideoHeightByHeight * 4) / 3)
        );

        if (cardWidth <= 0) {
          continue;
        }

        const gridWidth = Math.floor(
          columns * cardWidth + layoutMetrics.gridGap * (columns - 1)
        );
        const gridHeight = Math.floor(
          rows * (cardWidth * 0.75 + layoutMetrics.cardChromeHeight) +
            layoutMetrics.gridGap * (rows - 1)
        );

        if (
          gridWidth > layoutMetrics.availableWidth + 1 ||
          gridHeight > layoutMetrics.availableHeight + 1
        ) {
          continue;
        }

        if (
          !bestLayout ||
          cardWidth > bestLayout.cardWidth ||
          (cardWidth === bestLayout.cardWidth && columns < bestLayout.columns)
        ) {
          bestLayout = {
            columns,
            rows,
            cardWidth,
            gridWidth,
            gridHeight,
          };
        }
      }

      if (bestLayout) {
        return bestLayout;
      }

      const fallbackColumns = maxColumns;
      const fallbackRows = Math.ceil(participantCount / fallbackColumns);
      const fallbackWidthByWidth = Math.floor(
        (layoutMetrics.availableWidth -
          layoutMetrics.gridGap * (fallbackColumns - 1)) /
          fallbackColumns
      );
      const fallbackWidthByHeight = Math.floor(
        (((layoutMetrics.availableHeight -
          layoutMetrics.gridGap * (fallbackRows - 1)) /
          fallbackRows -
          layoutMetrics.cardChromeHeight) *
          4) /
          3
      );
      const fallbackWidth = Math.max(
        80,
        Math.min(fallbackWidthByWidth, fallbackWidthByHeight)
      );

      return {
        columns: fallbackColumns,
        rows: fallbackRows,
        cardWidth: fallbackWidth,
        gridWidth: Math.floor(
          fallbackColumns * fallbackWidth +
            layoutMetrics.gridGap * (fallbackColumns - 1)
        ),
        gridHeight: Math.floor(
          fallbackRows * (fallbackWidth * 0.75 + layoutMetrics.cardChromeHeight) +
            layoutMetrics.gridGap * (fallbackRows - 1)
        ),
      };
    },
    stageMaxWidth() {
      return `${this.stageLayout.gridWidth}px`;
    },
    stageGridStyle() {
      return {
        width: this.stageMaxWidth,
        maxWidth: "100%",
        gridTemplateColumns: `repeat(${this.stageLayout.columns}, minmax(0, 1fr))`,
      };
    },
    showMonitorPanel() {
      return this.chat.loading === 1 || Boolean(this.chat.camera);
    },
    floatingMonitorStyle() {
      const style = {};
      const visualMetrics = this.getFloatingMonitorVisualMetrics(
        this.floatingMonitorSize.width
      );

      if (
        this.floatingMonitorPosition.x != null &&
        this.floatingMonitorPosition.y != null
      ) {
        style.transform = `translate(${this.floatingMonitorPosition.x}px, ${this.floatingMonitorPosition.y}px)`;
      }

      if (this.floatingMonitorSize.width != null) {
        style.width = `${this.floatingMonitorSize.width}px`;
      }

      if (visualMetrics) {
        style["--floating-monitor-padding"] = `${visualMetrics.padding}px`;
        style["--floating-monitor-radius"] = `${visualMetrics.radius}px`;
        style["--floating-monitor-border-width"] = `${visualMetrics.borderWidth}px`;
        style["--floating-monitor-shadow-y"] = `${visualMetrics.shadowYOffset}px`;
        style["--floating-monitor-shadow-blur"] = `${visualMetrics.shadowBlur}px`;
        style["--floating-monitor-stage-radius"] = `${visualMetrics.stageRadius}px`;
        style["--floating-monitor-handle-size"] = `${visualMetrics.handleSize}px`;
        style["--floating-monitor-handle-offset"] = `${visualMetrics.handleOffset}px`;
        style["--floating-monitor-handle-radius"] = `${visualMetrics.handleRadius}px`;
        style["--floating-monitor-handle-line-width"] = `${visualMetrics.handleLineWidth}px`;
      }

      return Object.keys(style).length > 0 ? style : null;
    },
  },

  data() {
    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : 1280;
    const viewportHeight =
      typeof window !== "undefined" ? window.innerHeight : 720;

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
      floatingMonitorSize: { width: null },
      floatingMonitorDragState: null,
      floatingMonitorResizeState: null,
      floatingMonitorResizeHandler: null,
      layoutObserver: null,
      layoutRevision: 0,
      layoutViewport: {
        width: viewportWidth,
        height: viewportHeight,
      },
      joinSessionStarted: false,
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
      this.layoutViewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      this.layoutRevision += 1;
      this.syncFloatingMonitorPosition();
    };
    window.addEventListener("resize", this.floatingMonitorResizeHandler);
    nextTick(() => {
      if (typeof window !== "undefined" && "ResizeObserver" in window) {
        this.layoutObserver = new window.ResizeObserver(() => {
          this.layoutRevision += 1;
          this.syncFloatingMonitorPosition();
        });

        [this.$refs.session, this.$refs.stageShell, this.$refs.stageHeader]
          .filter(Boolean)
          .forEach((target) => {
            this.layoutObserver.observe(target);
          });
      }

      this.layoutRevision += 1;
      this.syncFloatingMonitorPosition();
    });
    if (isIOSSafariBrowser()) {
      this.chat.logDebug("joinSession:iosSafariAutoStart", {
        route: this.$route.fullPath,
      });
    }
    this.beginSessionStartup();
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
    if (this.layoutObserver) {
      this.layoutObserver.disconnect();
      this.layoutObserver = null;
    }
    window.removeEventListener("pointermove", this.onFloatingMonitorDrag);
    window.removeEventListener("pointerup", this.stopFloatingMonitorDrag);
    window.removeEventListener("pointercancel", this.stopFloatingMonitorDrag);
    window.removeEventListener("pointermove", this.onFloatingMonitorResize);
    window.removeEventListener("pointerup", this.stopFloatingMonitorResize);
    window.removeEventListener(
      "pointercancel",
      this.stopFloatingMonitorResize
    );
  },
  beforeRouteLeave(to, from, next) {
    this.chat.leaveSession({ navigate: false }).finally(() => next());
  },
  methods: {
    beginSessionStartup() {
      if (this.joinSessionStarted) {
        return;
      }

      this.joinSessionStarted = true;
      this.joinSession();
    },
    getStageViewportMetrics() {
      const shell = this.$refs.stageShell;
      const header = this.$refs.stageHeader;
      const stage = this.$refs.stageGrid;
      const viewportWidth = this.layoutViewport.width || window.innerWidth;
      const viewportHeight = this.layoutViewport.height || window.innerHeight;
      const fallbackPadding = viewportWidth <= 760 ? 24 : viewportWidth <= 1120 ? 32 : 40;
      const fallbackGap = viewportWidth <= 760 ? 12 : viewportWidth <= 1120 ? 14 : 18;
      const shellStyles = shell ? window.getComputedStyle(shell) : null;
      const shellPaddingX = shellStyles
        ? parseFloat(shellStyles.paddingLeft) + parseFloat(shellStyles.paddingRight)
        : fallbackPadding;
      const shellPaddingY = shellStyles
        ? parseFloat(shellStyles.paddingTop) + parseFloat(shellStyles.paddingBottom)
        : fallbackPadding / 2;
      const shellGap = shellStyles ? parseFloat(shellStyles.gap) || fallbackGap : fallbackGap;
      const stageGap = stage
        ? parseFloat(window.getComputedStyle(stage).gap) || fallbackGap
        : fallbackGap;
      const headerHeight = header ? header.offsetHeight : 0;
      const headerGap = header ? shellGap : 0;
      const footerHeight = 32;
      const cardChromeHeight = footerHeight + 12;
      const availableWidth = Math.max(
        220,
        (shell?.clientWidth || viewportWidth) - shellPaddingX
      );
      const availableHeight = Math.max(
        180,
        (shell?.clientHeight || viewportHeight) -
          shellPaddingY -
          headerHeight -
          headerGap
      );

      return {
        availableWidth,
        availableHeight,
        gridGap: stageGap,
        cardChromeHeight,
      };
    },
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
        this.joinSessionStarted = false;
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
    getFloatingMonitorArea() {
      const session = this.$refs.session;
      const localVideoStage = this.$refs.localVideoStage;

      if (!session || !localVideoStage) {
        return null;
      }

      const sessionRect = session.getBoundingClientRect();
      const stageRect = localVideoStage.getBoundingClientRect();
      const inset = Math.max(8, Math.min(16, stageRect.width * 0.02));

      return {
        left: Math.max(0, stageRect.left - sessionRect.left),
        top: Math.max(0, stageRect.top - sessionRect.top),
        width: stageRect.width,
        height: stageRect.height,
        inset,
      };
    },
    getFloatingMonitorVisualMetrics(panelWidth = null) {
      const area = this.getFloatingMonitorArea();
      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
      const areaWidth =
        area?.width || (typeof window !== "undefined" ? window.innerWidth * 0.6 : 720);
      const minWidth = areaWidth / 5;
      const maxWidth = areaWidth / 3;
      const fallbackWidth = Math.min(
        maxWidth,
        Math.max(minWidth, areaWidth * 0.28)
      );
      const resolvedWidth =
        panelWidth != null
          ? panelWidth
          : this.floatingMonitorSize.width != null
            ? this.floatingMonitorSize.width
            : fallbackWidth;
      const padding = clamp(resolvedWidth * 0.045, 5, 14);
      const radius = clamp(resolvedWidth * 0.09, 12, 26);
      const borderWidth = clamp(resolvedWidth * 0.006, 0.8, 2.2);
      const shadowYOffset = clamp(resolvedWidth * 0.05, 8, 22);
      const shadowBlur = clamp(resolvedWidth * 0.1, 16, 44);
      const stageRadius = Math.max(10, radius - padding * 0.25);
      const handleSize = clamp(resolvedWidth * 0.11, 16, 32);
      const handleOffset = clamp(resolvedWidth * 0.02, 4, 10);
      const handleRadius = clamp(handleSize * 0.35, 6, 12);
      const handleLineWidth = clamp(resolvedWidth * 0.01, 1.2, 3.2);

      return {
        minWidth,
        maxWidth,
        resolvedWidth,
        padding,
        paddingX: padding * 2,
        paddingY: padding * 2,
        radius,
        borderWidth,
        shadowYOffset,
        shadowBlur,
        stageRadius,
        handleSize,
        handleOffset,
        handleRadius,
        handleLineWidth,
      };
    },
    getFloatingMonitorFrame(nextWidth = null) {
      const floatingMonitor = this.$refs.floatingMonitor;
      const visualMetrics = this.getFloatingMonitorVisualMetrics(nextWidth);

      if (!floatingMonitor || !visualMetrics) {
        return null;
      }

      const panelWidth = visualMetrics.resolvedWidth;
      const previewWidth = Math.max(panelWidth - visualMetrics.paddingX, 0);

      return {
        panelWidth,
        panelHeight: previewWidth * 0.75 + visualMetrics.paddingY,
        ...visualMetrics,
      };
    },
    getFloatingMonitorBounds(size = {}) {
      const area = this.getFloatingMonitorArea();
      const frame = this.getFloatingMonitorFrame(size.width);

      if (!area || !frame) {
        return null;
      }

      const minX = area.left + area.inset;
      const minY = area.top + area.inset;
      const maxX = Math.max(
        minX,
        area.left + area.width - frame.panelWidth - area.inset
      );
      const maxY = Math.max(
        minY,
        area.top + area.height - frame.panelHeight - area.inset
      );

      return {
        minX,
        minY,
        maxX,
        maxY,
      };
    },
    getFloatingMonitorWidthBounds(position = this.floatingMonitorPosition) {
      const area = this.getFloatingMonitorArea();
      const frame = this.getFloatingMonitorFrame();

      if (!area || !frame) {
        return null;
      }

      const resolvedPosition = {
        x: position?.x != null ? position.x : area.left + area.inset,
        y: position?.y != null ? position.y : area.top + area.inset,
      };
      const minWidth = area.width / 5;
      const maxWidthTarget = area.width / 3;
      const availableWidth =
        area.left + area.width - area.inset - resolvedPosition.x;
      const availableHeight =
        area.top + area.height - area.inset - resolvedPosition.y;
      const maxWidthByHeight =
        ((Math.max(availableHeight - frame.paddingY, 0) * 4) / 3) + frame.paddingX;
      const maxWidth = Math.max(
        0,
        Math.min(maxWidthTarget, availableWidth, maxWidthByHeight)
      );

      return {
        minWidth: Math.min(minWidth, maxWidth),
        maxWidth,
      };
    },
    clampFloatingMonitorWidth(nextWidth, position = this.floatingMonitorPosition) {
      const bounds = this.getFloatingMonitorWidthBounds(position);
      if (!bounds) {
        return nextWidth;
      }

      return Math.min(Math.max(nextWidth, bounds.minWidth), bounds.maxWidth);
    },
    clampFloatingMonitorPosition(nextX, nextY, size = {}) {
      const bounds = this.getFloatingMonitorBounds(size);
      if (!bounds) {
        return null;
      }

      return {
        x: Math.min(Math.max(nextX, bounds.minX), bounds.maxX),
        y: Math.min(Math.max(nextY, bounds.minY), bounds.maxY),
      };
    },
    syncFloatingMonitorPosition() {
      if (!this.showMonitorPanel) {
        return;
      }

      const floatingMonitor = this.$refs.floatingMonitor;
      const area = this.getFloatingMonitorArea();
      if (!floatingMonitor || !area) {
        return;
      }

      const currentWidth =
        this.floatingMonitorSize.width ||
        this.getFloatingMonitorVisualMetrics().resolvedWidth ||
        floatingMonitor.offsetWidth ||
        area.width / 3;
      const hasExistingPosition =
        this.floatingMonitorPosition.x != null &&
        this.floatingMonitorPosition.y != null;
      const provisionalPosition = hasExistingPosition
        ? this.clampFloatingMonitorPosition(
            this.floatingMonitorPosition.x,
            this.floatingMonitorPosition.y,
            { width: currentWidth }
          )
        : null;
      const nextWidth = this.clampFloatingMonitorWidth(
        currentWidth,
        provisionalPosition || this.floatingMonitorPosition
      );
      const bounds = this.getFloatingMonitorBounds({ width: nextWidth });
      if (!bounds) {
        return;
      }

      const nextPosition = hasExistingPosition
        ? this.clampFloatingMonitorPosition(
            this.floatingMonitorPosition.x,
            this.floatingMonitorPosition.y,
            { width: nextWidth }
          )
        : this.clampFloatingMonitorPosition(bounds.maxX, bounds.maxY, {
            width: nextWidth,
          });

      if (this.floatingMonitorSize.width !== nextWidth) {
        this.floatingMonitorSize.width = nextWidth;
      }

      if (
        nextPosition &&
        (this.floatingMonitorPosition.x !== nextPosition.x ||
          this.floatingMonitorPosition.y !== nextPosition.y)
      ) {
        this.floatingMonitorPosition = nextPosition;
      }
    },
    startFloatingMonitorDrag(event) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (this.floatingMonitorResizeState) {
        return;
      }

      const floatingMonitor = this.$refs.floatingMonitor;
      if (!floatingMonitor) {
        return;
      }

      event.preventDefault();
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
    startFloatingMonitorResize(event) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const floatingMonitor = this.$refs.floatingMonitor;
      const frame = this.getFloatingMonitorFrame();
      if (!floatingMonitor || !frame) {
        return;
      }

      event.preventDefault();
      this.syncFloatingMonitorPosition();
      this.floatingMonitorResizeState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        baseWidth: this.floatingMonitorSize.width || frame.panelWidth,
        panelAspectRatio:
          frame.panelWidth > 0 ? frame.panelHeight / frame.panelWidth : 1,
        basePosition: {
          x: this.floatingMonitorPosition.x || 0,
          y: this.floatingMonitorPosition.y || 0,
        },
      };

      floatingMonitor.setPointerCapture?.(event.pointerId);
      window.addEventListener("pointermove", this.onFloatingMonitorResize);
      window.addEventListener("pointerup", this.stopFloatingMonitorResize);
      window.addEventListener("pointercancel", this.stopFloatingMonitorResize);
    },
    onFloatingMonitorResize(event) {
      const resizeState = this.floatingMonitorResizeState;
      if (!resizeState || resizeState.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - resizeState.startX;
      const deltaY = event.clientY - resizeState.startY;
      const deltaWidth =
        (deltaX + deltaY * resizeState.panelAspectRatio) /
        (1 + resizeState.panelAspectRatio * resizeState.panelAspectRatio);
      const nextWidth = this.clampFloatingMonitorWidth(
        resizeState.baseWidth + deltaWidth,
        resizeState.basePosition
      );
      const nextPosition = this.clampFloatingMonitorPosition(
        resizeState.basePosition.x,
        resizeState.basePosition.y,
        { width: nextWidth }
      );

      this.floatingMonitorSize.width = nextWidth;
      if (nextPosition) {
        this.floatingMonitorPosition = nextPosition;
      }
    },
    stopFloatingMonitorResize(event) {
      if (
        this.floatingMonitorResizeState &&
        event?.pointerId != null &&
        this.floatingMonitorResizeState.pointerId !== event.pointerId
      ) {
        return;
      }

      this.floatingMonitorResizeState = null;
      window.removeEventListener("pointermove", this.onFloatingMonitorResize);
      window.removeEventListener("pointerup", this.stopFloatingMonitorResize);
      window.removeEventListener(
        "pointercancel",
        this.stopFloatingMonitorResize
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

#session {
  isolation: isolate;
  overflow: hidden;
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
  overflow: hidden;
}

.chat-stage-shell,
.chat-stage {
  position: relative;
  z-index: 1;
}

.chat-stage {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: grid;
  gap: clamp(14px, 2vw, 24px);
  align-items: start;
  align-content: center;
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

.avatar-capture-canvas {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 1px !important;
  height: 1px !important;
  display: block;
  opacity: 0.001;
  pointer-events: none;
  border: 0 !important;
  transform: translateZ(0);
}

.capture-monitor-video {
  position: fixed;
  right: 0;
  bottom: 0;
  width: 1px !important;
  height: 1px !important;
  display: block;
  opacity: 0.001;
  pointer-events: none;
  border: 0 !important;
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
  justify-content: flex-end;
  min-height: 0;
  padding: 0 6px;
  flex-shrink: 0;
}

.nickName {
  margin: 0;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.chat-floating-monitor {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  width: 240px;
  max-width: 100%;
  padding: var(--floating-monitor-padding, 10px);
  border-radius: var(--floating-monitor-radius, 20px);
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 var(--floating-monitor-shadow-y, 14px)
      var(--floating-monitor-shadow-blur, 28px) rgba(123, 132, 165, 0.22),
    inset 0 0 0 var(--floating-monitor-border-width, 1px)
      rgba(140, 150, 186, 0.18);
  backdrop-filter: blur(16px);
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  will-change: transform;
}

.chat-floating-monitor.is-dragging {
  cursor: grabbing;
}

.chat-floating-monitor.is-resizing {
  cursor: nwse-resize;
}

.chat-floating-monitor-stage,
.tracking-preview-debug {
  width: 100%;
}

.chat-floating-monitor-stage .tracking-preview {
  aspect-ratio: 4 / 3;
  border-radius: var(--floating-monitor-stage-radius, 16px);
  box-shadow: inset 0 0 0 var(--floating-monitor-border-width, 1px)
    rgba(140, 150, 186, 0.18);
}

.chat-floating-monitor-resize {
  position: absolute;
  right: var(--floating-monitor-handle-offset, 6px);
  bottom: var(--floating-monitor-handle-offset, 6px);
  z-index: 4;
  width: var(--floating-monitor-handle-size, 24px);
  height: var(--floating-monitor-handle-size, 24px);
  border: 0;
  border-radius: var(--floating-monitor-handle-radius, 8px);
  padding: 0;
  background:
    linear-gradient(
      135deg,
      transparent calc(52% - var(--floating-monitor-handle-line-width, 2px)),
      rgba(59, 84, 124, 0.28)
        calc(52% - var(--floating-monitor-handle-line-width, 2px)),
      rgba(59, 84, 124, 0.28)
        calc(52% + var(--floating-monitor-handle-line-width, 2px)),
      transparent calc(52% + var(--floating-monitor-handle-line-width, 2px))
    ),
    linear-gradient(
      135deg,
      transparent calc(68% - var(--floating-monitor-handle-line-width, 2px)),
      rgba(59, 84, 124, 0.52)
        calc(68% - var(--floating-monitor-handle-line-width, 2px)),
      rgba(59, 84, 124, 0.52)
        calc(68% + var(--floating-monitor-handle-line-width, 2px)),
      transparent calc(68% + var(--floating-monitor-handle-line-width, 2px))
    ),
    rgba(255, 255, 255, 0.88);
  box-shadow:
    0 10px 20px rgba(92, 104, 138, 0.18),
    inset 0 0 0 var(--floating-monitor-border-width, 1px)
      rgba(140, 150, 186, 0.18);
  cursor: nwse-resize;
  touch-action: none;
}

@media screen and (max-width: 1120px) {
  .chat-stage-shell {
    padding: 16px 16px 0;
    gap: 14px;
  }
}

@media screen and (max-width: 760px) {
  .chat-stage-shell {
    padding: 12px 12px 0;
    gap: 12px;
  }

  .chat-stage {
    gap: 12px;
  }

  .video-stage {
    border-radius: 22px;
  }

  .video-card-footer {
    min-height: 0;
  }

}
</style>
