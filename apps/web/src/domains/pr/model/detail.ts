import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

type CanonicalPRDetail = InferResponseType<(typeof client.api.pr)[":id"]["$get"]>;

export type PRDetail = CanonicalPRDetail;
