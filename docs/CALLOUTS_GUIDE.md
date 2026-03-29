# Callout Annotations Guide

Callouts highlight specific regions on your slides with a golden rectangle and label pill. They're great for drawing attention to buttons, metrics, or features in real screenshots.

## When to use callouts

Callouts work best with **real screenshots** where you know the exact pixel positions of UI elements. They don't work well with generated or placeholder slides because the coordinates won't match.

## callouts.json format

Create a `callouts.json` file in your project directory:

```json
[
  {
    "slide": 2,
    "label": "Click here",
    "x": 350,
    "y": 180,
    "w": 200,
    "h": 45
  },
  {
    "slide": 5,
    "label": "New feature",
    "x": 800,
    "y": 300,
    "w": 400,
    "h": 200
  }
]
```

| Field | Description |
|-------|-------------|
| `slide` | Slide index (0-based: slide-00.png = 0, slide-01.png = 1) |
| `label` | Text shown in the label pill above the highlight |
| `x, y` | Top-left corner of the highlight rectangle (pixels from top-left) |
| `w, h` | Width and height of the highlight rectangle |

## How to find the right coordinates

### Method 1: Browser DevTools (easiest)

1. Open your slide PNG in the browser
2. Open DevTools (F12)
3. Hover over the element you want to highlight
4. Note the pixel coordinates from the element inspector
5. Or use the "Select element" tool and read x/y from the tooltip

### Method 2: Image editor

1. Open the slide in Preview (macOS), Paint (Windows), or GIMP
2. Hover over the target area
3. Read the pixel coordinates from the status bar
4. Note the width/height by dragging a selection

### Method 3: Playwright coordinates (precise)

If you're capturing slides with Playwright, you can extract element bounding boxes directly:

```javascript
// In your capture-slides.cjs
const element = await page.locator('.my-button');
const box = await element.boundingBox();

console.log(JSON.stringify({
  slide: 3,
  label: 'My Button',
  x: Math.round(box.x),
  y: Math.round(box.y),
  w: Math.round(box.width),
  h: Math.round(box.height),
}));
```

This gives you exact pixel coordinates that match your captured slides perfectly.

### Method 4: Interactive finder script

Save this as `find-coords.html`, open it, and drag your slide PNG onto it:

```html
<!DOCTYPE html>
<html>
<body style="margin:0;background:#111;color:#fff;font-family:monospace">
  <p style="padding:10px">Drop a slide PNG here, then click and drag to select a region</p>
  <canvas id="c" style="cursor:crosshair"></canvas>
  <pre id="out" style="padding:10px;color:#38bdf8"></pre>
  <script>
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    let img, sx, sy, dragging = false;

    document.body.addEventListener('dragover', e => e.preventDefault());
    document.body.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = URL.createObjectURL(file);
    });

    canvas.addEventListener('mousedown', e => {
      sx = e.offsetX; sy = e.offsetY; dragging = true;
    });
    canvas.addEventListener('mousemove', e => {
      if (!dragging || !img) return;
      ctx.drawImage(img, 0, 0);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, e.offsetX - sx, e.offsetY - sy);
    });
    canvas.addEventListener('mouseup', e => {
      dragging = false;
      const x = Math.min(sx, e.offsetX), y = Math.min(sy, e.offsetY);
      const w = Math.abs(e.offsetX - sx), h = Math.abs(e.offsetY - sy);
      document.getElementById('out').textContent = JSON.stringify(
        { slide: 0, label: "TODO", x, y, w, h }, null, 2
      );
    });
  </script>
</body>
</html>
```

## Customising annotation style

Add `annotation_style` to your `demo.yaml`:

```yaml
annotation_style:
  highlight_colour: "rgba(255,220,0,0.35)"
  border_colour: "#FFD700"
  border_width: 2.5
  border_radius: 6
  label_bg: "#FFD700"
  label_text: "#1a1a1a"
  label_font: "bold 13px sans-serif"
  label_height: 30
  label_padding: 10
```

## QA checks for callouts

The QA framework validates callouts automatically:

- Callout coordinates are within slide dimensions
- Callout labels don't overlap the top-left title area (x < 200, y < 60)
- Referenced slides exist

Run `s2v qa` to check before building.
