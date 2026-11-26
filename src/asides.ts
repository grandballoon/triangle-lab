// What the standalone lesson pages say around their steps, keyed by slug:
// what each idea is like, and what it is used for. A lab lesson gives its own
// (LessonView in lab/scene.ts); a standalone page's steps live apart from its
// module (directions.ts), and so do these. page.ts shows them after the steps.
// Text may hold `$…$` LaTeX.

import type { Asides } from "./lab/scene.ts";
import flowerBedCheckImage from "./images/flower-bed-check.svg";
import framingSquareImage from "./images/framing-square.svg";
import gablePaintImage from "./images/gable-paint.svg";
import gableRaftersImage from "./images/gable-rafters.svg";
import gameMeshImage from "./images/game-mesh.svg";
import gameMonsterDistanceImage from "./images/game-monster-distance.svg";
import gameWallBounceImage from "./images/game-wall-bounce.svg";
import gardenTriangulationImage from "./images/garden-triangulation.svg";
import gateBraceImage from "./images/gate-brace.svg";
import mapTriangleImage from "./images/map-triangle.svg";
import poolRackImage from "./images/pool-rack.svg";
import riverWidthImage from "./images/river-width.svg";
import satnavStraightLineImage from "./images/satnav-straight-line.svg";
import stringLines345Image from "./images/string-lines-3-4-5.svg";
import stringRightAngleImage from "./images/string-right-angle.svg";
import treeShadowImage from "./images/tree-shadow.svg";
import tvDiagonalImage from "./images/tv-diagonal.svg";
import warrenTrussBridgeImage from "./images/warren-truss-bridge.svg";
import wheelchairRampImage from "./images/wheelchair-ramp.svg";

export const asides: Record<string, Asides> = {
  angles: {
    likes: [
      {
        title: "Opening a door",
        text: "The hinge is the vertex, the wall and the door are the two sides, and how far the door swings open is the angle. Opened a little, it is acute. Opened until it stands square to the wall, it is a right angle. Swing it further, back toward the wall on the other side, and it is obtuse.",
      },
      {
        title: "Sharing a bag of sweets",
        text: "Three children share a bag of exactly $180$ sweets, just as a triangle's three angles always share $180^\\circ$. If one child grabs more than $90$, fewer than $90$ are left for the other two together, so neither of them can also have more than $90$. That is why a triangle can hold at most one obtuse angle.",
      },
    ],
    uses: [
      {
        title: "Checking a corner is square",
        text: "A carpenter checks the corner of a cabinet or a door frame by pressing a steel framing square, an L-shaped ruler with a $90^\\circ$ corner, into it. If both arms sit flush, the corner is right. If a gap opens at the far end of one arm, the corner is acute or obtuse, and the joint needs fixing before the glue sets.",
        image: {
          src: framingSquareImage,
          caption: "A framing square: its steel L has a 90° corner, so if both arms sit flush in a cabinet corner, the corner is right.",
          alt: "A steel framing square pressed into the inside corner of two wooden boards, with the corner's edges and a right-angle mark in dashed gold.",
        },
      },
      {
        title: "Building a wheelchair ramp",
        text: "Seen from the side, a ramp is a right triangle: the ground, the rise up to the door and the sloping surface. US accessibility rules allow at most $1$ unit of rise for every $12$ units along the ground, which keeps the angle at the foot of the ramp under about $4.8^\\circ$, a very acute angle. The angle at the top is then about $85.2^\\circ$, since the three share $180^\\circ$ with the right angle.",
        image: {
          src: wheelchairRampImage,
          caption: "A wheelchair ramp: from the side it is a right triangle, with a very acute angle at its foot so the slope stays gentle.",
          alt: "A wooden ramp with a handrail rising from the ground to a doorway landing, outlined as a dashed gold right triangle with the small angle at the foot marked.",
        },
      },
    ],
  },
  equilateral: {
    likes: [
      {
        title: "Sharing a cake three ways",
        text: "Three friends share one cake, and the rule is that nobody's slice may differ from anyone else's. Then each gets exactly a third. In an equilateral triangle the cake is the $180^\\circ$ that every triangle's angles add up to, and the equal sides are the rule: they force equal angles, so each corner gets a third, $60^\\circ$.",
      },
      {
        title: "Zooming in on a photo",
        text: "Pinch to zoom on a photo and everything gets bigger, but no face changes shape. Dragging the knob does the same to the triangle: the sides grow or shrink together, so they stay equal, and the corners, which describe its shape rather than its size, stay at $60^\\circ$.",
      },
    ],
    uses: [
      {
        title: "Racking pool balls",
        text: "At the start of a game of pool, the fifteen balls are packed into an equilateral triangular rack in rows of $1$, $2$, $3$, $4$ and $5$. Round balls of one size pack tightly only in this shape: each ball touches its neighbours, and the centres of any three touching balls form a small equilateral triangle.",
        image: {
          src: poolRackImage,
          caption: "A pool rack: fifteen equal balls pack tightly in rows of 1 to 5 only inside an equilateral triangle.",
          alt: "Fifteen coloured balls in a wooden triangular rack on a green table; dashed gold joins the outer ball centres into an equilateral triangle, with a small gold triangle joining three touching balls.",
        },
      },
      {
        title: "Bridges built from triangles",
        text: "A Warren truss, a common design for steel footbridges and railway bridges, is a row of equilateral triangles between two long beams. A triangle with fixed sides cannot change shape, unlike a square, which can lean over into a rhombus. Making every triangle equilateral means every strut is the same length, so the parts can be cut and made identically.",
        image: {
          src: warrenTrussBridgeImage,
          caption: "A Warren truss bridge: a row of equilateral triangles between two beams, so every strut is the same length and the frame cannot lean.",
          alt: "A steel truss bridge over water, its zigzag struts forming triangles; one triangle is shaded in dashed gold with a tick on each equal side.",
        },
      },
    ],
  },
  isosceles: {
    likes: [
      {
        title: "Folding a sheet in half",
        text: "Fold an isosceles triangle along the line from its apex to the middle of its base. One leg lands exactly on the other, so each base corner lands on the other base corner. Corners that cover each other perfectly must be the same size, which is why the base angles are always equal.",
      },
      {
        title: "Opening a stepladder",
        text: "A stepladder's two legs are the same length and hinge together at the top. Spread the feet wider and the top drops, pull them closer and it rises, but both feet always meet the floor at the same angle. The legs are the triangle's equal sides, the floor between the feet is its base, and the feet are its base angles.",
      },
    ],
    uses: [
      {
        title: "Cutting the rafters for a roof",
        text: "The end of an ordinary pitched roof, a gable, is an isosceles triangle: two rafters of the same length meeting at the ridge. Because the base angles are equal, the rafters on both sides of the roof need exactly the same cuts. Carpenters cut one pattern rafter, check its fit, and trace it to cut all the rest.",
        image: {
          src: gableRaftersImage,
          caption: "A gable roof: two rafters of equal length meet at the ridge, so the base angles match and every rafter takes the same cuts.",
          alt: "A house's gable end with two wooden rafters meeting at the ridge, outlined in dashed gold with ticks on the equal rafters and arcs marking the equal base angles.",
        },
      },
      {
        title: "Marking a right angle with string",
        text: "To mark a path running square off a garden wall, peg two points on the wall the same distance either side of where the path should start, say $2$ metres each way. Tie equal lengths of string to both pegs and pull them until their ends meet. The strings and the wall make an isosceles triangle, and the line from where the strings meet to the midpoint between the pegs is at $90^\\circ$ to the wall.",
        image: {
          src: stringRightAngleImage,
          caption: "Marking a path square off a wall: equal strings from two pegs meet at a point, and the line from there to the midpoint between the pegs is at 90° to the wall.",
          alt: "Seen from above, two equal strings run from pegs on a brick wall to meet at a peg; dashed gold traces the isosceles triangle and the line down to the wall, with a right-angle mark and ticks for equal lengths.",
        },
      },
    ],
  },
  scalene: {
    likes: [
      {
        title: "Opening a pair of scissors",
        text: "The wider you open the blades at the hinge, the farther apart the tips move. In a triangle every corner is a hinge like this, and the side facing it is the gap between the tips. So the corner that opens widest faces the longest side, and the narrowest corner faces the shortest.",
      },
      {
        title: "Tearing a corner off a page",
        text: "Rip a corner off a sheet of paper without thinking about it and the scrap is almost certainly scalene. Getting two sides equal takes careful aiming, while any careless tear gives three different lengths. Isosceles and equilateral triangles are the special cases, and scalene is what you get most of the time.",
      },
    ],
    uses: [
      {
        title: "Building 3D models from triangles",
        text: "The characters and scenery in video games and animated films are built from thousands of small flat triangles, almost all of them scalene. Any three points, however they sit in space, always lie on exactly one flat triangle, so a modeller can place corners freely and every patch of surface still renders cleanly.",
        image: {
          src: gameMeshImage,
          caption: "A 3D model on screen: its surface is built from small flat triangles, most of them scalene, placed corner by corner.",
          alt: "A computer monitor showing a low-poly rock made of coloured triangles, with one scalene triangle outlined in dashed gold and its three corners dotted.",
        },
      },
      {
        title: "Measuring an odd-shaped garden",
        text: "Garden designers often measure an irregular plot by fixing two pegs a known distance apart and running a tape from both pegs to each corner of the plot. Each corner and the two pegs form a triangle whose three sides are now known, usually all different, and those three lengths fix exactly where the corner sits on the plan.",
        image: {
          src: gardenTriangulationImage,
          caption: "Measuring a garden: tapes from two fixed pegs to a corner make a triangle with three known sides, which fixes where that corner sits.",
          alt: "An irregular green garden plot seen from above with shrubs and a flower bed; tapes run between two pegs and out to one corner of the plot, forming a scalene triangle shaded in dashed gold.",
        },
      },
    ],
  },
  altitudes: {
    likes: [
      {
        title: "Walking straight to the road",
        text: "You are in a field and want to reach a straight road by the shortest route. You walk so that your path meets the road at a right angle: that path is the altitude, from your corner to the opposite side. If the road you can see stops short, the shortest route to its line still lands where the road would be if it carried on, just as an obtuse triangle's altitude lands on the extended side.",
      },
      {
        title: "A ladder against a wall",
        text: "A ladder leaning on a wall is a slanted side, but how high it reaches is measured straight down the wall to the ground, at right angles to the floor. That drop is the altitude. The ladder is always longer than its height, just as a triangle's slanting sides are never shorter than its altitude.",
      },
    ],
    uses: [
      {
        title: "Painting a gable",
        text: "A triangle's area is half its base times its altitude: $\\text{Area} = \\frac{1}{2} b h$. A painter facing a gable end $8$ metres wide and $3$ metres from the base to the peak works out $\\frac{1}{2} \\cdot 8 \\cdot 3 = 12$ square metres, and buys paint for that. The height must be the altitude, straight up from the base, not the length of the sloping edge.",
        image: {
          src: gablePaintImage,
          caption: "A painter at a gable end 8 metres wide and 3 metres high: its area is half the base times the altitude, straight up from the base.",
          alt: "A house's triangular gable, partly painted, with a dashed base marked 8 and a dashed vertical altitude marked 3 with a right-angle mark; a painter with a long roller stands beside it.",
        },
      },
      {
        title: "Bouncing off a wall in a game",
        text: "To tell whether a ball has hit a wall, a game measures the distance from the ball's centre to the wall along the perpendicular, the altitude from that point to the wall's line. If that distance is less than the ball's radius, they touch. If the foot of the perpendicular lands past the end of the wall, outside it, the game checks the nearest end of the wall instead.",
        image: {
          src: gameWallBounceImage,
          caption: "A game checks whether a ball hits a wall by measuring the perpendicular distance from the ball's centre to the wall.",
          alt: "A monitor showing a sloping red wall and a moving ball, with a dashed perpendicular from the ball's centre to the wall and a right-angle mark.",
        },
      },
    ],
  },
  inequality: {
    likes: [
      {
        title: "Cutting across the park",
        text: "Walking straight across the park to the café is shorter than walking along the path to the fountain and then on to the café. The straight walk is one side of a triangle, and the detour is the other two, so $a + b > c$. A detour can only ever tie with the straight route, and only when the fountain sits right on the straight line.",
      },
      {
        title: "Two sticks on a hinge",
        text: "Join two sticks with a hinge and ask how far apart their free ends can be. Laid out straight, the ends are as far apart as both sticks put together; folded back on each other, as close as their difference. Every angle in between gives a gap somewhere between those two, and that gap is the only kind of third side the two sticks can make.",
      },
    ],
    uses: [
      {
        title: "Catching a measuring mistake",
        text: "Someone writes down a triangular flower bed as $3$, $4$ and $9$ metres. You know at once that a measurement is wrong, because $3 + 4 = 7$ is less than $9$: the two short sides could not reach each other's ends. The check takes seconds and saves cutting the edging to impossible lengths.",
        image: {
          src: flowerBedCheckImage,
          caption: "A flower bed written down as 3, 4 and 9 metres cannot exist: the two short edges together fall short of the long one.",
          alt: "Edging boards of lengths 3 and 4 hinged at the ends of a 9 board, with dashed arcs showing their tips can never meet, leaving a gap along the base.",
        },
      },
      {
        title: "How sat navs find routes quickly",
        text: "Route-finding programs often use the straight-line distance to the destination as a guess of how far is still left to drive. That guess is never too big, because a road from one place to another can never be shorter than the straight line between them. Knowing the guess is never too big lets the program skip routes that cannot win, while still being sure it finds the shortest one.",
        image: {
          src: satnavStraightLineImage,
          caption: "A sat nav guesses the distance left as the straight line to the destination, which a road can never beat.",
          alt: "A sat nav screen with a winding blue route from a start dot to a red pin, and a dashed straight line between them.",
        },
      },
    ],
  },
  pythagoras: {
    likes: [
      {
        title: "Rearranging furniture",
        text: "Push the same four pieces of furniture into different spots in the same room and the free floor space never changes, only its shape. The proof does exactly this: the box of side $a + b$ is the room, the four triangles are the furniture, and the free floor is either two squares, $a^2 + b^2$, or one tilted square, $c^2$.",
      },
      {
        title: "Rolling two squares of dough into one",
        text: "Take a $3$ by $3$ square of dough and a $4$ by $4$ one and roll them together into a single square. You have $9 + 16 = 25$ square units of dough, so the new square is $5$ by $5$, not $7$ by $7$. Areas add up; side lengths do not, and the hypotenuse is the side of the square you get by adding the areas.",
      },
    ],
    uses: [
      {
        title: "Setting out a square corner",
        text: "Builders laying out a foundation or a patio measure $3$ metres along one edge and $4$ metres along the other, then check that the diagonal between those two marks is exactly $5$ metres. Since $3^2 + 4^2 = 5^2$, only a right angle gives that length, so the corner is square. For a bigger corner they double the numbers to $6$, $8$ and $10$.",
        image: {
          src: stringLines345Image,
          caption: "Setting out a foundation: string lines marked at 3 and 4 metres from a corner peg are exactly 5 metres apart only when the corner is square.",
          alt: "Top-down view of two string lines running from a corner peg along the ground, with red marks at 3 and 4 and a dashed gold diagonal of 5 between them closing a right triangle.",
        },
      },
      {
        title: "Screen sizes",
        text: "A screen's size is the length of its diagonal. A $55$-inch widescreen television is about $47.9$ inches wide and $27.0$ inches tall, and $47.9^2 + 27.0^2 \\approx 55^2$. Knowing this, you can check whether a television will fit a cabinet from its advertised size and shape alone.",
        image: {
          src: tvDiagonalImage,
          caption: "A widescreen television: its width and height are the legs of a right triangle, and its advertised size is the diagonal.",
          alt: "A flat television on a wooden cabinet, with a dashed gold right triangle along its bottom edge, right edge and corner-to-corner diagonal marked 55.",
        },
      },
      {
        title: "Distance in a game",
        text: "A game deciding whether an enemy is close enough to notice the player works out the distance from the gaps across and up. An enemy $3$ units to the right and $4$ units ahead is $\\sqrt{3^2 + 4^2} = 5$ units away. Many games skip the square root and compare $3^2 + 4^2 = 25$ with the square of the sight range, which is quicker and gives the same answer.",
        image: {
          src: gameMonsterDistanceImage,
          caption: "A game working out how far an enemy is: 3 units across and 4 units up make a straight-line distance of 5.",
          alt: "A grid-like game map with a player at the bottom left and a purple ghost above and to the right, joined by a dashed gold right triangle with sides 3, 4 and 5.",
        },
      },
    ],
  },
  congruence: {
    likes: [
      {
        title: "Building a frame from three sticks",
        text: "Hand three friends the same three sticks and ask each to join them end to end into a triangle. Everyone builds the same triangle, perhaps flipped over: three sides allow only one shape. That is SSS, and it is also why a triangle of sticks holds firm while a square of sticks wobbles flat.",
      },
      {
        title: "Describing a shape over the phone",
        text: "You want a friend to cut out the same triangle you have, but you can only read out measurements. Three sides, two sides with the angle between them, or two angles with the side between them leave your friend no choice, so they cut the same triangle. Two sides and an angle that is not between them is like ambiguous directions: there are two places your friend could end up.",
      },
    ],
    uses: [
      {
        title: "Bracing a gate",
        text: "A wooden gate made only as a rectangle sags, because four sides do not fix a shape and the frame can lean over. A diagonal brace splits it into two triangles, and a triangle's three sides fix it completely, so the gate holds its shape. Shelving units and scaffolding are braced with diagonals for the same reason.",
        image: {
          src: gateBraceImage,
          caption: "A braced gate: the diagonal splits the frame into two triangles, and a triangle's three sides fix its shape, so the gate cannot sag.",
          alt: "A wooden field gate hung between two posts, with a diagonal brace from the bottom hinge corner to the top latch corner; the lower triangle is outlined in dashed gold.",
        },
      },
      {
        title: "Measuring across a river",
        text: "To find how wide a river is without crossing it, stand opposite a tree on the far bank and walk along your bank, say $30$ paces, and plant a stick. Walk another $30$ paces and turn to walk straight away from the river until the stick lines up with the tree. The triangle you walked has a right angle, a side of $30$ paces and a matching vertical angle at the stick, so by ASA it is a copy of the one across the river, and your walk away from the bank equals the river's width.",
        image: {
          src: riverWidthImage,
          caption: "Measuring across a river: the triangle you pace out on your own bank is a copy of the one reaching across to the tree, so your walk away from the bank equals the river's width.",
          alt: "A bird's-eye view of a river with a tree on the far bank, a stick on the near bank and a person further along; two dashed gold right triangles meet at the stick, with equal paced sides marked and the sight line running from tree through stick to person.",
        },
      },
    ],
  },
  similar: {
    likes: [
      {
        title: "Scaling a recipe",
        text: "Double every ingredient in a recipe and you get more food that tastes exactly the same, because the proportions have not changed. Sliding along the ray is doubling the recipe: every side grows, but the ratios hold still. Turning the dial is changing the recipe itself, and then every ratio changes.",
      },
      {
        title: "Sliding down a playground slide",
        text: "A toddler's slide and a tall one built at the same angle are equally steep: both drop the same number of centimetres for every metre of slide. Steepness is a ratio of the drop to the length, so it depends on the angle alone, never on how big the slide is.",
      },
    ],
    uses: [
      {
        title: "Measuring a tree by its shadow",
        text: "At any one moment the sun's rays strike everything at the same angle, so a person and their shadow make a triangle similar to a tree and its shadow. If a $1.8$ metre person casts a $1.2$ metre shadow, heights are $1.5$ times shadows right now. A tree casting an $8$ metre shadow is then $1.5 \\cdot 8 = 12$ metres tall, measured without climbing it.",
        image: {
          src: treeShadowImage,
          caption: "Measuring a tree by its shadow: the sun's rays strike a person and a tree at the same angle, so their height-and-shadow triangles are similar.",
          alt: "A tree and a person standing in sunshine, each casting a shadow to the left; a large and a small dashed gold right triangle join each top to its shadow's tip.",
        },
      },
      {
        title: "Reading a map",
        text: "A map at $1 : 25000$ shrinks every distance by the same factor, so any triangle of towns on the map is similar to the real one. Its angles are the true angles, which is why a compass bearing measured on the map works on the ground, and $4$ centimetres on the map is $4 \\cdot 25000 = 100000$ centimetres, or $1$ kilometre, on the ground.",
        image: {
          src: mapTriangleImage,
          caption: "Reading a map: a scale map shrinks every distance by the same factor, so a triangle of towns on it is similar to the real one and keeps its true angles.",
          alt: "A folded paper map with a river, woods and a compass, and three red town dots joined by a dashed gold triangle.",
        },
      },
    ],
  },
  trig: {
    likes: [
      {
        title: "Climbing a ladder",
        text: "The ladder is the hypotenuse, the wall is the opposite leg and the floor out to the ladder's foot is the adjacent leg. For every metre of ladder you climb, you rise $\\sin$ of the ladder's angle with the floor in metres and move $\\cos$ of it in metres closer to the wall. A steeper ladder raises $\\sin$ and shrinks $\\cos$.",
      },
      {
        title: "Sitting across a table",
        text: "Sit facing a friend across a table and the salt that is on your left is on their right, though nothing has moved. Switching to the other acute angle does the same: the leg that was opposite is now adjacent, and the other way round. That is why the sine of one angle is the cosine of the other.",
      },
    ],
    uses: [
      {
        title: "Finding a building's height",
        text: "Stand $20$ metres from a building and measure the angle up to its top, say $35^\\circ$, with a clinometer or a phone app. The height above your eye is the opposite leg and the $20$ metres is the adjacent, so it is $20 \\tan 35^\\circ \\approx 14.0$ metres. Add the height of your eye above the ground for the whole building.",
      },
      {
        title: "Cutting a rafter to length",
        text: "A roof pitched at $30^\\circ$ has to cover a run of $4$ metres from the wall to below the ridge. The run is the adjacent leg and the rafter is the hypotenuse, so the rafter is $\\frac{4}{\\cos 30^\\circ} \\approx 4.62$ metres long before the carpenter allows for the overhang.",
      },
      {
        title: "Moving a character in a game",
        text: "A character walks $5$ units per second in the direction it faces, at angle $\\theta$. Each second, the game moves it $5 \\cos \\theta$ across and $5 \\sin \\theta$ up. The walk is the hypotenuse; the two steps are its legs, and together they always cover exactly $5$ units.",
      },
    ],
  },
  fortyfive: {
    likes: [
      {
        title: "Folding a square napkin",
        text: "Fold a square napkin corner to corner and the two halves land exactly on each other, so the fold must cut each square corner into two equal halves of $45^\\circ$. Each half is a $45^\\circ$-$45^\\circ$-$90^\\circ$ triangle, and the fold line is its hypotenuse.",
      },
      {
        title: "Cutting across a square",
        text: "Crossing a square plaza with $100$ metre sides from one corner to the opposite one takes about $141$ metres on the diagonal, against $200$ metres round two sides. The diagonal is always $\\sqrt{2} \\approx 1.41$ times the side, whatever size the square is, which is why the ratios of the triangle never change when you resize it.",
      },
    ],
    uses: [
      {
        title: "The throw to second base",
        text: "A baseball diamond is a square with $90$ foot sides. A catcher throwing from home plate to second base throws along the diagonal, $90\\sqrt{2} \\approx 127.3$ feet, and that is the official distance between the two bases.",
      },
      {
        title: "Laying tiles on the diagonal",
        text: "Tilers sometimes turn square tiles by $45^\\circ$ for a diamond pattern. A $30$ centimetre tile then spans its diagonal, $30\\sqrt{2} \\approx 42.4$ centimetres, from point to point, and the cut tiles along each wall are $45^\\circ$-$45^\\circ$-$90^\\circ$ halves of a whole tile.",
      },
    ],
  },
  thirtysixty: {
    likes: [
      {
        title: "Halving a slice of pizza",
        text: "Cut a round pizza into six equal slices and each has a $60^\\circ$ point and two straight edges as long as the crust is wide, close to an equilateral triangle. Cut a slice in half from its point to the middle of the crust and each half is close to a $30^\\circ$-$60^\\circ$-$90^\\circ$ triangle. The comparison is only close because the crust is curved, while the triangle's base is straight.",
      },
      {
        title: "A clock at one o'clock",
        text: "At one o'clock the hour hand points $30^\\circ$ round from the twelve. Its tip sits exactly half the hand's length to the right of the line through the twelve. The hand is the hypotenuse, and the side opposite the $30^\\circ$ angle is always half the hypotenuse.",
      },
    ],
    uses: [
      {
        title: "Sizing a spanner for a nut",
        text: "A hexagonal nut is six equilateral triangles round its centre, and a spanner grips it across two flat sides. Each triangle halves into two $30^\\circ$-$60^\\circ$-$90^\\circ$ triangles, so for a nut with $6$ millimetre edges the width across the flats is $6\\sqrt{3} \\approx 10.4$ millimetres, while across the corners it is twice the edge, $12$ millimetres.",
      },
      {
        title: "A drafting set square",
        text: "Technical drawing sets come with two triangular set squares, and one is a $30^\\circ$-$60^\\circ$-$90^\\circ$ triangle. Sliding it along a straight ruler, a drafter draws lines at exactly $30^\\circ$, $60^\\circ$ and $90^\\circ$ without a protractor, which is how the standard isometric views of objects are drawn.",
      },
      {
        title: "Shadows in the evening",
        text: "When the sun is $30^\\circ$ above the horizon, your height is the short leg opposite $30^\\circ$ and your shadow the long leg, so your shadow is $\\sqrt{3} \\approx 1.73$ times your height. When the sun is $60^\\circ$ up, the legs trade places and your shadow is about $0.58$ times your height.",
      },
    ],
  },
  table: {
    likes: [
      {
        title: "Riding a Ferris wheel",
        text: "Think of the dial as a Ferris wheel with a radius of $1$, and of $B$ as your seat. As the wheel turns through $\\theta$ from level, your height above the axle is $\\sin\\theta$ and your distance out to the side is $\\cos\\theta$. Level with the axle you have no height; at the very top you have no sideways distance.",
      },
      {
        title: "Raising a drawbridge",
        text: "A drawbridge one unit long lifts from flat. Its tip rises $\\sin\\theta$ and reaches out $\\cos\\theta$ across the moat, and its steepness is $\\tan\\theta$, the rise for each unit across. Raised all the way to $90^\\circ$, it reaches nowhere across, so asking for its rise per unit across means dividing by zero: a straight-up bridge has no steepness number.",
      },
    ],
    uses: [
      {
        title: "Climbing a steep path",
        text: "Walkers can reckon height from a slope's angle using the table. On a path that climbs at $30^\\circ$, $\\sin 30^\\circ = \\frac{1}{2}$, so every $100$ metres walked along the path gains $50$ metres of height. At $45^\\circ$, the same walk gains about $71$ metres.",
      },
      {
        title: "Laying out a hexagon grid",
        text: "Many board games and strategy video games use a grid of hexagons. For hexagons measuring $1$ from centre to corner, the width across two flat sides is $2\\cos 30^\\circ = \\sqrt{3}$, so the centres of neighbouring hexes in a row sit $\\sqrt{3} \\approx 1.73$ apart. Programmers place every hex from these exact values.",
      },
    ],
  },
};
