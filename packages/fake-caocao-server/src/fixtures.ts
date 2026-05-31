export type FakeCaocaoFixture = {
  clientId: string;
  signKey: string;
};

export function createFakeCaocaoFixture(): FakeCaocaoFixture {
  return {
    clientId: "fake-caocao-client",
    signKey: "fake-caocao-sign-key",
  };
}
