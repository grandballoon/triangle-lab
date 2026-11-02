// The distance formula. The segment between two points is the hypotenuse of a
// right triangle whose legs follow the grid — the difference of the x's and
// the difference of the y's — so the Pythagorean theorem gives its length.

import { dist, fmt } from "../geo.ts";
import { keepApart, num, pair, par, plane, riseRun, settle, snapping } from "../kit/coordinates.ts";
import { lesson, type Readout } from "../scene.ts";

export default lesson((s) => {
  const snap = s.toggle("Snap to grid", true);
  const A = s.point(-4, -2, { label: "A" });
  const B = s.point(4, 4, { label: "B" });
  keepApart(A, B, snapping(snap));

  return {
    steps: [
      {
        title: "How far from A to B?",
        text: "Drag $A$ and $B$. The grid makes it easy to count across or up, but not along a slant. Watch the length $d$ of the segment, and look for positions where it is a whole number.",
      },
      {
        title: "Make it a hypotenuse",
        text: "Walk from $A$ straight across, then straight up to $B$. Grid lines meet at right angles, so $AB$ is the hypotenuse of a right triangle with legs $x_2 - x_1$ and $y_2 - y_1$.",
      },
      {
        title: "Pythagoras on the grid",
        text: "The Pythagorean theorem gives $d^2 = (x_2 - x_1)^2 + (y_2 - y_1)^2$. Squaring wipes out the signs, so it does not matter which point is called first.",
      },
      {
        title: "The distance formula",
        text: "Take the square root: $d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$. Line the points up level or upright and the triangle collapses, yet the formula still returns the plain difference.",
      },
    ],

    likes: [
      {
        title: "Cutting across the park",
        text: "Walk 3 blocks east and 4 blocks north along the streets and you have walked 7 blocks. Cut straight across the park instead and it is only 5. The streets are the legs of the right triangle and your shortcut is the hypotenuse, so $\\sqrt{3^2 + 4^2} = 5$.",
      },
      {
        title: "Going there and coming back",
        text: "The walk home is as long as the walk out, even though every step goes the other way. In the formula, swapping the points makes both differences negative, but squaring them gives the same numbers, so the distance comes out the same.",
      },
    ],
    uses: [
      {
        title: "Measuring a television",
        text: "Screens are sold by their diagonal. A screen 120 cm wide and 67.5 cm tall measures $\\sqrt{120^2 + 67.5^2} \\approx 137.7$ cm corner to corner, which is about 54 inches, the size on the box.",
      },
      {
        title: "Is the enemy in range?",
        text: "A video game checks distances all the time: is the player close enough to open a door, or within reach of an enemy? With the player at $(3, 4)$ and an enemy at $(0, 0)$ with reach 6, it compares $3^2 + 4^2 = 25$ with $6^2 = 36$. Comparing the squares skips the square root, which saves time when the game does it thousands of times a second.",
      },
    ],

    draw(g, f) {
      settle(A, B);
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const rightward = dx >= 0;

      plane(g);
      if (f.at(1) > 0) {
        riseRun(g, A, B, {
          alpha: f.at(1),
          run: `x₂ − x₁ = ${num(dx, 2)}`,
          rise: `y₂ − y₁ = ${num(dy, 2)}`,
        });
      }
      g.segment(A, B, { color: g.accent, width: 4 });

      // The length caption sits on the far side of AB from the triangle.
      const side = dx * dy >= 0 ? 1 : -1;
      const sum = `${num(dx * dx, 2)} + ${num(dy * dy, 2)}`;
      const caption = f.step >= 3 ? `d = √(${sum}) = ${num(dist(A, B), 2)}` : f.step === 2 ? `d² = ${sum}` : `d = ${num(dist(A, B), 2)}`;
      g.along(A, B, caption, { color: g.accent, size: 16, bold: true, offset: 22 * side });

      g.label(A, pair(A, 2), { dx: rightward ? -18 : 18, dy: -20, align: rightward ? "right" : "left", size: 13 });
      g.label(B, pair(B, 2), { dx: rightward ? 18 : -18, dy: -20, align: rightward ? "left" : "right", size: 13 });
    },

    readout(f) {
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const squared = dx * dx + dy * dy;
      const rows: Readout[] = [
        { label: "Across", tex: `x_2 - x_1 = ${fmt(B.x, 2)} - ${par(A.x, 2)} = ${fmt(dx, 2)}` },
        { label: "Up", tex: `y_2 - y_1 = ${fmt(B.y, 2)} - ${par(A.y, 2)} = ${fmt(dy, 2)}` },
      ];
      if (f.step >= 2) {
        rows.push({
          label: "Pythagorean theorem",
          tex: `d^2 = ${par(dx, 2)}^2 + ${par(dy, 2)}^2 = ${fmt(squared, 2)}`,
        });
      }
      if (f.step >= 3) {
        rows.push({ label: "Distance formula", tex: `d = \\sqrt{${fmt(squared, 2)}} = ${fmt(Math.sqrt(squared), 2)}` });
      }
      rows.push({ label: "Measured along AB", tex: `d = ${fmt(dist(A, B), 2)}`, tone: "good" });
      return rows;
    },
  };
});
