FIRST IMPLEMENTATION:
# The Triangle Inequality
The screen displays six triangles of different characters (right 3·4·5, equilateral, isosceles 5·5·6, obtuse, nearly flat, tall scalene) in a grid, each with its sides labeled *a*, *b*, *c* (per the standard convention a = BC, b = CA, c = AB) and its live length.
Click on a side to designate it as selected.
On selection, a dotted circle appears around each end of the side — the locus that end can travel while the side keeps its length — and both ends grow knobs.
Grab a knob to rotate the side rigidly around its other vertex; the free end rides the dotted circle and the third side stretches or shrinks after it.
During the drag, only the pivot's circle shows, brighter, with two small red dots marking where the moving vertex crosses the line through the other two vertices — the degenerate spots where one side exactly equals the sum (or the difference) of the other two.
The drag snaps onto those spots so exact equality is reachable, firing a red pulse on arrival.
A small window in the upper-left portion of the screen shows the selected triangle's *a*, *b*, *c* and all three inequalities (b + c > a, a + c > b, a + b > c) with live values, each colored by its slack: comfortable, tightening, or equal (degenerate).
As a triangle approaches degeneracy its idle sides blush toward red and its caption warns "almost flat", then "degenerate: a straight line" at equality.
Triangles rest wherever they are left, including flat — that is the lesson.

FOR FUTURE IMPLEMENTATION:
Pinch the moving vertex with forefinger and thumb (hand tracking) to swing the side instead of the mouse.
Work a solved example and a follow-up exercise in a notes drawer, including the 1 cm / 8 cm / 11 cm construction that motivates the topic.
