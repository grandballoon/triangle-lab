// Relations as arrow diagrams. A relation on a set says which ordered pairs
// are related; draw an arrow for each. Reflexive means a loop at every point,
// symmetric means every arrow has its return, and transitive means every
// two-arrow path has a one-arrow shortcut.

import { C } from "../draw.ts";
import { add, normalize, scale, sub, type Vec } from "../geo.ts";
import { around } from "../kit/operations.ts";
import { lesson, type Readout } from "../scene.ts";
import directFlightsImage from "../../images/direct-flights-relation.svg";
import foodWebImage from "../../images/food-web-eats.svg";

const SET = [1, 2, 3, 4, 5, 6] as const;
const CENTRE: Vec = { x: -3.6, y: 0.4 };
const R = 2.6;
const ARROW = C.blue;
const GOOD = C.green;
const BAD = C.red;
const PATH = C.gold;

const RELATIONS = {
  divides: { tex: "a \\mid b", says: "a divides b", holds: (a: number, b: number) => b % a === 0 },
  "less than": { tex: "a < b", says: "a < b", holds: (a: number, b: number) => a < b },
  "same parity": { tex: "a - b \\text{ is even}", says: "a − b is even", holds: (a: number, b: number) => (a - b) % 2 === 0 },
  "differ by 1": { tex: "|a - b| = 1", says: "|a − b| = 1", holds: (a: number, b: number) => Math.abs(a - b) === 1 },
  "within 1": { tex: "|a - b| \\le 1", says: "|a − b| ≤ 1", holds: (a: number, b: number) => Math.abs(a - b) <= 1 },
} as const;
type RelationName = keyof typeof RELATIONS;

const at = (k: number): Vec => around(CENTRE, R, SET.indexOf(k as (typeof SET)[number]), SET.length);

/** Properties of a relation on SET, each with the first pair or triple that breaks it. */
function properties(holds: (a: number, b: number) => boolean) {
  const notReflexive = SET.filter((a) => !holds(a, a));
  const oneWay = SET.flatMap((a) => SET.filter((b) => a !== b && holds(a, b) && !holds(b, a)).map((b) => [a, b] as const));
  const broken: [number, number, number][] = [];
  for (const a of SET) for (const b of SET) for (const c of SET) {
    if (holds(a, b) && holds(b, c) && !holds(a, c)) broken.push([a, b, c]);
  }
  // A counterexample with three different points reads most clearly.
  broken.sort((u, v) => Number(u[0] === u[2]) - Number(v[0] === v[2]));
  return { notReflexive, oneWay, broken };
}

export default lesson((s) => {
  const rel = s.choice<RelationName>("a ∼ b when", Object.keys(RELATIONS) as RelationName[], "divides");

  return {
    steps: [
      {
        title: "A relation is a set of arrows",
        text: "A relation on a set says, for each ordered pair $(a, b)$, whether $a$ is related to $b$, written $a \\sim b$. Draw an arrow from $a$ to $b$ when it is, and a loop at $a$ when $a \\sim a$. For divides on $\\{1, 2, 3, 4, 5, 6\\}$, 1 points to every number, 2 to 4 and 6, 3 to 6, and every number loops to itself.",
      },
      {
        title: "Reflexive",
        text: "A relation is reflexive when $a \\sim a$ for every $a$: a loop at every point. Divides is reflexive, since $a = 1 \\cdot a$; less than is not, since no number is less than itself. Missing loops show in red.",
      },
      {
        title: "Symmetric",
        text: "A relation is symmetric when $a \\sim b$ always brings $b \\sim a$: every arrow comes with one going back. Having the same parity is symmetric; divides is not, since 2 divides 4 but 4 does not divide 2. One-way arrows show in red.",
      },
      {
        title: "Transitive",
        text: "A relation is transitive when $a \\sim b$ and $b \\sim c$ always give $a \\sim c$: every path of two arrows has a one-arrow shortcut. Divides and less than are transitive. Differing by 1 is not: $1 \\sim 2$ and $2 \\sim 3$, but 1 and 3 differ by 2. A missing shortcut shows dashed.",
      },
    ],

    draw(g, f) {
      const { holds, says } = RELATIONS[rel.value];
      const { notReflexive, oneWay, broken } = properties(holds);
      const bad = f.step === 3 ? broken[0] : undefined;
      const onPath = (a: number, b: number): boolean => !!bad && ((a === bad[0] && b === bad[1]) || (a === bad[1] && b === bad[2]));

      const loopCentre = (k: number): Vec => add(at(k), scale(normalize(sub(at(k), CENTRE)), 0.55));
      const loop = (k: number, color: string, dash?: number[], width = 2.5): void => g.circle(loopCentre(k), 0.32, { color, width, dash });

      // Arrows between different points, shortened to stop short of the dots.
      for (const a of SET) {
        for (const b of SET) {
          if (a === b || !holds(a, b)) continue;
          const d = normalize(sub(at(b), at(a)));
          const from = add(at(a), scale(d, 0.32));
          const to = add(at(b), scale(d, -0.32));
          const back = holds(b, a);
          let color: string = ARROW;
          if (f.step === 2) color = back ? GOOD : BAD;
          if (onPath(a, b)) color = PATH;
          // A two-way pair overlaps into one line with a head at each end.
          g.arrow(from, to, { color, width: onPath(a, b) ? 3.5 : 2.5, alpha: f.step === 3 && bad && !onPath(a, b) ? 0.35 : 1 });
        }
      }
      for (const k of SET) {
        if (holds(k, k)) loop(k, f.step === 1 ? GOOD : onPath(k, k) ? PATH : ARROW);
        else if (f.step === 1) loop(k, BAD, [4, 4], 2);
      }
      if (bad) {
        const [a, , c] = bad;
        if (a === c) loop(a, BAD, [4, 4], 2.5);
        else {
          const d = normalize(sub(at(c), at(a)));
          g.arrow(add(at(a), scale(d, 0.32)), add(at(c), scale(d, -0.32)), { color: BAD, width: 2.5, dash: [6, 5], alpha: f.at(3) });
        }
      }
      for (const k of SET) {
        g.point(at(k), { color: C.ink, r: 7 });
        const out = add(at(k), scale(normalize(sub(at(k), CENTRE)), 1.15));
        g.label(out, String(k), { color: C.ink, size: 18, bold: true });
      }

      const note = (row: number, text: string, color: string, alpha = 1, size = 17): void => {
        g.label({ x: 0.8, y: 3 - row * 0.85 }, text, { color, size, bold: true, align: "left", alpha });
      };
      note(0, `a ∼ b when ${says}`, C.ink);
      if (f.step === 0) {
        const count = SET.reduce((n, a) => n + SET.filter((b) => holds(a, b)).length, 0);
        note(1, `${count} of 36 ordered pairs are related`, C.dim, f.at(0), 15);
        note(2, "an arrow a → b for each, a loop for a ∼ a", C.dim, f.at(0), 14);
      } else if (f.step === 1) {
        const ok = notReflexive.length === 0;
        note(1, ok ? "a loop at every point" : `no loop at ${notReflexive.join(", ")}`, ok ? GOOD : BAD, f.at(1));
        note(2, ok ? "reflexive" : "not reflexive", ok ? GOOD : BAD, f.at(1), 20);
      } else if (f.step === 2) {
        const ok = oneWay.length === 0;
        note(1, ok ? "every arrow has its return" : `${oneWay[0][0]} → ${oneWay[0][1]} but not ${oneWay[0][1]} → ${oneWay[0][0]}`, ok ? GOOD : BAD, f.at(2));
        note(2, ok ? "symmetric" : "not symmetric", ok ? GOOD : BAD, f.at(2), 20);
      } else {
        if (bad) {
          const [x, y, z] = bad;
          note(1, `${x} ∼ ${y} and ${y} ∼ ${z}`, PATH, f.at(3));
          note(2, `but not ${x} ∼ ${z}`, BAD, f.at(3));
          note(3, "not transitive", BAD, f.at(3), 20);
        } else {
          note(1, "every two-arrow path", GOOD, f.at(3));
          note(2, "has its shortcut", GOOD, f.at(3));
          note(3, "transitive", GOOD, f.at(3), 20);
        }
      }
    },

    readout() {
      const { holds, tex } = RELATIONS[rel.value];
      const { notReflexive, oneWay, broken } = properties(holds);
      const yes = (ok: boolean): Readout["tone"] => (ok ? "good" : "warn");
      return [
        { label: "Relation", tex: `a \\sim b \\iff ${tex}` },
        { label: "Reflexive", tex: notReflexive.length ? `\\text{no: } ${notReflexive[0]} \\not\\sim ${notReflexive[0]}` : "\\text{yes}", tone: yes(!notReflexive.length) },
        { label: "Symmetric", tex: oneWay.length ? `\\text{no: } ${oneWay[0][0]} \\sim ${oneWay[0][1]}, \\ ${oneWay[0][1]} \\not\\sim ${oneWay[0][0]}` : "\\text{yes}", tone: yes(!oneWay.length) },
        { label: "Transitive", tex: broken.length ? `\\text{no: } ${broken[0][0]} \\sim ${broken[0][1]} \\sim ${broken[0][2]}, \\ ${broken[0][0]} \\not\\sim ${broken[0][2]}` : "\\text{yes}", tone: yes(!broken.length) },
      ];
    },

    likes: [
      {
        title: "Who follows whom",
        text: "On a social network, following is a relation: an arrow from each account to the ones it follows. It is not symmetric, since following someone does not make them follow you back, and it is not transitive either.",
      },
      {
        title: "Being taller than",
        text: "Line people up by height and taller than is transitive: if Ana is taller than Ben and Ben than Cal, Ana is taller than Cal. It is never reflexive, since nobody is taller than themselves.",
      },
    ],

    uses: [
      {
        title: "Direct flights",
        text: "Say two airports are related when a direct flight joins them. The relation is symmetric, since routes run both ways, but not transitive: a direct flight from one city to a hub and another from the hub onward do not make a direct flight between the two cities. A missing shortcut is exactly a journey with a change of plane.",
        tags: ["travel"],
        image: {
          src: directFlightsImage,
          caption: "Direct flights run both ways, but two flights through a hub do not make a direct one: the relation is symmetric but not transitive.",
          alt: "Four airports joined by two-way arrows to a central hub, with a dashed gold arrow between two outer airports marking a route that needs a change.",
        },
      },
      {
        title: "A food web",
        text: "In a food web, draw an arrow from each animal to what it eats. Eats is not reflexive and almost never symmetric. Nor is it transitive: an owl eats a shrew and a shrew eats beetles, but an owl does not eat beetles. Ecologists follow the two-arrow paths anyway, because energy flows along them.",
        tags: ["nature"],
        image: {
          src: foodWebImage,
          caption: "Owls eat shrews and shrews eat beetles, but owls do not eat beetles: eats is not transitive.",
          alt: "Arrows from owl to shrew and from shrew to beetle, with a gold dashed arrow from owl to beetle crossed out, beside the words not transitive.",
        },
      },
    ],
  };
});
