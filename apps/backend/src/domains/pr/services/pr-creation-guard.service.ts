import type { User } from "../../../entities/user";
import {
  type CreatorIdentityInput,
  resolveAuthenticatedCreator,
  resolveDraftCreator,
} from "./creator-identity.service";

export type PRCreationAuthority = "USER" | "ADMIN" | "SYSTEM";

export async function resolvePRCreationCreator(input: {
  authority: PRCreationAuthority;
  identity: CreatorIdentityInput;
}): Promise<User | null> {
  switch (input.authority) {
    case "SYSTEM":
      return null;
    case "ADMIN":
      return resolveDraftCreator(input.identity);
    case "USER":
      return resolveAuthenticatedCreator(input.identity);
  }
}
