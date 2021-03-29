import log from "loglevel";
import { LocalStream, RemoteStream } from "./stream";

interface LVideoStream {
  mid: string;
  streamType: number;
  googActualEncBitrate: number;
  googAvailableSendBandwidth: number;
  googTransmitBitrate: number;
  bytesSent: number;
  framesEncoded: number;
  googFrameRateSent: number;
  googFrameWidthSent: number;
  googFrameHeightSent: number;
  googRtt: number;
  packetsLost: number;
  packetsSent: number;
  lostPacketsRate?: number;
}
interface LAudioStream {
  mid: string;
  streamType: number;
  bytesSent: number;
  packetsSent: number;
}
interface RVideoStream {
  uid: string;
  mid: string;
  streamType: number;
  googAvailableReceiveBandwidth: number;
  googAvailableSendBandwidth: number;
  // bytesSent: number;
  bytesReceived: number;
  framesDecoded: number;
  googFrameWidthReceived: number;
  googFrameHeightReceived: number;
  googRtt: number;
  packetsLost: number;
  packetsReceived: number;
  lostPacketsRate?: number;
}
interface MixAudioStream {
  mid: string;
  streamType: number;
  bytesReceived: number;
  packetsReceived: number;
  packetsLost: number;
  lostPacketsRate: number;
}

interface Report {
  rid: string;
  uid: string;
  netWork: number;
  platform: number;
  deviceName: string;
  reportTime: number;
  localPeer: {
    video: LVideoStream[];
    audio: LAudioStream;
  };
  remotePeer: {
    video: RVideoStream[];
    mixaudio: MixAudioStream;
  };
}

// 统计类
export default class KLStatsReport {
  rid = "";
  uid = "";
  netWork = 99;
  reportTime = 0; // 1350354127212 报告上传时的时间戳
  localReportVideo; // report数据
  localReportAudio;
  localReportScreen;
  remoteReportVideoArray: RVideoStream[] = []; // 目前远端流不包括audio 所以video和screen共用
  mixaudioReport;

  instance?: KLStatsReport;

  equipment = {
    network: 99, // 1:wifi 2-5:2-5g 99:其他
    platform: 3, // 1,Android; 2,iOS; 3,web; 4,windows; 5,macOS; 6,Linux; 7,小程序; 8,Flutter; 9,Electron
    deviceName: "chrome" // 比如iphone 8plus，华为mate40等等，如为浏览器则为chrome，ie,safari等等
  };
  rtcStatsReportCB?: (v: RTCStatsReport) => void;

  reportTimeout?: number;

  constructor(debug = false) {
    if (this.instance) {
      return this.instance;
    }
    this.instance = this;
    this.setEquipment();
    log.setLevel(debug ? log.levels.DEBUG : log.levels.SILENT);
    return this;
  }

  initReport(rid, uid) {
    this.rid = rid;
    this.uid = uid;
    log.debug("初始化KLStatsReport类");
  }

  httpPostReport(jsonstr) {
    let sequrl =
      "http://app.blsxvi.com:7070/monitor/snapshot/sdk/uploadSnapshot";
    sequrl = "https://192.168.2.103/monitor/snapshot/sdk/uploadSnapshot";

    function reqListener(this: XMLHttpRequest) {
      try {
        const res = JSON.parse(this.responseText);
        log.debug(res);
      } catch (e) {
        log.error(e);
      }
    }
    const req = new XMLHttpRequest();
    req.addEventListener("load", reqListener);
    req.open("POST", sequrl);
    req.setRequestHeader("Content-Type", "application/json");
    req.send(jsonstr);
  }

  colectAllReport() {
    const jsonObj: { [x: string]: any } = {};
    jsonObj.rid = this.rid;
    jsonObj.uid = this.uid;
    jsonObj.netWork = this.equipment.network;
    jsonObj.platform = this.equipment.platform;
    jsonObj.deviceName = this.equipment.deviceName;
    jsonObj.reportTime = new Date().getTime();
    const local = {
      video: {},
      audio: {}
    };
    const _localVideoArray: LVideoStream[] = [];
    if (this.localReportVideo) {
      _localVideoArray.push(this.localReportVideo);
    }
    if (this.localReportScreen) {
      _localVideoArray.push(this.localReportScreen);
    }
    (local.video as any) = _localVideoArray;
    (local.audio as any) = this.localReportAudio ? this.localReportAudio : {};
    jsonObj.localPeer = local;
    const remote = {
      video: {},
      mixAudio: {}
    };
    (remote.video as any) = this.remoteReportVideoArray;
    remote.mixAudio = this.mixaudioReport ? this.mixaudioReport : {};
    jsonObj.remotePeer = remote;
    this.notifyUserRtcStatsRepoetCallback(jsonObj);
    log.debug("----------显示RtcReport-start----------");
    log.debug(jsonObj);
    log.debug("----------显示RtcReport-end------------");
    // const str = JSON.stringify(jsonObj);
    // this.httpPostReport(str);
  }

  send() {
    // this.remoteReport && clearTimeout(this.remoteReport);
    this.reportTimeout = setTimeout(() => {
      this.colectAllReport();
      this.send();
    }, 5000);
  }

  startSendStat() {
    // 开启上传埋点
    log.debug("开始 收集分析数据 埋点上传");
    this.send();
  }
  stopSendStat() {
    // 停止上传埋点
    this.reportTimeout && clearTimeout(this.reportTimeout);
    log.debug("停止 埋点上传");
  }

  setRtcStatsReportForStream(
    stream: LocalStream | RemoteStream,
    cb: (v: RTCStatsReport) => void,
    time?: number
  ) {
    stream.transport?.getStats(cb, time);
  }

  notifyUserRtcStatsRepoetCallback(stats: any) {
    // 异步处理用户的获取report回调 降低对sdk自己报告埋点的影响
    if (this.rtcStatsReportCB) {
      const cb = stats => this.rtcStatsReportCB && this.rtcStatsReportCB(stats);
      setTimeout(() => {
        cb(stats);
      }, 0);
    }
  }

  calcLocalStreamStats(mid: string, stats: RTCStatsReport, type = 0) {
    // this.notifyUserRtcStatsRepoetCallback(stats);
    // type 流类型
    const reports = (stats as any).result();
    const localVideo: LVideoStream = {
      mid,
      streamType: type,
      googActualEncBitrate: 0,
      googAvailableSendBandwidth: 0,
      googTransmitBitrate: 0,
      bytesSent: 0,
      framesEncoded: 0,
      googFrameRateSent: 0,
      googFrameWidthSent: 0,
      googFrameHeightSent: 0,
      googRtt: 0,
      packetsLost: 0,
      packetsSent: 0,
      lostPacketsRate: 0
    };
    const localAudio: LAudioStream = {
      mid,
      streamType: type,
      bytesSent: 0,
      packetsSent: 0
    };
    reports.forEach(report => {
      if (report.id === "bweforvideo") {
        localVideo.googActualEncBitrate = report.stat("googActualEncBitrate");
        localVideo.googAvailableSendBandwidth = report.stat(
          "googAvailableSendBandwidth"
        );
        localVideo.googTransmitBitrate = report.stat("googTransmitBitrate");
      }
      if (report.type === "ssrc" && report.id.includes("_send")) {
        const mediaType = report.stat("mediaType");
        if (mediaType === "video") {
          localVideo.bytesSent = report.stat("bytesSent");
          localVideo.framesEncoded = report.stat("framesEncoded");
          localVideo.googFrameRateSent = report.stat("googFrameRateSent");
          localVideo.googFrameWidthSent = report.stat("googFrameWidthSent");
          localVideo.googFrameHeightSent = report.stat("googFrameHeightSent");
          localVideo.googRtt = report.stat("googRtt");
          const packetsLost = report.stat("packetsLost");
          const packetsSent = report.stat("packetsSent");
          let lostrate = packetsLost / (packetsLost + packetsSent);
          lostrate = isNaN(lostrate) ? 0 : Number(lostrate.toFixed(5));
          localVideo.packetsLost = packetsLost;
          localVideo.packetsSent = packetsSent;
          localVideo.lostPacketsRate = lostrate;
        }
        if (mediaType === "audio") {
          localAudio.bytesSent = report.stat("bytesSent");
          localAudio.packetsSent = report.stat("packetsSent");
        }
      }
    });
    if (type === 0) {
      this.localReportVideo = localVideo;
      this.localReportAudio = localAudio;
    } else {
      this.localReportScreen = localVideo;
    }
  }

  calcLocalScreenStats(mid: string, stats: RTCStatsReport) {
    this.calcLocalStreamStats(mid, stats, 1);
  }

  calcMixStreamStats(mid: string, stats: RTCStatsReport) {
    // this.notifyUserRtcStatsRepoetCallback(stats);
    // type 流类型
    const type = 2;
    const reports = (stats as any).result();
    const mixAudio: MixAudioStream = {
      mid,
      streamType: type,
      bytesReceived: 0,
      packetsReceived: 0,
      packetsLost: 0,
      lostPacketsRate: 0
    };
    reports.forEach(report => {
      if (report.type === "ssrc" && report.id.includes("_recv")) {
        const mediaType = report.stat("mediaType");
        if (mediaType === "audio") {
          mixAudio.bytesReceived = report.stat("bytesReceived");
          const packetsLost = report.stat("packetsLost");
          const packetsReceived = report.stat("packetsReceived");
          let lostrate = packetsLost / (packetsLost + packetsReceived);
          lostrate = isNaN(lostrate) ? 0 : Number(lostrate.toFixed(5));
          mixAudio.packetsLost = packetsLost;
          mixAudio.packetsReceived = packetsReceived;
          mixAudio.lostPacketsRate = lostrate;
        }
      }
    });
    this.mixaudioReport = mixAudio;
  }

  calcRemoteStreamStats(
    mid: string,
    stats: RTCStatsReport,
    type = 3,
    uid: string
  ) {
    // this.notifyUserRtcStatsRepoetCallback(stats);
    // type 流类型
    const reports = (stats as any).result();
    const remoteVideo: RVideoStream = {
      uid,
      mid,
      streamType: type,
      googAvailableReceiveBandwidth: 0,
      googAvailableSendBandwidth: 0,
      bytesReceived: 0,
      framesDecoded: 0,
      googFrameWidthReceived: 0,
      googFrameHeightReceived: 0,
      googRtt: 0,
      packetsLost: 0,
      packetsReceived: 0,
      lostPacketsRate: 0
    };

    reports.forEach(report => {
      if (report.id === "bweforvideo") {
        remoteVideo.googAvailableReceiveBandwidth = report.stat(
          "googAvailableReceiveBandwidth"
        );
        remoteVideo.googAvailableSendBandwidth = report.stat(
          "googAvailableSendBandwidth"
        );
      }
      if (report.type === "ssrc" && report.id.includes("_recv")) {
        const mediaType = report.stat("mediaType");
        if (mediaType === "video") {
          remoteVideo.bytesReceived = report.stat("bytesReceived");
          remoteVideo.framesDecoded = report.stat("framesDecoded");
          remoteVideo.googFrameWidthReceived = report.stat(
            "googFrameWidthReceived"
          );
          remoteVideo.googFrameHeightReceived = report.stat(
            "googFrameHeightReceived"
          );
          remoteVideo.googRtt = report.stat("googRtt");
          const packetsLost = report.stat("packetsLost");
          const packetsReceived = report.stat("packetsReceived");
          let lostrate = packetsLost / (packetsLost + packetsReceived);
          lostrate = isNaN(lostrate) ? 0 : Number(lostrate.toFixed(5));
          remoteVideo.packetsLost = packetsLost;
          remoteVideo.packetsReceived = packetsReceived;
          remoteVideo.lostPacketsRate = lostrate;
        }
      }
    });
    let has = false;
    this.remoteReportVideoArray.forEach(item => {
      if (item.mid === mid) {
        item = remoteVideo;
        has = true;
      }
    });
    if (!has) {
      this.remoteReportVideoArray.push(remoteVideo);
    }
  }

  calcRemoteScreenStats(mid: string, stats: RTCStatsReport, uid: string) {
    this.calcRemoteStreamStats(mid, stats, 4, uid);
  }

  notifyToCollectStat(stream: LocalStream | RemoteStream, type: number) {
    // type 0：本地摄像头流，1：本地屏幕共享流，2：混音流，3：对端摄像头流，4：对端屏幕共享流
    const mid = stream.mid || "";
    const uid = stream.uid || "";
    log.debug(`数据统计中的流的mid:  ${mid}`);
    const localCB = (stat: RTCStatsReport) =>
      this.calcLocalStreamStats(mid, stat);
    const localScreenCB = (stat: RTCStatsReport) =>
      this.calcLocalScreenStats(mid, stat);
    const mixAudioCB = (stat: RTCStatsReport) =>
      this.calcMixStreamStats(mid, stat);
    // const name = stream.info && stream.info.name || "";
    const remoteCB = (stat: RTCStatsReport) =>
      this.calcRemoteStreamStats(mid, stat, 3, uid);
    const remoteScreenCB = (stat: RTCStatsReport) =>
      this.calcRemoteScreenStats(mid, stat, uid);
    if (type === 0) {
      return this.setRtcStatsReportForStream(stream, localCB, 5000);
    }
    if (type === 1) {
      // 处理屏幕共享流等细节
      return this.setRtcStatsReportForStream(stream, localScreenCB, 5000);
    }
    if (type === 2) {
      return this.setRtcStatsReportForStream(stream, mixAudioCB, 5000);
    }
    if (type === 3) {
      return this.setRtcStatsReportForStream(stream, remoteCB, 5000);
    }
    if (type === 4) {
      return this.setRtcStatsReportForStream(stream, remoteScreenCB, 5000);
    }
  }

  notifyToDeleteStat(mid: string, type: number) {
    // 去除本地流的统计 type = 0 / 1; 摄像头 屏幕共享
    // 去除远程流的统计 type = 2; // 根据mid就可以
    if (type === 0) {
      this.localReportVideo = null;
    } else if (type === 1) {
      this.localReportScreen = null;
    } else if (type === 2) {
      const a = this.remoteReportVideoArray;
      this.remoteReportVideoArray = a.filter(item => item.mid !== mid);
    }
    log.debug(`移除统计 类型：${type} mid: ${mid}`);
  }

  // equipment----------------------------------------------------------------
  getBrowserNetWork() {
    // 1-wifi  2-2g 3-3g 4-4g 5-5g 99-其他
    // TODO safari 不支持navigator.connection
    const c = (navigator as any).connection;
    const type = (c && c.effectiveType) || "未知";
    switch (type) {
      case "slow-2g":
        return 2;
      case "2g":
        return 2;
      case "3g":
        return 3;
      case "4g":
        return 4;
      case "5g":
        return 5;
      case "wifi":
        return 1;
      default:
        return 99;
    }
  }
  getBrowserName() {
    const ua = navigator.userAgent.toLowerCase();
    const testUa = regexp => regexp.test(ua);
    // let engine = "unknown";
    let supporter = "unknown";
    if (testUa(/applewebkit/g)) {
      // engine = "webkit";
      if (testUa(/edge/g)) {
        supporter = "edge";
      } else if (testUa(/opr/g)) {
        supporter = "opera";
      } else if (testUa(/chrome/g)) {
        supporter = "chrome";
      } else if (testUa(/safari/g)) {
        supporter = "safari";
      }
    } else if (testUa(/gecko/g) && testUa(/firefox/g)) {
      // engine = "gecko";
      supporter = "firefox";
    } else if (testUa(/presto/g)) {
      // engine = "presto";
      supporter = "opera";
    } else if (testUa(/trident|compatible|mise/g)) {
      // engine = "trident";
      supporter = "iexplore";
    } else if (testUa(/electron/g)) {
      // engine = "webkit";
      supporter = "electron";
    }
    return supporter;
  }
  setEquipment() {
    // TODO 需要补充根据是否为electron 处理网络类型
    const network = this.getBrowserNetWork();
    const deviceName = this.getBrowserName();
    const platform = deviceName === "electron" ? 9 : 3;
    this.equipment = {
      network,
      deviceName,
      platform
    };
  }
  //--------------------------------------------------------------------------
  // 暴露给用户获取 rtcstats报告的回调接口
  setRtcStatsReportCallback(cb) {
    this.rtcStatsReportCB = cb;
    log.debug("更新了用户的自定义分析RTCStatsReport的回调");
  }
}
