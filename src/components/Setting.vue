<template>
  <div>
    <v-dialog v-model="open" persistent max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">设置</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <div class="settings-item">
              <div class="settings-item-right">
                <v-select
                  :items="audioDevices"
                  label="MicroPhone"
                  outlined
                  dense
                  item-text="text"
                  item-value="value"
                  v-model="selectedAudioDevice"
                  v-on:change="this.handleAudioChange"
                />
              </div>
            </div>

            <div class="settings-item">
              <span class="settings-item-left">麦克风音量</span>
              <div class="settings-item-right">
                <v-slider :max="100" :min="0" :value="audioLevel" />
              </div>
            </div>

            <div class="settings-item">
              <div class="settings-item-right">
                <v-select
                  :items="videoDevices"
                  label="Camera"
                  outlined
                  dense
                  item-text="text"
                  item-value="value"
                  v-model="selectedVideoDevice"
                  v-on:change="handleVideoChange"
                />
                <v-select
                  :items="qualitys"
                  label="Quality"
                  outlined
                  dense
                  item-text="text"
                  item-value="value"
                  v-model="selectedQuality"
                  v-on:change="handleQualityChange"
                />
                <v-select
                  :items="videoCodes"
                  label="VideoCode"
                  outlined
                  dense
                  item-text="text"
                  item-value="value"
                  v-model="selectedVideocode"
                  v-on:change="handleVideocodeChange"
                />
              </div>
              <div class="settings-video-container">
                <video
                  id="previewVideo"
                  ref="previewVideo"
                  autoPlay
                  playsInline
                  muted="true"
                  :style="{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }"
                />
              </div>
            </div>

            <div class="settings-item">
              <div class="settings-item-right">
                <v-select
                  :items="bandWidths"
                  label="BandWidth"
                  outlined
                  dense
                  item-text="text"
                  item-value="value"
                  v-model="selectedBandwidth"
                  v-on:change="handleBandwidthChange"
                />
              </div>
            </div>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="handleCancel">
            取消
          </v-btn>
          <v-btn color="blue darken-1" text @click="handleOk">
            确定
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import SoundMeter from "./soundmeter";

function closeMediaStream(stream: MediaStream) {
  if (!stream) {
    return;
  }
  if (
    MediaStreamTrack &&
    MediaStreamTrack.prototype &&
    MediaStreamTrack.prototype.stop
  ) {
    let tracks, i, len;
    if (stream.getTracks) {
      tracks = stream.getTracks();
      for (i = 0, len = tracks.length; i < len; i++) {
        tracks[i].stop();
      }
    } else {
      tracks = stream.getAudioTracks();
      for (i = 0, len = tracks.length; i < len; i++) {
        tracks[i].stop();
      }
      tracks = stream.getVideoTracks();
      for (i = 0, len = tracks.length; i < len; i++) {
        tracks[i].stop();
      }
    }
  } else if (typeof (stream as any).stop === "function") {
    console.log("closeMediaStream() | calling stop() on the MediaStream");
    (stream as any).stop();
  }
}

function attachMediaStream(element: HTMLMediaElement, stream: MediaStream) {
  element.srcObject = stream;
  console.log(stream);
}

interface SelectItems {
  value: string | number;
  text: string;
}

@Component
export default class Setting extends Vue {
  @Prop() private setting?: any;
  open = false;

  @Watch("open")
  onOpenChanged(val: boolean, oldVal: boolean) {
    if (val && val !== oldVal) {
      this.$nextTick(() => {
        this.startPreview();
      });
    }
  }

  soundMeter: SoundMeter | string = "";

  updateInputDevices(): Promise<{
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
    audioOutputDevices: MediaDeviceInfo[];
  }> {
    return new Promise((resolve, reject) => {
      const videoDevices: MediaDeviceInfo[] = [];
      const audioDevices: MediaDeviceInfo[] = [];
      const audioOutputDevices: MediaDeviceInfo[] = [];
      navigator.mediaDevices
        .enumerateDevices()
        .then(devices => {
          // console.log(devices);
          for (const device of devices) {
            if (device.kind === "videoinput") {
              videoDevices.push(device);
            } else if (device.kind === "audioinput") {
              audioDevices.push(device);
            } else if (device.kind === "audiooutput") {
              audioOutputDevices.push(device);
            }
          }
        })
        .then(() => {
          const data = { videoDevices, audioDevices, audioOutputDevices };
          resolve(data);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  audioDevices: SelectItems[] = [];
  selectedAudioDevice = "";
  handleAudioChange(e) {
    console.log(e);
    setTimeout(() => {
      this.startPreview();
    }, 100);
  }

  audioLevel = 50;
  // handleAudiolevelChange(e) {
  //   console.log(e);
  // }

  videoDevices: SelectItems[] = [];
  selectedVideoDevice = "";
  handleVideoChange() {
    setTimeout(() => {
      this.startPreview();
    }, 100);
  }

  qualitys = [
    { text: "QVGA(320x180)", value: "qvga" },
    { text: "VGA(640x360)", value: "vga" },
    { text: "SHD(960x540)", value: "shd" },
    { text: "HD(1280x720)", value: "hd" }
  ];
  selectedQuality = "";
  handleQualityChange() {
    console.log("");
  }

  videoCodes = [
    { text: "H264", value: "h264" },
    { text: "VP8", value: "vp8" },
    { text: "VP9", value: "vp9" }
  ];
  selectedVideocode = "";
  handleVideocodeChange() {
    // this.selectedVideocode = e;
    console.log("");
  }

  bandWidths = [
    { text: "LOW(256kbps)", value: 256 },
    { text: "MEDIUM(512kbps)", value: 512 },
    { text: "HIGH(1Mbps)", value: 1024 },
    { text: "LAN(4Mbps)", value: 4096 }
  ];
  selectedBandwidth = 1024;
  handleBandwidthChange() {
    // this.selectedBandwidth = e;
    console.log("");
  }

  soundMeterProcess() {
    const val = (window as any).soundMeter.instant.toFixed(2) * 348 + 1;
    this.audioLevel = val;
    if (this.open) {
      setTimeout(() => {
        this.soundMeterProcess();
      }, 100);
    }
  }

  startPreview() {
    this.stopPreview();
    const soundMeterProcess = this.soundMeterProcess;
    const videoElement = this.$refs["previewVideo"] as HTMLMediaElement;
    const audioSource = this.selectedAudioDevice;
    const videoSource = this.selectedVideoDevice;
    const soundMeter = ((window as any).soundMeter = new SoundMeter(
      (window as any).audioContext
    ));
    const constranints = {
      audio: { deviceId: audioSource ? audioSource : undefined },
      video: { deviceId: videoSource ? videoSource : undefined }
    };
    navigator.mediaDevices
      .getUserMedia(constranints)
      .then(function(stream) {
        console.log("start preveev");
        console.log(stream);
        (window as any).stream = stream;
        attachMediaStream(videoElement, stream);
        (soundMeter as SoundMeter).connectToSource(stream);
        setTimeout(soundMeterProcess, 100);
      })
      .catch(e => console.log(e));
  }
  stopPreview() {
    if ((window as any).stream) {
      closeMediaStream((window as any).stream);
    }
  }

  handleOk() {
    this.open = false;
    this.stopPreview();
    const {
      selectedAudioDevice,
      selectedVideoDevice,
      selectedQuality,
      selectedBandwidth,
      selectedVideocode
    } = this;
    this.$emit("vchange", {
      selectedAudioDevice,
      selectedVideoDevice,
      resolution: selectedQuality,
      bandwidth: selectedBandwidth,
      codec: selectedVideocode
    });
  }
  handleCancel() {
    this.open = false;
    this.stopPreview();
  }

  getPropsSetting() {
    if (this.setting) {
      this.selectedAudioDevice = this.setting.selectedAudioDevice || "";
      this.selectedVideoDevice = this.setting.selectedVideoDevice || "";
      this.selectedQuality = this.setting.resolution || "";
      this.selectedBandwidth = this.setting.bandwidth || 1024;
      this.selectedVideocode = this.setting.codec || "";
    }
  }

  check() {
    try {
      window.AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      (window as any).audioContext = new AudioContext();
    } catch (e) {
      console.log("Web Audio API not supported.");
    }
  }

  init() {
    this.check();
    console.log("setting mounted!");
    this.updateInputDevices().then(data => {
      if (data && data.audioDevices.length > 0) {
        console.log(data.audioDevices);
        this.audioDevices = data.audioDevices.map(item => {
          return { value: item.deviceId, text: item.label };
        });
        // this.selectedAudioDevice = data.audioDevices[0].deviceId;
      }
      if (data && data.videoDevices.length > 0) {
        this.videoDevices = data.videoDevices.map(item => {
          return { value: item.deviceId, text: item.label };
        });
        // this.selectedVideoDevice = data.videoDevices[0].deviceId;
      }
      this.$nextTick(() => {
        this.getPropsSetting();
      });
    });
  }
  mounted() {
    this.init();
  }
  updated() {
    if (!this.audioDevices) {
      this.init();
    }
  }
  destroyed() {
    console.log("setting destroyed");
  }
}
</script>

<style scoped lang="scss">
.settings-item {
  display: flex;
  flex-direction: row;
  margin-bottom: 20px;
  align-items: center;
}
.settings-item-left {
  width: 80px;
  text-align: right;
  color: rgba(0, 0, 0, 0.65);
  line-height: 32px;
  font-size: 14px;
  font-weight: normal;
}
.settings-item-right {
  flex: 1;
  padding-left: 20px;
  padding-right: 20px;
}
.settings-video-container {
  width: 240px;
  height: 180px;
  background-color: #000000;
  margin-top: 20px;
}
</style>
