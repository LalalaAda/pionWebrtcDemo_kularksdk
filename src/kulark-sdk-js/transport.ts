import { parse, write, MediaAttributes } from "sdp-transform";
import log from "loglevel";

enum PayloadType {
  PCMU = 0,
  PCMA = 8,
  G722 = 9,
  Opus = 111,
  VP8 = 96,
  // VP8 = 97,
  VP9 = 98,
  H264 = 102
  // H264 = 96
}

export type Codec = "H264" | "VP8" | "VP9" | undefined;

function rtp(name: Codec): MediaAttributes["rtp"] {
  let array: MediaAttributes["rtp"] = [];
  switch (name) {
    case "H264":
      array = [
        {
          payload: PayloadType.H264,
          codec: "H264",
          rate: 90000
        }
      ];
      break;
    case "VP8":
      array = [
        {
          payload: PayloadType.VP8,
          codec: "VP8",
          rate: 90000
        }
      ];
      break;
    case "VP9":
      array = [
        {
          payload: PayloadType.VP9,
          codec: "VP9",
          rate: 90000
        }
      ];
      break;
    default:
      array = [];
      break;
  }
  return array;
}

export default class WebRTCTransport {
  private static config: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.stunprotocol.org:3478" }]
    // iceServers: [{ urls: "stun:120.238.78.214:3478" }]
  };

  static setDebug(debug: boolean) {
    log.setLevel(debug ? log.levels.DEBUG : log.levels.SILENT);
  }

  static setRTCConfiguration(config: RTCConfiguration) {
    WebRTCTransport.config = config;
  }

  private pc: RTCPeerConnection;
  private rtp: MediaAttributes["rtp"] | null;
  private timeout: number | undefined;
  constructor(codec?: Codec) {
    if (!WebRTCTransport.config) {
      throw new Error("RTConfiguration not set.");
    }
    this.pc = new RTCPeerConnection(WebRTCTransport.config);
    log.debug(this.pc);
    this.rtp = codec ? rtp(codec) : null;
  }

  getStats(cb: (value: RTCStatsReport) => void, time = 5000) {
    this.timeout = setTimeout(() => {
      // this.pc.getStats(null).then(v => {
      //   cb && cb(v);
      // });
      (this.pc as any).getStats(function(r) {
        cb && cb(r);
      });
      this.getStats(cb, time);
    }, time);
  }

  close() {
    this.timeout && clearTimeout(this.timeout);
    this.pc.ontrack = null;
    this.pc.onicecandidate = null;
    this.pc.onnegotiationneeded = null;
    this.pc.getSenders().forEach(sender => this.pc.removeTrack(sender));
    this.pc.close();
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream) {
    return this.pc.addTrack(track, stream);
  }

  addTransceiver(kind: string) {
    this.pc.addTransceiver(kind, { direction: "recvonly" });
  }

  removeTrack(sender: RTCRtpSender) {
    this.pc.removeTrack(sender);
  }

  getSenders(): RTCRtpSender[] {
    return this.pc.getSenders();
  }

  setLocalDescription(offer: RTCSessionDescriptionInit) {
    this.pc.setLocalDescription(offer);
  }

  setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    return this.pc.setRemoteDescription(desc);
  }

  async createOffer(
    options?: RTCOfferOptions
  ): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer(options);
    if (!this.rtp) return offer;

    const session = parse(offer.sdp!);
    log.debug(session);
    const videoIdx = session.media.findIndex(
      ({ type, ssrcGroups }) => type === "video" && !!ssrcGroups
    );
    if (videoIdx === -1) return offer;

    const { payload } = this.rtp[0];
    session.media[videoIdx].payloads = `${payload}`;
    session.media[videoIdx].rtp = this.rtp;

    const fmtp: any[] = [];
    session.media[videoIdx].fmtp = fmtp;

    const rtcpFB = [
      { payload, type: "transport-cc", subtype: undefined },
      { payload, type: "ccm", subtype: "fir" },
      { payload, type: "nack", subtype: undefined },
      { payload, type: "nack", subtype: "pli" }
    ];

    session.media[videoIdx].rtcpFb = rtcpFB;

    const ssrcGroup = session.media[videoIdx].ssrcGroups![0];
    const ssrcs = ssrcGroup.ssrcs;
    const ssrc = parseInt(ssrcs.split(" ")[0], 10);
    log.debug("ssrcs => %s, video %s", ssrcs, ssrc);

    session.media[videoIdx].ssrcGroups = [];
    session.media[videoIdx].ssrcs = session.media[videoIdx].ssrcs!.filter(
      item => item.id === ssrc
    );

    offer.sdp = write(session);
    return offer;
  }

  get localDescription(): RTCSessionDescription | null {
    return this.pc.localDescription;
  }

  set onicecandidate(cb: (ev: RTCPeerConnectionIceEvent) => any | null) {
    this.pc.onicecandidate = cb;
  }

  set onnegotiationneeded(cb: (ev: Event) => any | null) {
    this.pc.onnegotiationneeded = cb;
  }

  set ontrack(cb: (ev: RTCTrackEvent) => any | null) {
    this.pc.ontrack = cb;
  }
}
