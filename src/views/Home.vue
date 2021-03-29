<template>
  <v-main style="height: 100%;">
    <v-app-bar fixed>
      <div class="title-info">
        <div class="text-h4 d">
          <v-icon>mdi-folder-home</v-icon>
          <span>{{ user.roomId }}</span>
        </div>
        <div class="text-h4 d">
          <v-icon>mdi-account-circle</v-icon>
          <span>{{ user.name }}</span>
        </div>
      </div>
      <div class="setupbtn">
        <v-btn @click="showSetting">
          <v-icon color="blue darken-2">mdi-wrench</v-icon>
        </v-btn>
        <v-btn @click="_onFullScreenClickHandler" class="ml-2">
          <v-icon color="blue darken-2">mdi-fullscreen</v-icon>
        </v-btn>
      </div>
      <div class="opt">
        <v-btn @click="leaveDialog = true">
          <v-icon color="red darken-2">mdi-close-circle-outline</v-icon>
        </v-btn>
        <v-btn @click="_handleScreenSharing">
          <v-icon :color="`${screenSharingEnabled ? 'red' : 'blue'} darken-2`">
            mdi-monitor-screenshot
          </v-icon>
        </v-btn>
        <v-btn @click="handleAudioClick">
          <v-icon :color="`${localAudioEnabled ? 'blue' : 'red'} darken-2`">
            mdi-microphone
          </v-icon>
        </v-btn>
        <v-btn @click="handleVideoClick">
          <v-icon :color="`${localVideoEnabled ? 'blue' : 'red'} darken-2`">
            mdi-message-video
          </v-icon>
        </v-btn>
      </div>
    </v-app-bar>

    <section>
      <!-- 聊天室 -->
      <div :class="`left-container ${showChat ? '' : 'closed'}`">
        <Chat />
      </div>
      <v-btn
        :class="`chatroom-btn ${showChat ? 'expand' : ''}`"
        @click="showHideChat"
      >
        <v-icon v-if="!showChat">mdi-arrow-expand-right</v-icon>
        <v-icon v-else>mdi-arrow-expand-left</v-icon>
      </v-btn>
      <div :class="`right-container ${showChat ? '' : 'expand'}`">
        <!-- 大屏幕显示第一个推流 -->
        <div class="fullcon" v-if="fullstream">
          <div class="fullstream">
            <video ref="fullstream" autoplay playsinline />
            <p class="text-h4 white--text">{{ fullstreamName }}</p>
          </div>
        </div>

        <!-- 本地视频流 -->
        <v-container v-if="localStream" flex>
          <LocalVideo
            :muted="!localVideoEnabled"
            :stream="localStream.stream"
            name="LocalStream"
          />
        </v-container>
        <v-card v-else>
          {{ errorText }}
        </v-card>
        <!-- 远程视频流 -->
        <v-container class="remote-videobox" v-if="streams.length > 0">
          <Video
            v-for="st in streams"
            :key="st.mid"
            :stream="st.stream"
            :width="200"
            v-on:bigscreen="changeBigScreen"
          />
        </v-container>
        <!-- 屏幕共享 -->
        <v-container v-if="localScreen" class="screenShare">
          <Video :stream="localScreen" />
        </v-container>
        <!-- 混音 -->
        <video
          ref="mixAudio"
          autoplay
          playsInline
          v-if="mixffffStream"
          style="width:0;height:0;"
        />
      </div>
    </section>

    <v-card class="satas">
      <div id="satas"></div>
    </v-card>

    <v-row dense class="remote-stats rounded">
      <v-col v-for="s in remoteStreamStatsArray" :key="s.key">
        <v-card v-html="s.html"></v-card>
      </v-col>
    </v-row>

    <v-footer fixed class="font-weight-medium">
      <v-col class="text-center" cols="12">
        <strong>百灵声学&copy;</strong>
      </v-col>
    </v-footer>

    <div>
      <Setting
        ref="settingref"
        :setting="settings"
        v-on:vchange="getSettings"
      />
    </div>

    <div>
      <v-dialog v-model="leaveDialog" persistent max-width="290">
        <v-card>
          <v-card-title>
            离开会议？
          </v-card-title>
          <v-card-text>
            Do you want to leave the room?
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="red darken-2" text @click="_handleLeave">
              确定
            </v-btn>
            <v-btn color="green darken-2" text @click="leaveDialog = false">
              取消
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-main>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { KLSdk } from "@/kulark-sdk-js";

import Video from "@/components/Video.vue";
// import LocalVideo from "@/components/LocalVideo.vue";
import LocalVideo from "@/components/LV.vue";
import Setting from "@/components/Setting.vue";
import Chat from "@/components/Chat.vue";
import { Response } from "protoo-client";

interface User {
  name: string;
  roomId: string;
}

interface LocalStream extends MediaStream {
  mute: (kind: "audio" | "video") => Promise<void>;
  unmute: (kind: "audio" | "video") => Promise<void>;
  mid?: string;
  stream?: MediaStream;
}
interface RemoteStream extends MediaStream {
  close: () => void;
  unsubscribe: () => Promise<Response>;
  info?: any;
  mid?: string;
}
interface SubStream {
  mid: string;
  stream: RemoteStream;
  sid: string;
}
// "192.168.2.111"
const ScoketIP = "192.168.2.111";
// const ScoketIP = "120.238.78.213";
const SocketProtol = 8443;
// const SocketProtol = 10443;

@Component({
  components: {
    Video,
    Setting,
    Chat,
    LocalVideo
  }
})
export default class Home extends Vue {
  user = this.$store.state.user;
  sdk?: KLSdk;
  localAudioEnabled = true;
  localVideoEnabled = true;
  screenSharingEnabled = false;
  isFullScreen = false;
  leaveDialog = false;

  localStream: MediaStream | string = "";
  errorText: Error | string = "刷新调用摄像头。。。";
  streams: SubStream[] = [];
  mixffffStream: SubStream | string = ""; // 混音流
  localScreen: LocalStream | string = ""; // 屏幕流

  fullstream: SubStream | string = ""; // 大屏流
  fullstreamName = "主持人";

  localstreamReport: RTCStatsReport | undefined; // 本地流的statusreport

  remoteStreamStatsArray: any[] = []; // 远程流报告

  showChat = false;
  showHideChat() {
    this.showChat = !this.showChat;
  }

  showSetting() {
    (this.$refs.settingref as any).open = true;
  }
  settings = {
    selectedAudioDevice: "",
    selectedVideoDevice: "",
    resolution: "hd",
    bandwidth: 1024,
    codec: "h264"
  };
  async getSettings(e) {
    console.log(e);
    const {
      selectedAudioDevice,
      selectedVideoDevice,
      resolution,
      bandwidth,
      codec
    } = e;
    this.settings = {
      selectedAudioDevice,
      selectedVideoDevice,
      resolution,
      bandwidth,
      codec
    };
    localStorage.setItem("settings", JSON.stringify(this.settings));
    if (this.localStream && typeof this.localStream === "object") {
      await (this.sdk as KLSdk).unpublishStream(this.localStream as any);
    }
    this.$nextTick(() => {
      this._handleLocalStream(true);
    });
  }

  async _cleanUp() {
    this.streams.map(async item => {
      await item.stream.unsubscribe();
    });
    if (this.localStream && typeof this.localStream === "object") {
      await (this.sdk as KLSdk).unpublishStream(this.localStream as any);
    }
    this.localStream = "";
    this.streams = [];
    // await this.sdk.freeSdk();
    this.$router.push("join");
  }

  _notification(message?: string, description?: string) {
    console.log(message);
    console.log(description);
  }

  parseNotify(type: number, p1: string, uid: string, obj?: any) {
    // p1 --- rid | mid
    if (!type) {
      return;
    }
    switch (type) {
      case 1002:
        console.log("有流加入");
        this._handleAddStream(p1, uid, obj);
        break;
      case 1003:
        console.log("有流移除");
        this._handleRemoveStream(p1);
        break;
      case 1000:
        console.log(`有人加入peer join: ${p1}, ${uid}, ${obj}`);
        break;
      case 1001:
        console.log(`有人离开 peer leave: ${p1}, ${uid}, ${obj}`);
        break;
      case 1010:
        console.log("静音某用户", uid);
        break;
      case 1011:
        console.log("静音全员", p1);
        break;
      case 1012:
        console.log("摄像头 某");
        break;
      case 1013:
        console.log("摄像头 全员");
        break;
      case 1014:
        console.log("收到私聊信息", p1);
        break;
      case 1015:
        console.log("收到全员消息");
        break;
      case 1020:
        console.log("切换主持人", p1, uid, obj);
        break;
      case 1021:
        console.log("收到踢人消息", p1, uid, obj);
        break;
      case 1030:
        console.log("收到静音全员", p1, uid, obj);
        break;
      case 1031:
        console.log("禁摄像头");
        break;
      case 1032:
        console.log("会议结束");
        this._handleLeave();
        break;
      case 1040:
        console.log("audio-level");
        break;
      case 1042:
        console.log("屏幕分享");
        break;
      default:
        break;
    }
  }

  dodo = {
    onEvent: async (
      eid: number,
      estatus: number,
      rid: string,
      uid: string,
      obj?: any
    ) => {
      switch (eid) {
        case 1000:
          // ws event
          if (estatus === 0) {
            this._handleJoin();
          } else {
            console.log("ws连接失败 或者 断开");
          }
          break;
        case 2001:
          // meet_join
          if (estatus === 0) {
            console.log("加入会议成功");
            this._handleLocalStream(true);
          }
          break;
        case 2002:
          // meet leave
          if (estatus === 0) {
            console.log("离开会议");
          }
          break;
        case 2010:
          if (estatus === 0) {
            console.log("获取成员列表");
          }
          break;
        case 2020:
          // NOTIFY
          console.log("通知消息");
          this.parseNotify(estatus, rid, uid, obj);
          break;
        // TODO notify_mute_all ...等相关api
        default:
          console.log(rid, uid, obj);
          break;
      }
      return {};
    }
  };

  _handleJoin() {
    (this.sdk as KLSdk).joinRoom(this.user.roomId, true);
  }

  async _handleLeave() {
    this._cleanUp();
  }

  _muteMediaTrack(type: "audio" | "video", enabled: boolean) {
    if (!this.localStream) {
      return;
    }
    if (enabled) {
      (this.localStream as LocalStream).unmute(type);
    } else {
      (this.localStream as LocalStream).mute(type);
    }
  }
  _setLocalStream(stream: LocalStream) {
    this.localStream = stream;
  }
  _setLocalStreamError(e: Error) {
    this.errorText = e;
  }

  async _handleLocalStream(enabled: boolean) {
    if (!this.sdk) {
      return;
    }
    try {
      if (enabled) {
        // console.log(this.settings);
        const ls = await this.sdk.createLocalStream(this.settings);
        ls.info = { type: "video" };
        this._setLocalStream(ls);
        await this.sdk.publishStream(ls);
      } else {
        if (this.localStream && typeof this.localStream === "object") {
          await this.sdk.unpublishStream(this.localStream as any);
          this.localStream = "";
        }
      }
    } catch (error) {
      this._setLocalStreamError(error);
    }
  }

  // 处理流加入时 yuancheng remoteStream;
  async _handleAddStream(mid: string, uid: string, info: any) {
    const stream = await (this.sdk as KLSdk).subscribeStream(mid, uid, info);
    stream.info = info;
    console.log("接收远端流------------------------------------------");
    console.log(stream);
    console.log("接收远端流end----------------------------------------");
    if (stream.mid?.indexOf("mixffff") === -1) {
      this.streams.push({ mid: stream.mid || "", stream, sid: mid });
      if (this.streams.length === 1) {
        this.setFullscreenStream(this.streams[0]);
      }
    } else {
      // 一个混音流
      this.mixffffStream = {
        mid: stream.mid || "",
        stream,
        sid: mid
      };
      this.$nextTick(() => {
        if (this.mixffffStream) {
          (this.$refs.mixAudio as HTMLVideoElement).srcObject = stream || null;
          // (this.$refs.mixAudio as HTMLVideoElement).play();
        }
      });
    }

    // const name = (stream.info && stream.info.name) || mid || "";
    // this.sdk?.setRtcStatsReportForStream(
    //   stream,
    //   v => this.calcRemoteStreamStats(mid, v, name),
    //   3000
    // );
  }

  async _handleRemoveStream(mid: string) {
    const streams = this.streams.filter(item => item.sid !== mid);
    this.streams = streams;
    if (this.streams.length > 0) {
      this.fullstream = "";
      this.setFullscreenStream(this.streams[0]);
    } else {
      this.fullstream = "";
    }
  }

  // 处理大屏流
  setFullscreenStream(stream: SubStream) {
    this.fullstream = stream;
    this.fullstreamName = stream.stream.info.name || "未知用户";
    this.$nextTick(() => {
      console.log(this.fullstream);
      (this.$refs.fullstream as HTMLMediaElement).srcObject = stream.stream;
    });
  }
  changeBigScreen(stream) {
    console.log("%cchange big screen  -begin-", "color:blue");
    console.log(stream);
    console.log("%cchange big screen -end-", "color:blue");
    this.fullstream = stream;
    this.$nextTick(() => {
      (this.$refs.fullstream as HTMLMediaElement).srcObject = stream.stream;
      this.fullstreamName = stream.info.name || "未知用户";
    });
  }

  // 处理屏幕共享
  async handleScreenSharing(enabled: boolean) {
    if (!this.sdk) {
      return;
    }
    if (enabled) {
      const localScreen = await this.sdk.createLocalScreenStream({
        ...this.settings,
        screen: true,
        video: false,
        audio: false
      });
      this.localScreen = localScreen;
      localScreen.info = { type: "screen" };
      await this.sdk.publishStream(localScreen);
      const track = localScreen.getVideoTracks()[0];
      if (track) {
        track.addEventListener(
          "ended",
          () => {
            this._handleScreenSharing();
          },
          { once: true }
        );
      }
    } else {
      if (this.localScreen && typeof this.localScreen === "object") {
        await this.sdk.unpublishStream(this.localScreen as any);
        this.localScreen = "";
      }
    }
  }

  // ------------------------------------------------------------
  handleAudioClick() {
    this._handleAudioTrackEnabled(!this.localAudioEnabled);
  }
  _handleAudioTrackEnabled(enabled: boolean) {
    this.localAudioEnabled = enabled;
    this._muteMediaTrack("audio", enabled);
  }
  handleVideoClick() {
    this._handleVideoTrackEnabled(!this.localVideoEnabled);
  }
  _handleVideoTrackEnabled(enabled: boolean) {
    this.localVideoEnabled = enabled;
    this._muteMediaTrack("video", enabled);
  }

  _handleScreenSharing() {
    this.screenSharingEnabled = !this.screenSharingEnabled;
    this.handleScreenSharing(this.screenSharingEnabled);
  }

  _onFullScreenClickHandler() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docElm: any = document.documentElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = document;
    function fullscreenState() {
      return (
        doc.fullscreen || doc.webkitIsFullScreen || doc.mozFullScreen || false
      );
    }
    console.log(fullscreenState());
    if (fullscreenState()) {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.webkitCancelFullScreen) {
        doc.webkitCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      this.isFullScreen = false;
    } else {
      if (docElm.requestFullscreen) {
        docElm.requestFullscreen();
      }
      //FireFox
      else if (docElm.mozRequestFullScreen) {
        docElm.mozRequestFullScreen();
      }
      //Chrome等
      else if (docElm.webkitRequestFullScreen) {
        docElm.webkitRequestFullScreen();
      }
      //IE11
      else if (docElm.msRequestFullscreen) {
        docElm.msRequestFullscreen();
      }
      this.isFullScreen = true;
    }
  }
  // -------------------------------------------------------------

  async initSDK() {
    if (this.sdk) {
      this.sdk.engine.client.off("stream-add", this._handleAddStream);
      this.sdk.engine.client.off("stream-remove", this._handleRemoveStream);
      this.sdk.freeSdk();
      this.streams.map(async item => {
        await item.stream.unsubscribe();
      });
      if (this.localStream && typeof this.localStream === "object") {
        await this.sdk.unpublishStream(this.localStream as any);
      }
    }
    this.localStream = "";
    this.streams = [];
    this.sdk = new KLSdk(true);

    this.sdk.setServerIp(ScoketIP, SocketProtol);
    // this.sdk.setServerIp("localhost", 3000);
    // this.sdk.setRelayIp("120.238.78.214");
    this.sdk.setSfuNode("146226");
    this.sdk.setCallBack(this.dodo);
    try {
      let _settings = localStorage.getItem("settings") || "";
      _settings = _settings && JSON.parse(_settings);
      if (_settings && (_settings as any).codec !== undefined) {
        (this.settings as any) = _settings;
      }
    } catch (error) {
      console.log(error);
    }
  }

  // vue生命周期钩子
  async mounted() {
    console.log("mounted");
    await this.initSDK();
    const routerRid = this.$route.params.id;
    const storeUser = this.$store.state.user;
    if (!routerRid) {
      return this.$router.push({ path: "/join" });
    }
    const name = localStorage.getItem("name") || "";
    const roomId = localStorage.getItem("roomId") || "";
    if (roomId !== routerRid) {
      return this.$router.push({ path: "/join" });
    }
    if (!storeUser.name || !storeUser.roomId) {
      if (name && roomId) {
        this.$store.dispatch("user/login", { name, roomId });
      } else {
        return this.$router.push({ path: "/join" });
      }
    }
    if (this.sdk) {
      this.sdk.initSdk(roomId, "", name);
      this.sdk.start();
    }

    window.onbeforeunload = e => {
      e.preventDefault();
      this.leaveDialog = true;
      return "";
    };
  }
  async beforeUpdate() {
    console.log("upupupupupupupupupupupupupupup");
  }
  beforeDestroy() {
    if (this.sdk) {
      this.sdk.engine.client.off("stream-add", this._handleAddStream);
      this.sdk.engine.client.off("stream-remove", this._handleRemoveStream);
      console.log(this.sdk);
      this.sdk.freeSdk();
      this.sdk = undefined;
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../styles/app.scss";
.setupbtn {
  display: flex;
  justify-content: flex-end;
  position: absolute;
  top: 10px;
  right: 10px;
}
.opt {
  display: flex;
  justify-content: center;
  .v-btn {
    margin: 0 20px;
  }
}
.title-info {
  margin: 0 10px;
  // padding: 20px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  .d {
    display: flex;
    & + .d {
      margin-left: 20px;
    }
  }
}
.remote-videobox {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  flex-wrap: wrap;
  .card {
    margin: 20px;
  }
}
section {
  position: relative;
  padding-top: 80px;
  // flex: 1 1 auto;
  height: 100%;
  padding-bottom: 60px;
  display: flex;
  flex-direction: row;
  .left-container {
    display: flex;
    width: 320px;
    z-index: 2;
    position: fixed;
    top: 65px;
    height: calc(100% - 125px);
    opacity: 1;
    transition: all 0.5s ease-in-out;
    &.closed {
      width: 0;
      opacity: 0;
    }
  }
  .right-container {
    display: flex;
    flex: 1;
    z-index: 1;
    padding-left: 320px;
    flex-direction: column;
    transition: padding 0.5s ease-in-out;
    &.expand {
      padding-left: 0;
    }
  }
  .chatroom-btn {
    display: block;
    position: absolute;
    z-index: 3;
    bottom: 80px;
    left: 10px;
    transition: left 0.5s ease-in-out;
    &.expand {
      left: 330px;
    }
  }
}
.fullcon {
  position: absolute;
  top: 70px;
  left: 0;
  width: 100%;
  .fullstream {
    position: sticky;
    top: 0;
    left: 0;
    width: 100%;
    max-height: 100%;
    video {
      width: 100%;
      object-fit: contain;
    }
    p {
      position: absolute;
      top: 70px;
      left: 0;
      width: 100%;
      text-align: center;
    }
  }
}
.satas.v-card {
  position: absolute;
  top: 143px;
  left: 10px;
  z-index: 10;
  text-align: left;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #eee;
}
.remote-stats {
  position: absolute;
  text-align: left;
  bottom: 60px;
  left: 10px;
  z-index: 33;
}
.remote-stats .v-card {
  background-color: rgba(0, 0, 0, 0.7);
  color: #eee;
  padding: 10px;
}
</style>
