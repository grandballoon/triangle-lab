// Conversion factors. An inch scale and a centimetre scale lined up show
// that converting units is direct variation; 2.54 cm / 1 in is a fraction
// equal to 1, so multiplying by it changes units and not amounts; turned
// over it converts back, factors chain, and areas need the factor squared.

import { C, tint } from "../draw.ts";
import { clamp, type Vec } from "../geo.ts";
import { box, scale, texNum } from "../kit/proportions.ts";
import { lesson, type Readout } from "../scene.ts";
import floorSquareYardsImage from "../../images/floor-square-yards.svg";
import fuelEconomyConvertImage from "../../images/fuel-economy-convert.svg";

const CM_PER_IN = 2.54;
/** Stage units per centimetre. */
const PER_CM = 2;
const X0 = -6.5;
const INCH_Y = -1.2;
const CM_Y = -2.4;
const METRE_Y = -3.6;
const INCH = C.cyan;
const CM = C.pink;
const METRE = C.violet;
const MARK = C.gold;

/** The marker on the inch scale, at a quarter inch from 0 to 2½. */
const onInches = (p: Vec): Vec => ({ x: X0 + clamp(Math.round(((p.x - X0) / (PER_CM * CM_PER_IN)) * 4) / 4, 0, 2.5) * PER_CM * CM_PER_IN, y: INCH_Y });

const cancel = (unit: string): string => `\\cancel{\\text{${unit}}}`;

export default lesson((s) => {
  const marker = s.point(X0 + 1.5 * PER_CM * CM_PER_IN, INCH_Y, { label: "x", color: MARK, constrain: onInches });
  const inches = (): number => (marker.x - X0) / (PER_CM * CM_PER_IN);

  return {
    steps: [
      {
        title: "Two scales, one length",
        text: "The top scale counts inches and the bottom one centimetres, lined up so they measure the same lengths. Drag the marker: the reading in centimetres is always 2.54 times the reading in inches. Converting units is direct variation, with 2.54 centimetres per inch as its constant.",
      },
      {
        title: "Multiplying by one",
        text: "Since $1\\text{ in} = 2.54\\text{ cm}$, the fraction $\\frac{2.54\\text{ cm}}{1\\text{ in}}$ is equal to 1. Multiplying by it changes the units without changing the length, and the inches cancel like a common factor: $1.5\\text{ in} \\times \\frac{2.54\\text{ cm}}{1\\text{ in}} = 3.81\\text{ cm}$.",
      },
      {
        title: "Turn it over, chain it on",
        text: "To go back, turn the factor over: $\\frac{1\\text{ in}}{2.54\\text{ cm}}$ is 1 too. Factors also chain: to reach metres, follow with $\\frac{1\\text{ m}}{100\\text{ cm}}$. Choose each factor so the unit you want to get rid of is on the other side of the fraction bar, where it cancels.",
      },
      {
        title: "Square units",
        text: "Areas need the factor twice. A square inch is 2.54 cm by 2.54 cm, so $1\\text{ in}^2 = 2.54^2\\text{ cm}^2 \\approx 6.45\\text{ cm}^2$, not 2.54. Square the whole factor: $\\left(\\frac{2.54\\text{ cm}}{1\\text{ in}}\\right)^2$. Volumes need it three times, so $1\\text{ in}^3 \\approx 16.4\\text{ cm}^3$.",
      },
    ],

    draw(g, f) {
      const x = inches();
      if (f.step === 3) {
        // One square inch, ruled in centimetres.
        const side = PER_CM * CM_PER_IN;
        const alpha = f.at(3);
        box(g, { x: X0, y: INCH_Y }, { x: X0 + side, y: INCH_Y + side }, { color: INCH, fill: tint(INCH, 0.12), width: 2.5, alpha });
        for (let i = 1; i * PER_CM < side; i++) {
          g.segment({ x: X0 + i * PER_CM, y: INCH_Y }, { x: X0 + i * PER_CM, y: INCH_Y + side }, { color: CM, width: 1.5, dash: [4, 4], alpha });
          g.segment({ x: X0, y: INCH_Y + i * PER_CM }, { x: X0 + side, y: INCH_Y + i * PER_CM }, { color: CM, width: 1.5, dash: [4, 4], alpha });
        }
        box(g, { x: X0, y: INCH_Y }, { x: X0 + PER_CM, y: INCH_Y + PER_CM }, { color: CM, fill: tint(CM, 0.3), width: 2, alpha });
        g.label({ x: X0 + PER_CM / 2, y: INCH_Y + PER_CM / 2 }, "1 cm²", { color: C.ink, size: 13, bold: true, alpha });
        g.label({ x: X0 + side, y: INCH_Y + side / 2 }, "1 in² ≈ 6.45 cm²", { color: INCH, size: 15, bold: true, dx: 14, align: "left", alpha });
        g.label({ x: X0 + side / 2, y: INCH_Y + side }, "2.54 cm = 1 in", { color: C.dim, size: 13, dy: 12, alpha });
      }

      scale(g, { x0: X0, y: INCH_Y, per: PER_CM * CM_PER_IN, to: 2.5, tick: 0.25, label: 1, unit: "in", color: INCH, digits: 0 });
      scale(g, { x0: X0, y: CM_Y, per: PER_CM, to: 6, tick: 0.5, label: 1, unit: "cm", color: CM, below: true, digits: 0 });
      if (f.step === 2) {
        scale(g, { x0: X0, y: METRE_Y, per: PER_CM * 100, to: 0.06, tick: 0.01, label: 0.02, unit: "m", color: METRE, below: true, digits: 2 });
      }

      const low = f.step === 2 ? METRE_Y : CM_Y;
      g.segment({ x: marker.x, y: INCH_Y + 0.4 }, { x: marker.x, y: low - 0.1 }, { color: MARK, width: 2, dash: [5, 4] });
      if (f.step !== 3) {
        g.label({ x: marker.x, y: INCH_Y }, `${texNum(x)} in`, { color: INCH, size: 15, bold: true, dy: 40 });
      }
      g.point({ x: marker.x, y: CM_Y }, { color: CM, r: 5 });
      g.label({ x: marker.x, y: CM_Y }, `${texNum(x * CM_PER_IN, 3)} cm`, { color: CM, size: 15, bold: true, dx: 10, dy: 8, align: "left" });
      if (f.step === 2) {
        g.point({ x: marker.x, y: METRE_Y }, { color: METRE, r: 5 });
        g.label({ x: marker.x, y: METRE_Y }, `${texNum((x * CM_PER_IN) / 100, 4)} m`, { color: METRE, size: 15, bold: true, dx: 10, dy: 8, align: "left", alpha: f.at(2) });
      }
    },

    readout(f) {
      const x = inches();
      const cm = x * CM_PER_IN;
      const rows: Readout[] = [];
      if (f.step === 0) {
        rows.push({ label: "Readings", tex: `${texNum(x)}\\text{ in} = ${texNum(cm, 3)}\\text{ cm}` });
        rows.push({ label: "Ratio", tex: x === 0 ? "\\text{move the marker off } 0" : `\\frac{${texNum(cm, 3)}\\text{ cm}}{${texNum(x)}\\text{ in}} = 2.54\\text{ cm per in}`, tone: x === 0 ? "dim" : "good" });
      } else if (f.step === 1) {
        rows.push({ label: "A factor equal to 1", tex: `\\frac{2.54\\text{ cm}}{1\\text{ in}} = 1` });
        rows.push({ label: "Converted", tex: `${texNum(x)}\\,${cancel("in")} \\times \\frac{2.54\\text{ cm}}{1\\,${cancel("in")}} = ${texNum(cm, 3)}\\text{ cm}`, tone: "good" });
      } else if (f.step === 2) {
        rows.push({ label: "Back", tex: `${texNum(cm, 3)}\\,${cancel("cm")} \\times \\frac{1\\text{ in}}{2.54\\,${cancel("cm")}} = ${texNum(x)}\\text{ in}` });
        rows.push({
          label: "Chained",
          tex: `${texNum(x)}\\,${cancel("in")} \\times \\frac{2.54\\,${cancel("cm")}}{1\\,${cancel("in")}} \\times \\frac{1\\text{ m}}{100\\,${cancel("cm")}} = ${texNum(cm / 100, 4)}\\text{ m}`,
          tone: "good",
        });
      } else {
        rows.push({ label: "A square x inches on a side", tex: `${texNum(x)}^2\\text{ in}^2 = ${texNum(x * x, 4)}\\text{ in}^2` });
        rows.push({
          label: "In square centimetres",
          tex: `${texNum(x * x, 4)}\\,${cancel("in")}^2 \\times \\left(\\frac{2.54\\text{ cm}}{1\\,${cancel("in")}}\\right)^2 = ${texNum(x * x * CM_PER_IN * CM_PER_IN, 2)}\\text{ cm}^2`,
          tone: "good",
        });
      }
      return rows;
    },

    likes: [
      {
        title: "Changing money",
        text: "If one euro buys 1.10 dollars, then $\\frac{1.10\\text{ dollars}}{1\\text{ euro}}$ is a fair swap, worth the same on both sides. Multiplying 50 euros by it gives 55 dollars, and turning it over takes dollars back to euros.",
      },
      {
        title: "Counting eggs by the dozen",
        text: "Five dozen eggs is $5\\text{ dozen} \\times \\frac{12\\text{ eggs}}{1\\text{ dozen}} = 60$ eggs. The dozens cancel, just as inches do, and the factor $\\frac{12\\text{ eggs}}{1\\text{ dozen}}$ is a fancy way of writing 1.",
      },
    ],

    uses: [
      {
        title: "Fuel economy abroad",
        text: "To compare a car rated at 30 miles per gallon with one rated in kilometres per litre, convert the distance and the volume: $\\frac{30\\text{ mi}}{1\\text{ gal}} \\times \\frac{1.609\\text{ km}}{1\\text{ mi}} \\times \\frac{1\\text{ gal}}{3.785\\text{ L}} \\approx 12.8$ km per litre. The miles cancel above and the gallons below.",
        tags: ["travel"],
        image: {
          src: fuelEconomyConvertImage,
          caption: "30 miles per gallon is about 12.8 kilometres per litre: two conversion factors, one for distance and one for volume.",
          alt: "A fuel pump nozzle on its hose above two car dashboard gauges, the first reading 30 MPG and a gold arrow pointing to the second reading 12.8 km/L, with the factors × 1.609 km per mi and ÷ 3.785 L per gal beneath.",
        },
      },
      {
        title: "Ordering flooring",
        text: "Carpet is often sold by the square yard and rooms measured in feet. A 12 ft by 15 ft room is 180 square feet, and since a yard is 3 feet, a square yard is $3 \\times 3 = 9$ square feet: $180\\text{ ft}^2 \\times \\frac{1\\text{ yd}^2}{9\\text{ ft}^2} = 20$ square yards, not 60.",
        tags: ["building", "home"],
        image: {
          src: floorSquareYardsImage,
          caption: "A 12 ft by 15 ft floor is 180 square feet, or 20 square yards, since one square yard is 3 ft by 3 ft, or 9 square feet.",
          alt: "A floor plan 15 ft by 12 ft divided into a 5 by 4 grid of square yards, one corner square yard in gold split into its 9 square feet and labelled 1 yd² = 9 ft², beside 180 ft² = 20 yd².",
        },
      },
    ],
  };
});
