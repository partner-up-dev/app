import { describe, expect, test } from "vitest";
import {
  normalizeTencentReverseGeocodePayload,
  normalizeTencentSuggestionPayload,
} from "./tencent-location-picker-provider";

describe("Tencent location picker provider payload normalization", () => {
  test("maps suggestion payload candidates into mobile list candidates", () => {
    expect(
      normalizeTencentSuggestionPayload({
        data: [
          {
            id: "poi-1",
            title: "广州塔",
            address: "广州市海珠区阅江西路222号",
            city: "广州市",
            location: {
              lat: 23.10647,
              lng: 113.32446,
            },
          },
          {
            title: "invalid without location",
          },
        ],
      }),
    ).toEqual([
      {
        id: "poi-1",
        name: "广州塔",
        address: "广州市海珠区阅江西路222号",
        cityName: "广州市",
        coordinate: {
          lat: 23.10647,
          lng: 113.32446,
        },
      },
    ]);
  });

  test("maps reverse geocoder payload into an editable picked-location draft", () => {
    expect(
      normalizeTencentReverseGeocodePayload(
        {
          result: {
            address: "北京市海淀区新建宫门路19号",
            formatted_addresses: {
              recommend: "颐和园",
            },
            address_component: {
              city: "北京市",
            },
            pois: [
              {
                title: "颐和园东宫门",
              },
            ],
          },
        },
        {
          lat: 39.998766,
          lng: 116.273938,
        },
      ),
    ).toEqual({
      name: "颐和园东宫门",
      address: "北京市海淀区新建宫门路19号",
      cityName: "北京市",
      coordinate: {
        lat: 39.998766,
        lng: 116.273938,
      },
    });
  });
});
