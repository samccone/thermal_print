export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;

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

export async function sendText(device: USBDevice, str: string) {
  const bytes = new Uint8Array(stringToBytes(str));
  await device.transferOut(1, bytes);
}

export async function sendBytes(device: USBDevice, bytes: Uint8Array) {
  return await device.transferOut(1, bytes);
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

export async function printImage(device: USBDevice, imageData: number[][]) {
  await setLineSpacing(device, 8);
  for (let y = 0; y < imageData.length; y += 8) {
    await sendBytes(
      device,
      new Uint8Array([
        ESC,
        0x2a,
        0, // m
        0xff & imageData[y].length, // nL
        (0xff00 & imageData[y].length) >> 8 // nH,
      ])
    );
    await sendBytes(device, verticalSliceImage(imageData, y));
    await sendBytes(device, new Uint8Array([LF]));
  }

  await setLineSpacing(device, 30);
}

export function verticalSliceImage(img: number[][], yOffset: number = 0) {
  const ret = new Uint8Array(img[yOffset].length).fill(0);

  for (let x = 0; x < img[yOffset].length; x++) {
    for (let y = yOffset; y < yOffset + 8 && img[y] != null; y++) {
      ret[x] |= img[y][x] ? 1 << (7 - (y - yOffset)) : 0;
    }
  }

  return ret;
}
