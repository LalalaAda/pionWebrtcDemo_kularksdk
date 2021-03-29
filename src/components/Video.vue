<template>
  <v-card elevation="2" tile class="card">
    <video
      ref="video"
      :muted="false"
      :id="mid"
      autoplay
      playsinline
      class="local-video"
      controls
    />
    <div class="opt-t">
      <div class="text-h5" @click="emitChangeBigScreen">{{ stname }}</div>
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

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

interface St extends MediaStream {
  mid?: string;
  info?: {
    name: string;
  };
  stream?: MediaStream;
}
@Component
export default class Video extends Vue {
  @Prop() private stream!: St;
  @Prop() private width?: number;
  @Prop() private name?: string;
  @Prop() private muted?: boolean;
  mid = "";
  video!: HTMLVideoElement;

  stname = this.$props.name || "未知用户";

  get stmuted() {
    return this.$props.muted || false;
  }

  @Watch("stream")
  onStreamChange(v) {
    this.video.srcObject = v;
  }

  emitChangeBigScreen() {
    this.$emit("bigscreen", this.stream);
  }

  mounted() {
    console.log("video mounted!" + this.stream.mid);
    // console.log(this.stream);
    this.video = this.$refs.video as HTMLVideoElement;
    this.video.style.width = this.width + "px";
    this.video.srcObject = this.stream.stream || null;
    if (this.stream.info) {
      this.stname = this.stream.info.name || "未知用户";
    }
  }
  destroyed() {
    this.video.srcObject = null;
  }
}
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
