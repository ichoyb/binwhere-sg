import type { CameraRef, MapRef, ViewState } from '@maplibre/maplibre-react-native';
import { mapAssets } from './assets';
import { neighborhoodMinZoom } from './style';

export type MapCameraTarget = Pick<ViewState, 'center' | 'zoom' | 'pitch' | 'bearing'>;

export function islandCamera(width: number, height: number): MapCameraTarget {
  return {
    center: [103.845, 1.32],
    zoom: Math.max(mapAssets.minZoom, Math.min(
      Math.log2((width - 48) * 360 / (512 * 0.51)),
      Math.log2((height - 240) * 360 / (512 * 0.34)),
    )),
    pitch: 25,
    bearing: 0,
  };
}

export function destinationCamera(
  destination: [number, number],
  user: [number, number] | null,
  width: number,
  height: number,
  cardHeight: number,
  topInset: number,
): MapCameraTarget {
  const mercatorY = (lat: number) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2;
  const targetX = (destination[0] + 180) / 360;
  const targetY = mercatorY(destination[1]);
  let centerX = targetX;
  let centerY = targetY;
  let zoom = 16.8;
  if (user) {
    const userX = (user[0] + 180) / 360;
    const userY = mercatorY(user[1]);
    const fitZoom = Math.min(
      Math.log2((width - 112) / (512 * Math.abs(userX - targetX))),
      Math.log2((height - cardHeight - topInset - 144) / (512 * Math.abs(userY - targetY))),
    );
    if (fitZoom >= neighborhoodMinZoom) {
      zoom = Math.min(zoom, fitZoom);
      centerX = (targetX + userX) / 2;
      centerY = (targetY + userY) / 2;
    }
  }
  const pitch = 55;
  const radians = pitch * Math.PI / 180;
  const screenOffset = (topInset - cardHeight) / 2;
  const groundOffset = screenOffset / (Math.cos(radians) - screenOffset * Math.sin(radians) / (height * 1.5));
  centerY -= groundOffset / (512 * 2 ** zoom);
  return {
    center: [centerX * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * centerY))) * 180 / Math.PI],
    zoom,
    pitch,
    bearing: 0,
  };
}

export function cameraCommand(target: MapCameraTarget, oldPitch: number): MapCameraTarget {
  return {
    ...target,
    zoom: target.zoom + Math.log2(
      Math.cos(oldPitch * Math.PI / 180) / Math.cos(target.pitch * Math.PI / 180),
    ),
    bearing: ((target.bearing % 360) + 360) % 360,
  };
}

export function createMapCamera(
  map: Pick<MapRef, 'getViewState'>,
  camera: Pick<CameraRef, 'flyTo' | 'jumpTo'>,
) {
  return {
    read: () => map.getViewState(),
    async flyTo(target: MapCameraTarget, duration: number) {
      const current = await map.getViewState();
      camera.flyTo({ ...cameraCommand(target, current.pitch), duration });
    },
    async jumpTo(target: MapCameraTarget) {
      const current = await map.getViewState();
      camera.jumpTo(cameraCommand(target, current.pitch));
    },
  };
}
