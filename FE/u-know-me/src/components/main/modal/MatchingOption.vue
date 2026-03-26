<template>
  <section class="matching-sheet">
    <div class="modal-hero">
      <span class="modal-chip">Matching Setup</span>
      <h2 class="modal-title">매칭 옵션 선택</h2>
      <p class="modal-description">
        원하는 매칭 조건을 가볍게 맞춰두면 더 비슷한 상대와 연결됩니다.
      </p>
    </div>

    <form
      action="GET"
      id="matchingOptionForm"
      @submit.prevent="main.matchingOptionSelect(main.option)"
    >
      <div class="option-grid">
        <div class="option-card">
          <label for="optionSmoking">흡연 여부</label>
          <select
            name="optionSmoking"
            id="optionSmoking"
            v-model="main.option.matchingSmoke"
          >
            <option
              v-for="(smoke, idx) in smokes"
              :key="idx"
              :value="smokes_val[idx]"
            >
              {{ smoke }}
            </option>
          </select>
        </div>

        <div class="option-card option-card-split">
          <div>
            <label for="optionMinAge">연하 나이</label>
            <input
              type="number"
              name="optionMinAge"
              id="optionMinAge"
              v-model="main.option.minAge"
              min="0"
              max="10"
            />
          </div>
          <div>
            <label for="optionMaxAge">연상 나이</label>
            <input
              type="number"
              name="optionMaxAge"
              id="optionMaxAge"
              v-model="main.option.maxAge"
              min="0"
              max="10"
            />
          </div>
        </div>

        <div class="option-card">
          <label for="optionMatching">매칭 방식</label>
          <select
            name="optionMatching"
            id="optionMatching"
            v-model="main.option.matchingRoom"
          >
            <option
              v-for="(matching, idx) in matchings"
              :key="idx"
              :value="matchings_val[idx]"
            >
              {{ matching }}
            </option>
          </select>
        </div>
      </div>

      <button type="submit" class="option-btn">이 조건으로 저장</button>
    </form>
  </section>
</template>

<script>
import { useMainStore } from "@/stores/main/main";

export default {
  name: "MatchingOption",
  data() {
    return {
      smokes: ["상관없음", "흡연", "비흡연"],
      smokes_val: ["0", "1", "2"],
      matchings: ["1대1", "2대2"],
      matchings_val: ["1", "2"],
    };
  },
  setup() {
    const main = useMainStore();
    return {
      main,
    };
  },
};
</script>

<style scoped>
.matching-sheet {
  display: grid;
  gap: 24px;
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

#matchingOptionForm {
  display: grid;
  gap: 18px;
}

.option-grid {
  display: grid;
  gap: 14px;
}

.option-card {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: inset 0 0 0 1px rgba(160, 86, 255, 0.08);
}

.option-card label {
  color: #352653;
  font-size: 14px;
  font-weight: 700;
}

.option-card-split {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.option-card-split > div {
  display: grid;
  gap: 10px;
}

#matchingOptionForm input,
#matchingOptionForm select {
  box-sizing: border-box;
  width: 100%;
  height: 50px;
  padding: 0 16px;
  border: 1px solid #dbcff0;
  border-radius: 16px;
  background: #fdfbff;
  color: #281b40;
  font-size: 15px;
}

#matchingOptionForm input:focus,
#matchingOptionForm select:focus {
  outline: none;
  border-color: #a056ff;
  box-shadow: 0 0 0 4px rgba(160, 86, 255, 0.12);
}

.option-btn {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 18px;
  background: linear-gradient(135deg, #a056ff, #c284ff);
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 14px 26px rgba(160, 86, 255, 0.24);
}

.option-btn:hover {
  filter: brightness(0.98);
}

@media (max-width: 720px) {
  .modal-title {
    font-size: 28px;
  }

  .option-card {
    padding: 16px;
    border-radius: 18px;
  }

  .option-card-split {
    grid-template-columns: 1fr;
  }
}
</style>
