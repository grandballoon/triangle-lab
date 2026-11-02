// What the standalone lesson pages say around their steps, keyed by slug:
// what each idea is like, and what it is used for. A lab lesson gives its own
// (LessonView in lab/scene.ts); a standalone page's steps live apart from its
// module (directions.ts), and so do these. page.ts shows them after the steps.
// Text may hold `$…$` LaTeX.

import type { Asides } from "./lab/scene.ts";

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
      },
      {
        title: "Building a wheelchair ramp",
        text: "Seen from the side, a ramp is a right triangle: the ground, the rise up to the door and the sloping surface. US accessibility rules allow at most $1$ unit of rise for every $12$ units along the ground, which keeps the angle at the foot of the ramp under about $4.8^\\circ$, a very acute angle. The angle at the top is then about $85.2^\\circ$, since the three share $180^\\circ$ with the right angle.",
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
      },
      {
        title: "Bridges built from triangles",
        text: "A Warren truss, a common design for steel footbridges and railway bridges, is a row of equilateral triangles between two long beams. A triangle with fixed sides cannot change shape, unlike a square, which can lean over into a rhombus. Making every triangle equilateral means every strut is the same length, so the parts can be cut and made identically.",
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
      },
      {
        title: "Marking a right angle with string",
        text: "To mark a path running square off a garden wall, peg two points on the wall the same distance either side of where the path should start, say $2$ metres each way. Tie equal lengths of string to both pegs and pull them until their ends meet. The strings and the wall make an isosceles triangle, and the line from where the strings meet to the midpoint between the pegs is at $90^\\circ$ to the wall.",
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
      },
      {
        title: "Measuring an odd-shaped garden",
        text: "Garden designers often measure an irregular plot by fixing two pegs a known distance apart and running a tape from both pegs to each corner of the plot. Each corner and the two pegs form a triangle whose three sides are now known, usually all different, and those three lengths fix exactly where the corner sits on the plan.",
      },
    ],
  },
  perimeter: {
    likes: [
      {
        title: "Walking round the block",
        text: "Walk once round a triangular block and back to your front door, and the distance on your step counter is the perimeter: each street's length added on as you finish it. Your total only ever grows, one side at a time, exactly like the running $p$ in the formulas.",
      },
      {
        title: "Meeting a friend halfway round",
        text: "You and a friend start at the same corner and walk round the block in opposite directions at the same pace. You meet exactly halfway round, so each of you has walked the semiperimeter $s$, and together you have covered the whole perimeter $p = 2s$.",
      },
    ],
    uses: [
      {
        title: "Buying fencing",
        text: "A triangular corner plot has sides of $9$, $12$ and $15$ metres. Fencing it all the way round takes $9 + 12 + 15 = 36$ metres of fence, which is what you would order before allowing a little extra for posts and offcuts.",
      },
      {
        title: "Binding the edge of a quilt",
        text: "Quilters finish a quilt by sewing a strip of fabric, the binding, all the way round its edge. To know how long a strip to cut, they add up the lengths of every side, the perimeter, and then add some extra for turning the corners and joining the ends.",
      },
      {
        title: "Area from three sides",
        text: "Heron's formula finds a triangle's area from its sides alone, using the semiperimeter: $\\text{Area} = \\sqrt{s(s - a)(s - b)(s - c)}$. For the $9$, $12$, $15$ plot, $s = 18$ and the area is $\\sqrt{18 \\cdot 9 \\cdot 6 \\cdot 3} = 54$ square metres. Surveyors can use this to find the area of a plot from three tape measurements, with no angles needed.",
      },
    ],
  },
  medians: {
    likes: [
      {
        title: "Cutting a sandwich fairly",
        text: "Cut a triangular sandwich from one corner to the middle of the opposite crust and the two pieces hold the same amount of sandwich. Each piece has half the crust as its base and the same height up to the corner, so their areas match even though their shapes do not. That cut is a median.",
      },
      {
        title: "Balancing a tray on one finger",
        text: "A flat cardboard triangle balances on the edge of a ruler laid along any median, because the two sides of that line hold equal area. The three balance lines cross at one point, the centroid $G$, and the triangle balances flat on a fingertip placed there. This only works while the card is the same thickness all over; a lopsided weight moves the balance point.",
      },
    ],
    uses: [
      {
        title: "Finding a triangle's centre in a game",
        text: "Game engines and graphics programs often need a single point to stand for a triangle, for example to place a label or to sort triangles by distance. They use the centroid, which is simply the average of the three corners. For corners $(0, 0)$, $(6, 0)$ and $(0, 9)$, the centroid is $\\left(\\frac{0 + 6 + 0}{3}, \\frac{0 + 0 + 9}{3}\\right) = (2, 3)$.",
      },
      {
        title: "Hanging a triangular sign level",
        text: "A flat triangular sign or a piece of a hanging mobile, made of one even material, has its centre of mass at the centroid. Hang it from a pivot at that point and it stays balanced whichever way it is turned, with no corner dipping down. To find that point on a cut-out, you only need to draw two medians and mark where they cross.",
      },
    ],
  },
  bisectors: {
    likes: [
      {
        title: "Halving a slice of pie",
        text: "To share a slice of pie, cut it from the tip so both pieces have the same angle at the point. That cut is the angle bisector. The comparison stops at the crust: if the slice is lopsided, with one straight edge longer than the other, the two pieces get the same angle but not the same amount of pie.",
      },
      {
        title: "Walking out of a room's corner",
        text: "Stand in the corner of a room and walk out so that you always stay as far from one wall as from the other. Your path is the angle bisector of the corner. Every point on it is the same distance from both walls, and every point off it is closer to one wall.",
      },
    ],
    uses: [
      {
        title: "Mitring a picture frame",
        text: "Each corner of a picture frame is $90^\\circ$, and the two pieces of moulding meet along the corner's bisector, each cut at $45^\\circ$. Cutting both at half the corner angle makes their ends exactly the same length, so the decorative profile lines up all the way round the joint.",
      },
      {
        title: "Where a goalkeeper stands",
        text: "Goalkeepers in football and hockey are coached to stand on the line that bisects the angle between the ball and the two goalposts. From the ball's point of view, the keeper then covers the same angle of goal on each side, leaving no easier side to shoot at.",
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
      },
      {
        title: "Bouncing off a wall in a game",
        text: "To tell whether a ball has hit a wall, a game measures the distance from the ball's centre to the wall along the perpendicular, the altitude from that point to the wall's line. If that distance is less than the ball's radius, they touch. If the foot of the perpendicular lands past the end of the wall, outside it, the game checks the nearest end of the wall instead.",
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
      },
      {
        title: "How sat navs find routes quickly",
        text: "Route-finding programs often use the straight-line distance to the destination as a guess of how far is still left to drive. That guess is never too big, because a road from one place to another can never be shorter than the straight line between them. Knowing the guess is never too big lets the program skip routes that cannot win, while still being sure it finds the shortest one.",
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
      },
      {
        title: "Screen sizes",
        text: "A screen's size is the length of its diagonal. A $55$-inch widescreen television is about $47.9$ inches wide and $27.0$ inches tall, and $47.9^2 + 27.0^2 \\approx 55^2$. Knowing this, you can check whether a television will fit a cabinet from its advertised size and shape alone.",
      },
      {
        title: "Distance in a game",
        text: "A game deciding whether an enemy is close enough to notice the player works out the distance from the gaps across and up. An enemy $3$ units to the right and $4$ units ahead is $\\sqrt{3^2 + 4^2} = 5$ units away. Many games skip the square root and compare $3^2 + 4^2 = 25$ with the square of the sight range, which is quicker and gives the same answer.",
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
      },
      {
        title: "Measuring across a river",
        text: "To find how wide a river is without crossing it, stand opposite a tree on the far bank and walk along your bank, say $30$ paces, and plant a stick. Walk another $30$ paces and turn to walk straight away from the river until the stick lines up with the tree. The triangle you walked has a right angle, a side of $30$ paces and a matching vertical angle at the stick, so by ASA it is a copy of the one across the river, and your walk away from the bank equals the river's width.",
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
      },
      {
        title: "Reading a map",
        text: "A map at $1 : 25000$ shrinks every distance by the same factor, so any triangle of towns on the map is similar to the real one. Its angles are the true angles, which is why a compass bearing measured on the map works on the ground, and $4$ centimetres on the map is $4 \\cdot 25000 = 100000$ centimetres, or $1$ kilometre, on the ground.",
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
