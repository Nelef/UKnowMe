<template>
  <div class="video-item video-item-remote" v-if="participant">
    <div class="video-stage">
      <participant-media
        :audio-track="participant.audioTrack"
        :video-track="participant.videoTrack"
      />
    </div>
    <div class="video-card-footer">
      <p class="nickName">{{ displayName }}</p>
    </div>
  </div>
</template>

<script>
import ParticipantMedia from './ParticipantMedia';

export default {
	name: 'UserVideo',

	components: {
		ParticipantMedia,
	},

	props: {
		participant: Object,
		index: Number,
	},

	computed: {
		displayName () {
			return this.participant.name || this.participant.identity;
		},
	},
};
</script>
