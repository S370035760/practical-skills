"""Render an original synthetic teaching calculation, not an AI benchmark."""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
T = list(range(9))
A = [100 * 0.8**t for t in T]
B = [100 * 0.8**min(t, 4) for t in T]
assert all(math.isclose(A[t], B[t]) for t in range(5))
assert math.isclose(A[8], 16.777216)
assert math.isclose(B[8], 40.96)
assert math.isclose(B[8] - A[8], 24.182784)

navy, amber, ivory = "#081e3b", "#d98a00", "#fcf8ef"
image = Image.new("RGB", (1600, 1320), ivory)
draw = ImageDraw.Draw(image)
def font(size, bold=False):
    return ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf", size)
def label(x, y, value, size=28, color=navy, bold=False):
    draw.text((x, y), value, font=font(size, bold), fill=color)
def point(t, value):
    return (180 + t * 155, 900 - value * 5.6)
label(75, 55, "SAME OBSERVATIONS, DIFFERENT FUTURES", 51, bold=True)
label(75, 135, "Synthetic teaching data | not a real experiment or model evaluation", 28, "#555555")
draw.rectangle((180, 260, 800, 900), fill="#e5ebec")
draw.rectangle((800, 260, 1420, 900), fill="#fff0d0")
label(195, 205, "OBSERVED", 26, bold=True)
label(870, 205, "UNOBSERVED PROJECTIONS", 26, amber, True)
label(180, 270, "Remaining quantity (arbitrary units)", 24)
for value in range(0, 101, 20):
    y = point(0, value)[1]
    draw.line((180, y, 1420, y), fill="#c8ced0", width=1)
    label(112, y-16, str(value), 26)
for t in T:
    x = point(t, 0)[0]
    label(x-9, 915, str(t), 26)
draw.line((180, 320, 180, 900, 1450, 900), fill=navy, width=3)
label(1455, 910, "Hour", 26)
draw.line([point(t, A[t]) for t in T], fill=navy, width=6)
for t in range(8):
    p, q = point(t, B[t]), point(t+1, B[t+1])
    for k in range(0, 10, 2):
        a, b = k/10, (k+1)/10
        draw.line((p[0]+(q[0]-p[0])*a, p[1]+(q[1]-p[1])*a,
                   p[0]+(q[0]-p[0])*b, p[1]+(q[1]-p[1])*b), fill=amber, width=6)
for t in range(5):
    x,y = point(t,A[t])
    draw.ellipse((x-9,y-9,x+9,y+9), fill="#111111", outline=ivory, width=2)
label(1120, 620, "B(8) = 40.9600", 28, amber, True)
label(1120, 825, "A(8) = 16.7772", 28, navy, True)
label(180, 975, "A: keep 80% each hour", 28, navy, True)
label(700, 975, "B: processing stops after hour 4", 28, amber, True)
label(180, 1030, "OBSERVED: 100 / 80 / 64 / 51.2 / 40.96", 32, bold=True)
label(180, 1090, "Hour 8 gap: 24.1828", 42, amber, True)
label(180, 1160, "Missing evidence: does processing continue?", 32)
label(180, 1220, "A(t) = 100 x 0.8^t   |   B(t) = 100 x 0.8^min(t, 4)", 27, "#555555")
out = ROOT / "assets" / "img2.png"
out.parent.mkdir(exist_ok=True)
image.save(out)
print(json.dumps({"image": str(out), "observed_points": 5, "future_observations": 0,
                  "A8": A[8], "B8": B[8], "gap": B[8] - A[8],
                  "assertions": "passed", "synthetic": True}))
