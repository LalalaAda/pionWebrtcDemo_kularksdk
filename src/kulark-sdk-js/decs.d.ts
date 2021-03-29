declare module "protoo-client" {
  import http = require("http");

  interface ProtooOptions {
    origin?: string;
    headers?: http.OutgoingHttpHeaders;
    requestOptions?: object;
  }
  export class WebSocketTransport {
    constructor(url: string, options?: ProtooOptions);
  }

  export class Peer {
    connected: boolean;
    closed: boolean;
    constructor(transport: WebSocketTransport);
    close(): void;
    request(method: string, data: {}): Promise<Response>;
    on(event: "open", cb: () => void): void;
    on(event: "disconnected", cb: () => void): void;
    on(event: "close", cb: () => void): void;
    on(event: any, cb: (any: any) => any): void;
    // on(event: "request", cb: (request: Request) => void): void;
    // on(event: "notification", cb: (notification: Notification) => void): void;
  }

  export interface TrackInfo {
    id?: string;
    ssrc?: number;
    pt?: number;
    type: string;
    codec?: string;
    fmtp?: string;
  }

  export interface Notification {
    method: string;
    data: {
      rid: string;
      mid?: string;
      uid: string;
      info?: any;
      tracks?: { [name: string]: TrackInfo };
      description?: string;
    };
  }

  export interface Request {
    request: boolean;
    id: number;
    method: string;
    data: any;
  }

  export interface Response {
    response: boolean;
    id: number;
    ok: boolean;
    data: any;
    errorCode?: number;
    errorReason?: string;
    jsep: any;
    mid: any;
  }
}
