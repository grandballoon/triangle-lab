FIRST IMPLEMENTATION:
# The Pythagorean Theorem
The left side of the screen shows one right triangle with its right angle marked at C, a knob on each acute vertex, and a square built outward on each of its three sides.
Dragging the knobs resizes the two legs, and the squares follow, each labeled with its live area (a², b², c²).
A panel in the upper left shows the equation a² + b² = c² with the live numbers, plus the resulting c = √(a² + b²).
The right side of the screen shows the proof: a single big square of side a + b containing four congruent copies of the triangle, with a scrub knob on a track beneath it.
At one end of the scrub the four triangles pair into two rectangles and the leftover space is visibly two squares of areas a² and b²; at the other end the same four triangles sit in the corners and the leftover space is one tilted square of area c².
Every triangle travels by pure translation, so scrubbing slides them smoothly between the two packings: same box, same four triangles, so the leftovers must be equal.
Reaching either end of the scrub snaps and fires a pulse, and the leftover regions light up with their labels.
Resizing the legs reshapes the proof square live, so the argument is seen to work for every right triangle, not one drawing.

FOR FUTURE IMPLEMENTATION:
Pythagorean triples: snap the legs onto integer pairs (3·4, 5·12, 8·15) and celebrate when c lands on an integer too.
The similar-triangles proof (altitude to the hypotenuse) as an alternative scrub.
