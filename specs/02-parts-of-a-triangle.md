FIRST IMPLEMENTATION:
# Part One: Perimeter and semiperimeter
The screen displays 3 triangles of different sizes with sides and angles discreetly labeled, displaying their values. A knob appears on one vertex. Click-and-drag the knob along the sides to see the perimeter drawn and animated. Each side highlights in one color and changes to another color with a "snap" animation along the side and second angle upon filling. Its total value is then added to a box in the corner with a value for perimeter *p.* Trace the full triangle to show the value of p. s is calculated upon the completion of the figure.

# Part Two: Medians
The screen displays three triangles. On each, a small partial line segment points outward from each vertex. It displays a knob. Pull the knob towards the opposite side's midpoint. The segments can be pulled in arbitrary directions, but the length is capped to, say, 130% of their final value. Upon hitting the midpoint, the end of the segment briefly pulses once, and locks in place.  Upon the completion of all medians, the centroid, G, is highlighted with a slightly enlarged dot, and displays three brief pulses. 

# Part Three: Angle Bisectors
The page displays four triangles. A line is drawn from a vertex to a point on the opposite side, but does not bisect the angle. Each line has a knob attached to the opposite side; move it to move the interior line segment. The two interior angles formed by the would-be bisector display themselves as filled-in colored arcs. They are different colors until the line bisects the vertex at which point they change to the same color. The bisector can move to either side of its proper position; when it hits the right point, it pulses but does not lock.Each would-be bisector is displayed from the beginning. 

# Part Four: 

# Part Five: Altitudes
The screen displays thirty triangles, in rows that build on each other: the three basic classifications (acute, right, obtuse); symmetry and reach (equilateral, isosceles, very flat obtuse); the classic right triangles (45-45-90, 3-4-5, 30-60-90); a right triangle resting on its hypotenuse plus a knife-edge 89°/91° pair that shows *H* crossing straight through the vertex as the angle passes 90°; proportion studies (tall acute, wide acute, tilted scalene); and obtuse variations (obtuse isosceles, obtuse at *A*, and a flipped obtuse).
The last four rows are an obtuse gallery: a 100°-110°-120°-130°-140° progression over the same base that sends the feet up the extensions and *H* marching away, the golden gnomon (36-36-108), label and orientation variants (obtuse at *B*, pointing left, pointing right), the classic obtuse figure (extend *BC* to *D* so altitude *AD* can land), an obtuse triangle with a vertical side (making one altitude horizontal), and a closing scalene.
They live in a geometry space several screens tall: scroll the wheel or drag empty space to pan vertically, while the webcam view, header, and triangle sizes stay fixed.
A slim scrollbar on the right edge and a fading "scroll for more" hint at the bottom signal the extra space.
On each triangle, every vertex sprouts a short outward stub carrying a knob.
Pull the knob through the triangle to drop a perpendicular onto the line containing the opposite side; a dashed ring marks the foot.
The segment follows the hand in any direction, but its length is capped at 130% of the finished altitude.
When the free end reaches the foot, the altitude pulses once, locks along the true perpendicular, shows a right-angle marker at its foot, and is labeled *h(sub)a*, *h(sub)b*, or *h(sub)c*.
On the obtuse triangle, the sides whose feet fall outside them show dashed extensions from the start, exactly like the classic extension of *BC* to *D*.
When all three altitudes lock, the orthocenter *H* lights up with three brief pulses: inside the acute, equilateral (where it coincides with the centroid *G*), and isosceles (where it rides the axis of symmetry) triangles, exactly on the right-angle vertex of the right triangle, and outside the obtuse triangles, where dashed extensions of the altitude lines show that only the lines, not the segments, are concurrent — the flatter the triangle, the farther *H* flies.
A caption under each triangle states where *H* landed, answering the closing question about the right triangle.
The page also carries a "Notes & solutions" drawer that elaborates the concept and works through the circumcenter, circumradius, and median-to-hypotenuse facts for right triangles.


FOR FUTURE IMPLEMENTATION:
# Part One: Perimeter and semiperimeter
The screen displays triangles of different sizes (altogether or one at a time—TBD) with sides and angles discreetly labeled, displaying their values. Trace the edge with your forefinger to see the perimeter drawn and animated. Each side highlights in one color and changes to another color with a "snap" animation along the side and second angle upon filling. Its total value is then added to a box in the corner with a value for perimeter *p.* Trace the full triangle to show the value of p. s is calculated upon the completion of the figure.

# Part Two: Medians
The screen displays a triangle. A small partial line segment points outward from the midpoint of one side. "Slash" with your hand from the midpoint to the opposite vertex to complex the median, with some animated flair. (Think Fruit Ninja.) A right angle indicator displays on each completed median, if and only if it is a right angle. Upon the completion of all medians, the centroid, G, is highlighted. 

(This may need to include the proof that the three medians are concurrent.)
Medians are not necessarily bisectors of their respective angles. Nor are they necessarily perpendicular to their respective median.

Each median is then transferred "out" of the triangle in a brief, discreet animation, with the point at which it meets the centroid marked, and the 2:1 ratio is displayed via a color highlighting animation.

# Part Three: Angle Bisectors
This takes place over several triangles: a line is drawn from a vertex to a point on the opposite side, but does not bisect the angle. Move your hand parallel to the opposite side to move the interior line segment. The two new interior angles formed by the would-be bisector display themselves as filled-in colored arcs. They are different colors until the line bisects the vertex at which point they change to the same color. Hold the line for a brief pause to "set" it. A brief animated flash indicates the concrete setting, and the user is instructed to proceed to the next vertex. A new would-be bisector appears. This process is repeated for triangles of several different kinds. 

For the proof that the bisectors are concurrent: 

A point appears within the triangle; lines are drawn to each side. move your index finger to navigate it within the triangle. Lines which are the same distance from a given side are highlighted in the same color. When all the colors and distances are the same, the bisector "centroid" is "set" and displays a brief animated flash. This repeats across triangles of several different shapes.

Additionally: 

A point appears with pre-calculated radius r extending to one side, but not others. Move your forefinger in a circular motion to cause the radius to rotate about the point—as it collides with other sides, it bumps the center around the area of the triangle until it "locates" its own natural center. When it does, the radius rotates freely and inscribes the incircle. 

# Part Four: Perpendicular Bisectors
Same as bisectors, but with triangles that produce perpendicular bisectors, I guess? Some kind of animation indicates that these bisectors are "the set of points which are equidistant from the two endpoints" of the side, as opposed to equidistant from the two other sides (as in the case of the angle bisector).

Indicate that the perpendicular bisectors are at a right angle to their respective sides.

(This will need a diagram showing both the triangle and the circumcircle which is external to it, which I haven't built before.)

# Altitudes
