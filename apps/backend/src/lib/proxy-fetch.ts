// Uses when the target service has IP whitelist.
import { fetch, ProxyAgent } from "undici";
import { env } from "./env";

const proxyDispatcher = env.FIXED_IP_HTTP_PROXY
  ? new ProxyAgent(env.FIXED_IP_HTTP_PROXY)
  : undefined;

export const proxyFetch = (
  url: URL,
  init?: Parameters<typeof fetch>[1],
): ReturnType<typeof fetch> =>
  proxyDispatcher ? fetch(url, { ...init, dispatcher: proxyDispatcher }) : fetch(url, init);
