// gateway 收口身份后, 用此 header 把已解析 email 传给下游 (下游荣誉制信任).
// 下游 (ele-autopilot / ele-autotesting) 读同名 header, 必须与它们保持一致.
export const AUTH_HEADER = "X-Auth-User-Email";
