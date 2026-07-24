import { UserRepository } from "../../../repositories/UserRepository";
import type { FillMissingWeChatProfileFieldsInput } from "../contracts";

const userRepo = new UserRepository();

export async function fillMissingWeChatProfileFields(
  input: FillMissingWeChatProfileFieldsInput,
): Promise<void> {
  await userRepo.updateWeChatProfileFieldsIfMissing(input);
}
