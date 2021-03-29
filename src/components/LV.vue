<template>
  <v-card elevation="2" tile class="card">
    <video
      ref="video"
      :muted="true"
      :id="mid"
      autoplay
      playsinline
      class="local-video"
      controls
    />
    <div class="opt-t">
      <div class="text-h5">{{ stname }}</div>
    </div>
    <div class="novideo" :style="{ zIndex: stmuted ? 1 : -1 }">
      <v-avatar color="indigo">
        <v-icon dark>
          mdi-account-circle
        </v-icon>
      </v-avatar>
      <p class="text-h4 white--text">{{ stname }}</p>
    </div>
  </v-card>
</template>

<script>
export default {
  props: ["stream", "width", "name", "muted"],
  data() {
    return {
      mid: "",
      video: ""
    };
  },
  computed: {
    stname: function() {
      return this.$props.name || "";
    },
    stmuted: function() {
      return this.$props.muted || false;
    }
  },
  watch: {
    stream: function(v) {
      this.video.srcObject = v;
    }
  },
  mounted() {
    this.video = this.$refs["video"];
    this.video.style.width = this.width + "px";
    this.video.srcObject = this.$props.stream;
    if (this.$props.stream && this.$props.stream.info) {
      this.stname = this.stream.info.name || "";
    }
  },
  destroyed() {
    this.video.srcObject = null;
  }
};
</script>

<style scoped lang="scss">
.card {
  max-width: 400px;
  font-size: 0;
  .novideo {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: black;
    z-index: -1;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }
  .local-video {
    position: relative;
    width: 100%;
  }
  .opt-t {
    position: absolute;
    top: 0;
    left: 0;
    cursor: pointer;
  }
}
</style>
