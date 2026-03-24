<template>
  <div class="video-item" v-if="participant">
    <participant-media
      :audio-track="participant.audioTrack"
      :video-track="participant.videoTrack"
    />
    <div><p class="nickName">{{ displayName }}</p></div>
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
	},

	computed: {
		displayName () {
			return this.participant.name || this.participant.identity;
		},
	},
};
</script>
