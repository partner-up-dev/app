import type { Page } from "playwright";

export type TencentLocationSuggestionFixture = {
  keyword: string;
  id: string;
  name: string;
  address: string;
  cityName: string;
  coordinate: {
    lat: number;
    lng: number;
  };
};

const buildTencentLocationPickerSdkScript = (
  fixtures: readonly TencentLocationSuggestionFixture[],
): string => {
  const serializedFixtures = JSON.stringify(fixtures).replaceAll("<", "\\u003c");
  return `
    (() => {
      const fixtures = ${serializedFixtures};

      class LatLng {
        constructor(lat, lng) {
          this.lat = lat;
          this.lng = lng;
        }

        getLat() {
          return this.lat;
        }

        getLng() {
          return this.lng;
        }
      }

      class TencentMapStub {
        constructor(_container, options) {
          this.center = options.center;
        }

        getCenter() {
          return this.center;
        }

        easeTo(status) {
          if (status.center) {
            this.center = status.center;
          }
          return this;
        }

        on() {
          return this;
        }

        off() {
          return this;
        }

        destroy() {}
      }

      class MarkerStyle {
        constructor(options) {
          this.options = options;
        }
      }

      class MultiMarker {
        constructor(options) {
          this.geometries = options.geometries;
        }

        setGeometries(geometries) {
          this.geometries = geometries;
          return this;
        }

        setMap() {
          return this;
        }
      }

      class Suggestion {
        async getSuggestions(input) {
          const fixture = fixtures.find(({ keyword }) => keyword === input.keyword);
          return {
            data: fixture
              ? [
                  {
                    id: fixture.id,
                    title: fixture.name,
                    address: fixture.address,
                    city: fixture.cityName,
                    location: fixture.coordinate,
                  },
                ]
              : [],
          };
        }
      }

      class Geocoder {
        async getAddress(input) {
          const coordinate = {
            lat: input.location.getLat(),
            lng: input.location.getLng(),
          };
          return {
            result: {
              address: "Scenario map address",
              formatted_addresses: { recommend: "Scenario map point" },
              address_component: { city: "上海市" },
              location: coordinate,
            },
          };
        }
      }

      window.TMap = {
        Map: TencentMapStub,
        LatLng,
        MarkerStyle,
        MultiMarker,
        service: { Suggestion, Geocoder },
      };
    })();
  `;
};

export async function installDeterministicTencentLocationPickerStub(
  page: Page,
  fixtures: readonly TencentLocationSuggestionFixture[],
): Promise<void> {
  const sdkScript = buildTencentLocationPickerSdkScript(fixtures);
  await page.route("https://map.qq.com/api/gljs**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript;charset=utf-8",
      body: sdkScript,
    });
  });
}
