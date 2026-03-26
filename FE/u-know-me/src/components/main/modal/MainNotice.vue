<template>
  <section class="notice-board">
    <div class="modal-hero">
      <span class="modal-chip">Notice Board</span>
      <h2 class="modal-title">공지사항</h2>
      <p class="modal-description">
        서비스 운영 소식과 업데이트 내용을 여기서 확인할 수 있습니다.
      </p>
    </div>

    <div class="notice-list-head">
      <span>공지 제목</span>
      <span class="notice-date-head">생성 날짜</span>
    </div>

    <div class="notice-list">
      <button
        v-for="(notice, num) in admin.notices"
        :key="num"
        class="notice-item"
        type="button"
        @click="noticeDetail(num)"
      >
        <span class="notice-item-title">{{ notice.title }}</span>
        <span class="notice-item-date">{{ notice.createDate.slice(0, 10) }}</span>
      </button>
    </div>
  </section>
</template>

<script>
import { storeToRefs } from "pinia";
import { useMainStore } from "@/stores/main/main";
import { useAdminStore } from "@/stores/admin/admin";

export default {
  name: "MainNotice",
  setup() {
    const main = useMainStore();
    const { btnCh } = storeToRefs(main);
    const admin = useAdminStore();
    admin.fetchNotices();

    return {
      admin,
      btnCh,
    };
  },
  methods: {
    noticeDetail(num) {
      this.btnCh = 6;
      this.admin.notice = this.admin.notices[num];
    },
  },
};
</script>

<style scoped>
.notice-board {
  display: grid;
  gap: 22px;
}

.modal-hero {
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

.modal-title {
  margin: 0;
  font-size: 34px;
  line-height: 1.1;
  color: #241739;
}

.modal-description {
  margin: 0;
  color: #645b73;
  font-size: 15px;
  line-height: 1.75;
}

.notice-list-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 116px;
  gap: 14px;
  padding: 0 14px;
  color: #7c7490;
  font-size: 13px;
  font-weight: 700;
}

.notice-date-head {
  text-align: center;
}

.notice-list {
  display: grid;
  gap: 10px;
  max-height: min(54vh, 480px);
  overflow: auto;
  padding-right: 6px;
}

.notice-list::-webkit-scrollbar {
  width: 10px;
}

.notice-list::-webkit-scrollbar-thumb {
  background: #c6a4ff;
  border-radius: 999px;
}

.notice-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 116px;
  gap: 14px;
  align-items: center;
  width: 100%;
  padding: 18px 16px;
  border: 1px solid rgba(160, 86, 255, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  color: #241739;
  cursor: pointer;
  text-align: left;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.notice-item:hover {
  transform: translateY(-1px);
  border-color: rgba(160, 86, 255, 0.3);
  box-shadow: 0 14px 24px rgba(102, 61, 161, 0.1);
}

.notice-item-title {
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
  word-break: break-word;
}

.notice-item-date {
  color: #7b7391;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

@media (max-width: 720px) {
  .modal-title {
    font-size: 28px;
  }

  .notice-list-head {
    display: none;
  }

  .notice-item {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 16px;
  }

  .notice-item-date {
    text-align: left;
  }
}
</style>
