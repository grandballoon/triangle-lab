## Part One: Angles

See a triangle on the screen—drag its apex in order to induce acute, obtuse, or right angles. Have the selector-knob that the user grabs have a bit of give to it, so that the vertex can stay in one place while the knob drags slightly ahead of it—allowing the angle to "snap to right" and show a box marker when the angle hits 90 degrees, requiring the user to drag it slightly further before it becomes obtuse.

The name for the triangle type displays below the triangle, which is in the center on the screen. One triangle. 

This might need to include the proof that the sum of all the angles in a triangle is 180 degrees. It also might be good to display the inner angles and to highlight the angle which becomes 90 degrees, and then further distinguish it when it becomes obtuse:
    - provide a little "splash animation" on the right angle when it hits 90 degrees
    - Highlight the obtuse angle to distinguish it from the others and show that only one angle needs to be obtuse to make the triangle obtuse
    - Color-code all acute angles the same way, showing that an acute triangle has all of its angles acute.

## Part Two: Sides
FIRST IMPLEMENTATION:
STEP ONE (EQUILATERAL): The screen displays an Equilateral triangle with a knob on one corner. Drag it to resize the triangle; its sides and angles all display the same shape, color, and internal angle. Side lengths are displayed parallel to the sides themselves, outside the area of the triangle.

STEP TWO (ISOSCELES): The screen displays an isosceles triangle. The vertex angle can be pulled to heighten or lower the triangle, but the base angles remain fixed relative to one another. Or, one of the base angles can be pulled to widen or narrow the base, but the base angles maintain identical values and color-coding to each other regardless of the actual number, or the length of the sides. The triangle can be rotated freely, like the equilateral demo. 

STEP THREE (SCALENE): The screen displays a scalene triangle. It can be manipulated by a knob on any vertex; its only real requirement is that it never occupies a state of being equilateral or isosceles. If its angles or sides approach these ratios it simply skips over them.

FOR FUTURE IMPLEMENTATION:

Step One (Equilateral): Make a triangle with your hands. It will be hardcoded as equilateral, but can scale up and down as you move your hands apart. All three angles display the same color, shape, and degree in the inner angle.

Step Two (Isosceles): Make a triangle with your hands. Move them up and down to scale the equal sides higher or lower. The two base angles are highlighted, showing the same color, shape, and interior angle (which changes with the scaling function). The vertex angle displays it own unique color and interior angle (likewise scaled accurately with the movement).

Step Three (Scalene): Make a triangle with your hands. Move them in some manner TBD to skew the triangle and make it scalene.