export function canvasDraw(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  let pointerDown = false;
  canvas.onpointerdown = e => {
    pointerDown = true;
  };

  canvas.onpointerup = e => {
    pointerDown = false;
  };

  canvas.onpointermove = async e => {
    if (pointerDown === false) {
      return;
    }
    ctx.fillStyle = "black";
    ctx.fillRect(e.layerX, e.layerY, 5, 5);
  };
}
