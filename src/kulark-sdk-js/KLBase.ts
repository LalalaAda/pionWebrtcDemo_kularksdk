// 回调信令连接事件
export const SOCKET_EVENT = 1000;
// 引擎对象出错回调
export const ENGINE_ERROR = 1010;

// 加入会议
export const MEET_JOIN = 2001;
// 离开会议
export const MEET_LEAVE = 2002;
// 获取会议成员列表
export const MEET_GET_LIST = 2010;
// 通知消息
export const MEET_NOTIFY = 2020;

// 事件码
export const MEET_OK = 0;
export const MEET_FAIL = 1;
export const MEET_ERROR = 2;

// json格式(rid, uid, info)
export const MEET_PEER_JOIN = 1000;
// json格式(rid, uid)
export const MEET_PEER_LEAVE = 1001;
// json格式(rid, uid, mid)
export const MEET_STREAM_ADD = 1002;
// json格式(rid, mid)
export const MEET_STREAM_REMOVE = 1003;

// json格式(rid, uid)
export const NOTIFY_MUTE_ONE = 1010;
export const NOTIFY_MUTE_ALL = 1011;
// json格式(rid, uid)
export const NOTIFY_CAMERA_ONE = 1012;
export const NOTIFY_CAMERA_ALL = 1013;
// json格式(rid, uid)
export const NOTIFY_RECV_MSG_ONE = 1014;
export const NOTIFY_RECV_MSG_ALL = 1015;
// json格式(rid, uid)
export const NOTIFY_SWITCH_HOST = 1020;
export const NOTIFY_PEER_KICK = 1021;
// json格式
export const NOTIFY_MUTE_HOST = 1030;
export const NOTIFY_CAMERA_HOST = 1031;
export const NOTIFY_END_MEETING = 1032;
// json格式(uid)

export const NOTIFY_AUDIO_LEVEL = 1040;
export const NOTIFY_START_SHARE_SCREEN = 1042;

// 信令服务器地址
export const SERVER_IP = "120.238.78.214";
export const SERVER_PORT = 9443;
// 转发服务器地址
export const RELAY_SERVER_IP = "115.231.90.179";

// 是否屏幕共享(解决屏幕拉伸问题)
export const MEET_SCREEN_SHARE = false;

// Track参数
export const VIDEO_TRACK_ID = "ARDAMSv0";
export const AUDIO_TRACK_ID = "ARDAMSa0";
export const VIDEO_TRACK_TYPE = "video";
// 视频VP8编码参数
export const VIDEO_VP8_INTEL_HW_ENCODER_FIELDTRIAL = "WebRTC-IntelVP8/Enabled/";
export const VIDEO_FLEXFEC_FIELDTRIAL =
  "WebRTC-FlexFEC-03-Advertised/Enabled/WebRTC-FlexFEC-03/Enabled/";
// 音频前处理算法参数
export const AUDIO_ECHO_CANCELLATION_CONSTRAINT = "googEchoCancellation";
export const A1UDIO_AUTO_GAIN_CONTROL_CONSTRAINT = "googAutoGainControl";
export const AUDIO_HIGH_PASS_FILTER_CONSTRAINT = "googHighpassFilter";
export const AUDIO_NOISE_SUPPRESSION_CONSTRAINT = "googNoiseSuppression";
