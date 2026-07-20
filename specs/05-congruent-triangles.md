FIRST IMPLEMENTATION:
# Congruent Triangles
The question the page embodies: which measurements pin a triangle down?
The screen shows four cells — SSS, SAS, ASA, and SSA — each with the same fixed base AB and a free knob for the third vertex C.
In each cell the given measurements are drawn as dashed loci: a given side from A is a dashed circle around A, a given side from B a dashed circle around B, a given angle at A a dashed ray out of A, and so on.
Drag C anywhere; a small checklist in the cell compares each live measurement against its given value and ticks when it matches.
C can only satisfy all the givens where the loci intersect, and the knob snaps magnetically onto those spots, firing a pulse and filling the triangle when everything checks out.
For SSS, SAS, and ASA the loci cross at exactly one spot (SSS also shows the mirror spot across AB — the same triangle flipped), so the data force one triangle: that is what a congruence theorem is.
The SSA cell is the warning: its ray and circle cross at two different spots, and when C snaps onto either one the other triangle stays visible as a ghost — the same given data fit two genuinely different triangles, so there is no SSA theorem.
A panel in the upper left states the question and keeps score of which criteria pin the triangle and which do not.

FOR FUTURE IMPLEMENTATION:
AAS, HL, LL, and SA cells for right triangles.
Let the user pick which parts are "given" and discover the sufficient sets themselves.
