import { reset, setCharacterStyle, printImage } from "../driver";
import { canvasDraw } from "./canvas_draw";

const canvas = document.querySelector("canvas") as HTMLCanvasElement;
canvasDraw(canvas);

document.querySelector("#auth")!.addEventListener("click", e => {
  navigator.usb
    .requestDevice({
      filters: []
    })
    .then(async device => {
      (window as any)["device"] = device;
      await claimInterface(device);
    });
});

async function claimInterface(device: USBDevice) {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      if (!iface.claimed) {
        await device.claimInterface(iface.interfaceNumber);
        return true;
      }
    }
  }

  return false;
}

(async () => {
  const devices = await navigator.usb.getDevices();
  if (devices.length) {
    if (devices[0].opened === false) {
      await devices[0].open();
    }

    const d = devices[0];

    await claimInterface(d);
    await reset(d);
    await setCharacterStyle(d, {
      smallFont: false,
      emphasized: false,
      underline: false,
      doubleWidth: false,
      doubleHeight: false
    });

    document.querySelector("#print")!.addEventListener("click", async e => {
      const ctx = canvas.getContext("2d")!;
      const imageData: number[][] = [];
      const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < canvas.height; y++) {
        imageData.push([]);
        for (let x = 0; x < canvas.width; x++) {
          imageData[y][x] =
            canvasData.data[y * (canvas.width * 4) + x * 4 + 3] === 0 ? 0 : 1;
        }
      }

      await printImage(d, imageData, 24);
    });
  }
})();
