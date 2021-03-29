import log from "loglevel";
import { Peer, TrackInfo } from "protoo-client";
import WebRTCTransport, { Codec } from "./transport";

interface MediaDevicesPolyfill extends MediaDevices {
  getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
}

interface VideoResolutions {
  [name: string]: {
    width: { ideal: number };
    height: { ideal: number };
  };
}

export const VideoResolutions: VideoResolutions = {
  qvga: { width: { ideal: 320 }, height: { ideal: 180 } },
  vga: { width: { ideal: 640 }, height: { ideal: 360 } },
  shd: { width: { ideal: 960 }, height: { ideal: 540 } },
  hd: { width: { ideal: 1280 }, height: { ideal: 720 } },
  fhd: { width: { ideal: 1920 }, height: { ideal: 1080 } },
  qhd: { width: { ideal: 2560 }, height: { ideal: 1440 } }
};

export interface StreamOptions extends MediaStreamConstraints {
  resolution: string;
  bandwidth?: number;
  codec: string;
  description?: string;
  audio?: boolean;
  screen?: boolean;
}

export class Stream extends MediaStream {
  static dispatch: Peer;
  static setDispatch(dispatch: Peer) {
    Stream.dispatch = dispatch;
  }

  mid?: string;
  rid?: string;
  uid?: string;
  transport?: WebRTCTransport;

  static setDebug(debug: boolean) {
    log.setLevel(debug ? log.levels.DEBUG : log.levels.SILENT);
    WebRTCTransport.setDebug(debug);
  }

  get dispatch(): Peer {
    if (!Stream.dispatch) {
      throw new Error("Dispatch not set");
    }
    return Stream.dispatch;
  }
}

export class LocalStream extends Stream {
  static async getUserMedia(options: StreamOptions) {
    const {
      codec = "H264",
      resolution = "hd",
      bandwidth = 1024,
      audio = true,
      video = true,
      screen = false
    } = options;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: options.audio,
      video:
        options.video instanceof Object
          ? {
              ...VideoResolutions[options.resolution],
              ...options.video
            }
          : options.video
          ? VideoResolutions[options.resolution]
          : false
    });
    return new LocalStream(stream, {
      codec,
      resolution,
      bandwidth,
      audio,
      video,
      screen
    });
  }

  static async getDisplayMedia(options: StreamOptions) {
    const {
      codec = "H264",
      resolution = "hd",
      bandwidth = 1024,
      audio = false,
      video = false,
      screen = true
    } = options;
    const stream = await (navigator.mediaDevices as MediaDevicesPolyfill).getDisplayMedia(
      {
        video: true
      }
    );
    return new LocalStream(stream, {
      codec,
      resolution,
      bandwidth,
      audio,
      video,
      screen
    });
  }

  stream: MediaStream;
  options: StreamOptions;
  info?: any;
  constructor(stream: MediaStream, options: StreamOptions) {
    super(stream);
    this.options = options;
    this.stream = stream;
    Object.setPrototypeOf(this, LocalStream.prototype);
  }

  private getVideoConstraints() {
    return this.options.video instanceof Object
      ? {
          ...VideoResolutions[this.options.resolution],
          ...(this.options.video as object)
        }
      : { video: this.options.video };
  }

  async switchDevice(kind: "audio" | "video", deviceId: string) {
    this.options = {
      ...this.options,
      [kind]:
        this.options[kind] instanceof Object
          ? {
              ...(this.options[kind] as object),
              deviceId
            }
          : { deviceId }
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      [kind]:
        kind === "video"
          ? {
              ...this.getVideoConstraints(),
              deviceId
            }
          : { deviceId }
    });
    const track = stream.getTracks()[0];

    let prev: MediaStreamTrack;
    if (kind === "audio") {
      prev = this.getAudioTracks()[0];
    } else {
      prev = this.getVideoTracks()[0];
    }
    this.addTrack(track);
    this.removeTrack(prev);
    prev.stop();

    // If published, replace published track with track from new device
    if (this.transport) {
      this.transport.getSenders().forEach(async (sender: RTCRtpSender) => {
        if (sender?.track?.kind === track.kind) {
          sender.track?.stop();
          sender.replaceTrack(track);
        }
      });
    }
  }

  async mute(kind: "audio" | "video") {
    if (kind === "audio") {
      this.getAudioTracks()[0].enabled = false;
    } else if (kind === "video") {
      this.getVideoTracks()[0].enabled = false;
    }
  }

  async unmute(kind: "audio" | "video") {
    if (kind === "audio") {
      this.getAudioTracks()[0].enabled = true;
    } else if (kind === "video") {
      this.getVideoTracks()[0].enabled = true;
    }
  }

  async publish(rid: string, nid: string) {
    const {
      bandwidth = 1024,
      codec,
      description,
      audio = true,
      resolution = "hd",
      screen = false,
      video = true
    } = this.options;
    let sendOffer = true;
    this.transport = new WebRTCTransport(codec as Codec);

    this.stream.getTracks().map(track => {
      (this.transport as WebRTCTransport).addTrack(track, this.stream);
    });
    const offer = await this.transport.createOffer({
      offerToReceiveVideo: false,
      offerToReceiveAudio: false
    });
    log.debug("Created offer => %o", offer);
    this.transport.setLocalDescription(offer);

    this.transport.onnegotiationneeded = async () => {
      log.info("negotiation needed");
    };
    return new Promise(resolve => {
      this.transport!.onicecandidate = async () => {
        if (sendOffer) {
          sendOffer = false;
          const jsep = this.transport?.localDescription;
          log.debug(`Sending offer ${jsep}`);
          const result = await this.dispatch.request("publish", {
            rid,
            jsep,
            options: {
              codec,
              bandwidth: Number(bandwidth),
              description,
              audio,
              resolution,
              screen,
              video
            },
            nid
          });
          this.mid = result.mid;
          log.info(`publish success => result(mid: ${result!.mid})`);
          log.debug("Got answer => %o", result?.jsep);
          await this.transport?.setRemoteDescription(result?.jsep);
          this.rid = rid;
          resolve(result);
        }
      };
    });
  }

  async unpublish() {
    if (!this.rid || !this.mid) {
      throw new Error("Stream is not published.");
    }
    log.info("unpublish rid => %s, mid => %s", this.rid, this.mid);

    if (this.transport) {
      this.transport.close();
      delete this.transport;
    }
    return await this.dispatch
      .request("unpublish", {
        rid: this.rid,
        mid: this.mid
      })
      .then(() => {
        delete this.rid;
        delete this.mid;
      });
  }
}

export class RemoteStream extends Stream {
  constructor(stream: MediaStream) {
    super(stream);
    this.stream = stream;
    Object.setPrototypeOf(this, RemoteStream.prototype);
  }
  info?: any;
  stream?: MediaStream;
  static async getRemoteMedia(
    rid: string,
    mid: string,
    tracks: Map<string, TrackInfo[]>
  ) {
    const allTracks = Array.from(tracks.values()).flat();
    const audio = allTracks.some(t => t.type.toLowerCase() === "audio");
    const video = allTracks.some(t => t.type.toLowerCase() === "video");
    let sendOffer = true;
    log.debug("Creating receiver => %s", mid);
    const transport = new WebRTCTransport();
    if (audio) {
      transport.addTransceiver("audio");
    }
    if (video) {
      transport.addTransceiver("video");
    }
    const desc = await transport.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    log.debug("Created offer => %o", desc);
    transport.setLocalDescription(desc);
    transport.onicecandidate = async () => {
      if (sendOffer) {
        log.debug("Send offer");
        sendOffer = false;
        const jsep = transport.localDescription;
        const result = await this.dispatch.request("subscribe", {
          rid,
          jsep,
          mid
        });
        log.info(`subscribe success => result(mid: ${result!.mid})`);
        log.debug("Got answer => %o", result?.jsep);
        await transport.setRemoteDescription(result?.jsep);
      }
    };
    transport.onnegotiationneeded = () => {
      log.debug("negotiation needed");
    };
    const stream: MediaStream = await new Promise((resolve, reject) => {
      try {
        transport.ontrack = ({ track, streams }: RTCTrackEvent) => {
          log.debug("on track called");
          // once media for a remote track arrives, show it in the remote video element
          track.onunmute = () => {
            if (streams.length > 0) {
              resolve(streams[0]);
            } else {
              reject(new Error("Not enough streams"));
            }
          };
        };
      } catch (error) {
        log.error("subscribe request error => " + error);
        reject(error);
      }
    });

    const remote = new RemoteStream(stream);
    remote.stream = stream;
    remote.transport = transport;
    remote.mid = mid;
    remote.rid = rid;
    return remote;
  }

  close() {
    if (!this.transport) {
      throw new Error("Stream is not open.");
    }
    if (this.transport) {
      this.transport.close();
      delete this.transport;
    }
  }

  async unsubscribe() {
    if (!this.transport) {
      throw new Error("Stream is not subscribed.");
    }
    log.info("unsubscribe mid => %s", this.mid);
    this.close();
    return await this.dispatch.request("unsubscribe", { mid: this.mid });
  }
}
