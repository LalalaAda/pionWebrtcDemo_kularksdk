import { EventEmitter } from "events";
import {
  Peer,
  Request,
  WebSocketTransport,
  ProtooOptions,
  Notification,
  TrackInfo
} from "protoo-client";
import { v4 as uuidv4 } from "uuid";
import log from "loglevel";
import { LocalStream, RemoteStream, Stream, StreamOptions } from "./stream";
import WebRTCTransport from "./transport";

// utils funcs
function obj2StrMap(obj: any) {
  const strMap = new Map();
  for (const k of Object.keys(obj)) {
    strMap.set(k, obj[k]);
  }
  return strMap;
}

interface Config {
  url: string;
  uid?: string;
  options?: ProtooOptions;
  rtc?: RTCConfiguration;
  nid?: string;
  debug?: boolean;
}

export default class Client extends EventEmitter {
  dispatch: Peer;
  uid: string;
  rid: string | undefined;
  nid: string;
  localStreams: LocalStream[];
  streams: { [name: string]: RemoteStream };
  KnownStreams: Map<string, Map<string, TrackInfo[]>>;

  constructor(config: Config) {
    super();
    const uid = config.uid ? config.uid : uuidv4();

    if (!config || !config.url) {
      throw new Error("Undefined config or config.url in kulark-sdk.");
    }
    // const url = new URL(config.url);
    // url.searchParams.append('peer', uid);

    log.setLevel(config.debug ? log.levels.DEBUG : log.levels.SILENT);
    Stream.setDebug(config.debug ? true : false);
    WebRTCTransport.setDebug(config.debug ? true : false);

    const transport = new WebSocketTransport(
      `${config.url}/ws?peer=${uid}`,
      config.options
    );
    this.nid = config.nid ? config.nid : "";

    this.KnownStreams = new Map();
    this.uid = uid;
    this.streams = {};
    this.localStreams = [];
    this.dispatch = new Peer(transport);

    if (config.rtc) {
      WebRTCTransport.setRTCConfiguration(config.rtc);
    }
    Stream.setDispatch(this.dispatch);

    this.dispatch.on("open", () => {
      log.info('Peer "open" event');
      this.emit("transport-open");
    });

    this.dispatch.on("disconnected", () => {
      log.info('Peer "disconnected" event');
      this.emit("transport-failed");
    });

    this.dispatch.on("close", () => {
      log.info('Peer "close" event');
      this.emit("transport-closed");
    });

    this.dispatch.on("request", this.onRequest);
    this.dispatch.on("notification", this.onNotification);
  }

  onRequest = (request: Request) => {
    log.debug(
      "Handle request from server: [method:%s, data:%o]",
      request.method,
      request.data
    );
  };
  onNotification = (notification: Notification) => {
    const { method, data } = notification;
    // log.info(
    //   "Handle notification from server: [method:%s, data:%o]",
    //   method,
    //   data
    // );
    switch (method) {
      case "peer-join": {
        const { uid, info } = data;
        this.emit("peer-join", uid, info);
        break;
      }
      case "peer-leave": {
        const { uid } = data;
        this.emit("peer-leave", uid);
        break;
      }
      case "stream-add": {
        const { mid, tracks } = data;
        const info = data.info;
        const uid = data.uid;
        info && (info.tracks = tracks);
        if (mid) {
          const trackMap: Map<string, TrackInfo[]> = obj2StrMap(tracks);
          this.KnownStreams.set(mid, trackMap);
        }
        this.emit("stream-add", mid, uid, info);
        break;
      }
      case "stream-remove": {
        const { mid } = data;
        const stream = this.streams[mid!];
        this.emit("stream-remove", stream);
        stream.close();
        break;
      }
      case "broadcast": {
        const { uid, info } = data;
        this.emit("broadcast", uid, info);
        break;
      }
    }
  };

  broadcast(info: any) {
    return this.dispatch.request("broadcast", {
      rid: this.rid,
      uid: this.uid,
      info
    });
  }

  sendInfo(method: string, info: any) {
    return this.dispatch.request(method, info);
  }

  getConnectStatus() {
    log.debug(this.dispatch.connected);
    return this.dispatch.connected;
  }

  async createLocalStream(settings?: StreamOptions): Promise<LocalStream> {
    const localStream = await LocalStream.getUserMedia({
      codec: settings?.codec.toUpperCase() || "H264",
      resolution: settings?.resolution || "hd",
      bandwidth: settings?.bandwidth || undefined,
      audio: true,
      video: true,
      screen: false
    });
    return localStream;
  }
  async startScreenShare(settings: StreamOptions) {
    this.createLocalScreenStream(settings);
  }
  async stopScreenShare(stream: LocalStream | string) {
    if (stream && typeof stream === "object") {
      await stream.unpublish();
      stream = "";
    }
  }
  async createLocalScreenStream(
    settings?: StreamOptions
  ): Promise<LocalStream> {
    const localScreen = await LocalStream.getDisplayMedia({
      codec: settings?.codec.toUpperCase() || "H264",
      resolution: settings?.resolution || "hd",
      bandwidth: settings?.bandwidth || undefined,
      audio: false,
      video: false,
      screen: true
    });
    return localScreen;
  }
  async createCustomStream(
    stream: MediaStream,
    settings?: StreamOptions
  ): Promise<LocalStream> {
    return new LocalStream(stream, {
      codec: settings?.codec.toUpperCase() || "H264",
      resolution: settings?.resolution || "hd",
      bandwidth: settings?.bandwidth || undefined,
      audio: settings?.audio || false,
      video: settings?.video || false,
      screen: settings?.screen || true
    })
  }

  async join(rid: string, info = { name: "Guest" }) {
    let result = false;
    this.rid = rid;
    try {
      const data = await this.dispatch.request("join", {
        rid: this.rid,
        uid: this.uid,
        info
      });
      result = true;
      log.info("join success: result => " + JSON.stringify(data));
    } catch (error) {
      result = false;
      log.error("join reject: error => " + error);
    }
    return result;
  }

  async publish(stream: LocalStream) {
    if (!this.rid) {
      throw new Error("You must join a room before publishing.");
    }
    this.localStreams?.push(stream);
    return await stream.publish(this.rid, this.nid);
  }

  async unpublish(stream: LocalStream) {
    if (!stream) {
      throw new Error("Undefined LocalStream in unpublish.");
    }
    this.localStreams = this.localStreams.filter(
      localStream => localStream !== stream
    );
    return await stream.unpublish();
  }

  async subscribe(mid: string): Promise<RemoteStream> {
    if (!this.rid) {
      throw new Error("You must join a room before subscribing.");
    }
    const tracks = this.KnownStreams.get(mid);
    if (!tracks) {
      throw new Error("Subscribe mid is not known.");
    }
    const stream = await RemoteStream.getRemoteMedia(this.rid, mid, tracks);
    this.streams[mid] = stream;
    return stream;
  }

  async leave() {
    let result = false;
    try {
      await Promise.all(
        this.localStreams.map(async localStream => {
          if (localStream.mid) {
            await localStream.unpublish();
          }
        })
      );
      await Promise.all(
        Object.values(this.streams).map(
          async stream => await stream.unsubscribe()
        )
      );
      result = true;
    } catch (error) {
      result = false;
      log.error("leave reject: error =>" + error);
    } finally {
      const data = await this.dispatch.request("leave", {
        rid: this.rid,
        uid: this.uid
      });
      this.localStreams = [];
      this.KnownStreams.clear();
      log.info("leave success: result => " + JSON.stringify(data));
    }
    return result;
  }

  close() {
    log.debug(`peer-close: ${this.dispatch.closed}`);
    if (!this.dispatch.closed) {
      this.dispatch.close();
    }
  }
}
