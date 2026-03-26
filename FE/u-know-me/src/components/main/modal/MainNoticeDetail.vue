<template>
  <section class="notice-detail-shell">
    <div class="notice-detail-toolbar">
      <button class="back-btn" type="button" @click="btnCh = 5">목록으로</button>
    </div>

    <div class="notice-detail-hero">
      <span class="modal-chip">Notice Detail</span>
      <h2 class="notice-detail-title">{{ admin.notice.title }}</h2>
      <div class="notice-detail-date">{{ admin.notice.createDate.slice(0, 10) }}</div>
    </div>

    <div class="notice-detail-body">
      <pre>{{ admin.notice.content }}</pre>
    </div>
  </section>
</template>

<script>
import { storeToRefs } from "pinia";
import { useAdminStore } from "@/stores/admin/admin";
import { useMainStore } from "@/stores/main/main";

export default {
  name: "MainNoticeDetail",
  setup() {
    const admin = useAdminStore();
    const main = useMainStore();
    const { btnCh } = storeToRefs(main);

    return {
      admin,
      btnCh,
    };
  },
};
</script>

<style scoped>
.notice-detail-shell {
  display: grid;
  gap: 18px;
}

.notice-detail-toolbar {
  display: flex;
  justify-content: flex-start;
}

.back-btn {
  min-width: 110px;
  height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(160, 86, 255, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  color: #62458f;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.back-btn:hover {
  background: #f3ecff;
}

.notice-detail-hero {
  display: grid;
  gap: 12px;
}

.modal-chip {
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(160, 86, 255, 0.12);
  color: #7b49d8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.notice-detail-title {
  margin: 0;
  font-size: 34px;
  line-height: 1.2;
  color: #241739;
  word-break: break-word;
}

.notice-detail-date {
  color: #7c7490;
  font-size: 14px;
  font-weight: 700;
}

.notice-detail-body {
  min-height: min(46vh, 360px);
  max-height: min(52vh, 420px);
  overflow: auto;
  padding: 20px 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(160, 86, 255, 0.08);
}

.notice-detail-body::-webkit-scrollbar {
  width: 10px;
}

.notice-detail-body::-webkit-scrollbar-thumb {
  background: #c6a4ff;
  border-radius: 999px;
}

.notice-detail-body pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #2d2143;
  font-size: 15px;
  line-height: 1.85;
  font-family: inherit;
}

@media (max-width: 720px) {
  .notice-detail-title {
    font-size: 28px;
  }

  .notice-detail-body {
    padding: 18px;
    border-radius: 18px;
  }
}
</style>
