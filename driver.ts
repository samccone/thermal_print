export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;
enum PrintModes {
  EIGHT_DOT_DENSITY = 0,
  TWENTY_FOUR_DOT_DENSITY = 33,
}


export async function setLineSpacing(device: USBDevice, dotSpacing: number) {
  await sendBytes(device, new Uint8Array([ESC, 0x33, dotSpacing]));
}

function charToByte(char: string) {
  return String.prototype.charCodeAt.call(char);
}

function stringToBytes(str: string) {
  return Array.from(str).reduce(
    (prev, char) => {
      prev.push(charToByte(char));
      return prev;
    },
    [] as number[]
  );
}

export async function reset(device: USBDevice) {
  await sendBytes(device, new Uint8Array([ESC, 0x40]));
}

export async function reverse(
  device: USBDevice,
  { enabled }: { enabled: 1 | 0 } = { enabled: 1 }
) {
  await sendText(device, "\x1DB" + enabled);
}

/**
 * Select an endpoint from the currently selected device configuration by name
 * 
 * @param name usually 'out' or 'in'
 * @param device the connected USBDevice
 */
function selectEndpoint(name: string, device: USBDevice) {
  const endpoint = device.configuration
    .interfaces[0]
    .alternate
    .endpoints.filter(ep => ep.direction == name)
    .shift()

  if (endpoint == null)
    throw new Error(`Endpoint ${name} not found in device interface.`)
  return endpoint
}

export async function sendText(device: USBDevice, str: string) {
  const bytes = new Uint8Array(stringToBytes(str));
  const endpoint = selectEndpoint('out', device)
  device.transferOut(endpoint.endpointNumber, bytes);
}

export async function sendBytes(device: USBDevice, bytes: Uint8Array) {
  const endpoint = selectEndpoint('out', device)
  return device.transferOut(endpoint.endpointNumber, bytes);
}

export async function setCharacterStyle(
  device: USBDevice,
  style: {
    smallFont?: boolean;
    emphasized?: boolean;
    doubleHeight?: boolean;
    doubleWidth?: boolean;
    underline?: boolean;
  } = {}
) {
  let v = 0;

  if (style.smallFont) {
    v |= 1 << 0;
  }

  if (style.emphasized) {
    v |= 1 << 3;
  }

  if (style.doubleHeight) {
    v |= 1 << 4;
  }

  if (style.doubleWidth) {
    v |= 1 << 5;
  }

  if (style.underline) {
    v |= 1 << 7;
  }

  await sendBytes(device, new Uint8Array([ESC, 0x21, v]));
}

export async function printImage(device: USBDevice, imageData: number[][], dpi: 8|24) {
  await setLineSpacing(device, dpi);
  const imageWidth = imageData[0].length;
  const mode = dpi === 8 ? PrintModes.EIGHT_DOT_DENSITY : PrintModes.TWENTY_FOUR_DOT_DENSITY;

  if (imageData.length % dpi != 0) {
    throw new Error(`Image height must be divisible by ${dpi} currently is ${imageData.length}`);
  }

  for (let y = 0; y < imageData.length; y += dpi) {
    await sendBytes(
      device,
      new Uint8Array([
        ESC,
        0x2a,
        mode,
        (0x00ff & imageWidth), // nL low byte,
        (0xff00 & imageWidth) >> 8, // nH height byte
      ])
    );

    await sendBytes(device, verticalSliceImage(imageData, imageWidth, y, dpi));
    await sendBytes(device, new Uint8Array([LF]));
  }

  await setLineSpacing(device, 30);
}

export function verticalSliceImage(img: number[][], imageWidth: number, yOffset: number = 0, dpi: 8|24) {
  const bytesPerSlice = dpi/8;
  const ret = new Uint8Array(imageWidth * bytesPerSlice).fill(0);


  for (let x = 0; x < imageWidth; x++) {
    for (let byte = 0; byte < bytesPerSlice; byte++) {
      for (let y = byte * 8 + yOffset; y < byte * 8 + 8 + yOffset; y++) {
        const setBitValue = 1 << (7 - y % 8)
        ret[x * bytesPerSlice + byte] |= img[y][x] ? setBitValue : 0;
      }
    }
  }
  return ret;
}
