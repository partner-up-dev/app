export const imageUploadPurposes = ["poster", "poi", "feedback"] as const;

export type ImageUploadPurpose = (typeof imageUploadPurposes)[number];
