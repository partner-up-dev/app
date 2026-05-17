import { describe, expect, test } from "vitest";
import {
  buildTencentLocationPickerUrl,
  mapTencentLocationPickerPayload,
  parsePickedLocation,
  serializePickedLocation,
} from "./location-picker";

describe("location picker helpers", () => {
  test("buildTencentLocationPickerUrl creates iframe URL with locpicker params", () => {
    const url = new URL(
      buildTencentLocationPickerUrl({
        key: "test-key",
        referer: "partner-up-test",
        initialCoordinate: [23.10647, 113.32446],
      }),
    );

    expect(url.origin).toBe("https://apis.map.qq.com");
    expect(url.pathname).toBe("/tools/locpicker");
    expect(url.searchParams.get("type")).toBe("1");
    expect(url.searchParams.get("search")).toBe("1");
    expect(url.searchParams.get("mapdraggable")).toBe("1");
    expect(url.searchParams.get("coord")).toBeNull();
    expect(url.searchParams.get("coordtype")).toBeNull();
  });

  test("buildTencentLocationPickerUrl leaves initial coordinate in the local draft only", () => {
    expect(
      buildTencentLocationPickerUrl({
        key: "test-key",
        referer: "partner-up-test",
        initialCoordinate: [23.12908, 113.26436],
      }),
    ).toBe(
      "https://apis.map.qq.com/tools/locpicker?type=1&search=1&mapdraggable=1&key=test-key&referer=partner-up-test",
    );
  });

  test("mapTencentLocationPickerPayload maps Tencent callback into PickedLocation", () => {
    expect(
      mapTencentLocationPickerPayload({
        module: "locationPicker",
        latlng: {
          lat: 39.998766,
          lng: 116.273938,
        },
        poiaddress: "北京市海淀区新建宫门路19号",
        poiname: "颐和园",
        cityname: "北京市",
      }),
    ).toEqual({
      name: "颐和园",
      address: "北京市海淀区新建宫门路19号",
      cityName: "北京市",
      gcj02: [39.998766, 116.273938],
    });

    expect(mapTencentLocationPickerPayload({ module: "other" })).toBeNull();
  });

  test("picked location serialization keeps a validated payload", () => {
    const serialized = serializePickedLocation({
      name: "广州塔",
      address: null,
      cityName: "广州市",
      gcj02: [23.10647, 113.32446],
    });

    expect(parsePickedLocation(serialized)).toEqual({
      name: "广州塔",
      address: null,
      cityName: "广州市",
      gcj02: [23.10647, 113.32446],
    });
    expect(parsePickedLocation("{}")).toBeNull();
  });
});
