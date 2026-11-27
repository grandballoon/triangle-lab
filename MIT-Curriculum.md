# MIT Challenge Curriculum

The topics of the math and computer science courses in Scott H. Young's [MIT Challenge](https://www.scotthyoung.com/blog/myprojects/mit-challenge-2/), in the order he took them, as a list to build lessons from.
Each course is broken into units, and each unit into concepts: ideas a lesson can teach, not lectures.
A concept belongs to the first course that teaches it; a later course that uses it says "(revisits …)".

The physics, chemistry, biology and economics courses, 6.013 Electromagnetics and 24.244 Modal Logic are left out, as in luaturtleweb's `/compsci` page (`spec-compsci.md` in luaturtleweb), which chose the courses, their editions and their references.
The same rule holds here: a course's calendar decides only which ideas are taught and in what order, and every lesson's words, figures and examples are our own.

Compiled 2026-11-27 from each course's calendar or lecture list.
The units are our own grouping wherever a course names none, which is most of them.
Concept names were written from lecture titles, so a concept inside a unit may be named more loosely than the lecture it came from.

## Editions

Most topic orders come from the edition Scott took.
These do not, because web.archive.org could not be reached when the list was made, and the live pages for the edition he took are gone:

| Course | Edition Scott took | Read instead |
| --- | --- | --- |
| 6.042J | OCW, Spring 2010 | OCW, Fall 2010 (same lecturers) |
| 6.003 | OCW, Spring 2010 | OCW, Fall 2011 |
| 6.033 | OCW, Spring 2009 | The course's own Spring 2009 schedule on web.mit.edu (same edition) |
| 6.837 | OCW, Fall 2003 | OCW, Fall 2012 |
| Theory of Computation | Georgetown COSC 545, Spring 2012 | Nothing yet: its topics are still to be read |

6.046J was always going to be the Spring 2015 OCW edition, since Scott's Fall 2011 site needs an MIT login.
The archived pages to recheck these against are listed in luaturtleweb's `spec-compsci.md`.

## Courses

### 1. 18.01 Single Variable Calculus
Topic order from: [OCW, Fall 2006 calendar](https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/pages/calendar/)
Lectures: 31.

1. **Derivatives**: the derivative as slope and rate of change; limits and continuity; trigonometric limits; derivatives of products and quotients; derivatives of sine and cosine; chain rule; higher derivatives; implicit differentiation; inverse functions and their derivatives; exponentials and logarithms; logarithmic differentiation; hyperbolic functions
2. **Applications of Differentiation**: linear and quadratic approximation; curve sketching; max-min optimization; related rates; Newton's method; mean value theorem and inequalities; differentials; antiderivatives; separable differential equations
3. **Integration**: definite integral as a limit of sums; first fundamental theorem of calculus; second fundamental theorem of calculus; logarithm defined by an integral; areas between curves; volumes by disks and shells; work; average value; probability densities; numerical integration
4. **Techniques of Integration**: trigonometric integrals; trigonometric substitution; completing the square; partial fractions; integration by parts and reduction formulas; parametric curves and arclength; surface area of revolution; polar coordinates and polar area
5. **Indeterminate Forms and Series**: indeterminate forms and L'Hopital's rule; improper integrals; infinite series and convergence tests; Taylor series

*Notes:* Recitations, reviews and exams are left out. The calendar puts sessions 34–38 under Techniques of Integration; they are a unit of their own here. Session 21, on logarithms and geometry, is folded into the integration unit.

### 2. 18.02 Multivariable Calculus
Topic order from: [OCW, Fall 2007 calendar](https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/pages/calendar/)
Lectures: 33.

1. **Vectors and Matrices**: vectors; dot product; determinants; cross product; matrices and inverse matrices; square linear systems; equations of planes; parametric lines and curves; velocity and acceleration
2. **Partial Derivatives**: level curves and partial derivatives; tangent plane approximation; max-min problems and least squares; second derivative test; boundary and infinity cases; differentials; chain rule; gradient; directional derivative; Lagrange multipliers; non-independent variables; partial differential equations
3. **Double Integrals and Line Integrals in the Plane**: double integrals; polar coordinates in double integrals; change of variables and Jacobians; vector fields; line integrals; path independence and conservative fields; potential functions; Green's theorem; flux and the normal form of Green's theorem; simply connected regions
4. **Triple Integrals and Surface Integrals**: triple integrals in rectangular and cylindrical coordinates; spherical coordinates; surface area; surface integrals and flux; divergence theorem; line integrals in space; curl; exactness and potentials in space; Stokes' theorem
5. **Topology and Vector Fields**: topology of regions and when the theorems apply

*Notes:* Reviews and exams are left out; lectures 15, 24 and 32 share a session with a review but bring new material. Lecture 33 has no unit heading on the calendar.

### 3. 6.01 Introduction to EECS I
Topic order from: [OCW, 6.01SC Spring 2011](https://ocw.mit.edu/courses/6-01sc-introduction-to-electrical-engineering-and-computer-science-i-spring-2011/pages/syllabus/)
Lectures: 13 (topic sections; the self-paced course has no numbered lectures).

1. **Software engineering**: Python basics (types, bindings, functions, loops, lists); object-oriented programming; state machines
2. **Signals and systems**: signals and system abstraction; linear time-invariant systems; characterizing system performance; designing control systems
3. **Circuits**: resistive circuits and circuit analysis; op-amps; circuit abstractions
4. **Probability and planning**: discrete probability; state estimation; search algorithms; optimizing a search

*Notes:* A self-paced course with no numbered lectures: the count is its topic sections, with the Python tutorial folded into the first unit.

### 4. 18.03 Differential Equations
Topic order from: [OCW, Spring 2010 calendar](https://ocw.mit.edu/courses/18-03-differential-equations-spring-2010/pages/calendar/)
Lectures: 36.

1. **First-Order Differential Equations**: direction fields; existence and uniqueness; numerical methods; linear equations and models; integrating factors; complex numbers and roots of unity; complex exponentials; sinusoidal input response, gain and phase lag; autonomous equations and stability on the phase line; linear versus nonlinear
2. **Second-Order Linear Equations**: characteristic polynomial and modes; damped vibrations; exponential response formula; complex gain; operators and undetermined coefficients; resonance; frequency response; LTI systems and superposition; RLC circuits
3. **Fourier Series and Laplace Transform**: Fourier series; operations on Fourier series; periodic solutions and resonance; step and delta functions; step and impulse response; convolution; Laplace transform and its properties; solving ODEs with Laplace transforms; completing the square for second-order equations; pole diagram; transfer function and frequency response
4. **First-Order Systems**: linear systems and matrices; eigenvalues and eigenvectors; complex or repeated eigenvalues; phase plane behavior; normal modes and the matrix exponential; nonlinear systems; linearization near equilibria; nonlinear pendulum; limit cycles and chaos

*Notes:* The calendar has no lectures 10 or 31. Its third unit is headed Fourier series but also holds the Laplace transform. Separable equations revisit 18.01 and linear systems revisit 18.02 only loosely, so they are not marked.

### 5. 6.02 Introduction to EECS II
Topic order from: [MIT 6.02 Spring 2009 calendar](http://web.mit.edu/6.02/www/s2009/calendar.html)
Lectures: 26.

1. **Digital communication over a channel**: communication metrics and the digital abstraction; sending bits on real wires (inter-symbol interference, eye diagrams); LTI channel models and superposition; unit-sample response and convolution; deconvolution; noise and Gaussian models; normal random variables and bit-error rates; decision feedback equalization
2. **Coding and error control**: error detection (Hamming distance, parity, checksums, CRCs); block error-correcting codes; interleaving; convolutional codes; Viterbi decoding
3. **Frequency-domain view and modulation**: sharing a channel with sinusoids; frequency response and filters; poles and zeros; Fourier series and the DFT; amplitude modulation and frequency-division multiplexing; modulation schemes
4. **Networks**: switching and resource sharing; time-division multiplexing; slotted vs. contention protocols; CSMA; network layer addressing, forwarding, routing; transport layer reliable delivery and windowing; designing large networks
5. **Source coding**: lossless compression and variable-length codes; lossy and perceptual coding

*Notes:* The calendar gives weeks only, and lecture 26, a wrap-up, is left out.

### 6. 6.042J Mathematics for Computer Science
Topic order from: [OCW, Fall 2010 calendar (current OCW site)](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/pages/calendar/)
Lectures: 25.

1. **Proofs and induction**: what a proof is and proof methods; ordinary induction; strong induction and well ordering
2. **Number theory**: divisibility and primes; modular arithmetic and gcd; inverses and Euler's theorem
3. **Graph theory**: graph basics and coloring; matching problems; minimum spanning trees; communication network design; further graph topics
4. **Relations and scheduling**: relations; partial orders; scheduling with precedence constraints
5. **Sums and recurrences**: closed forms for sums; asymptotic notation and estimating sums; divide-and-conquer recurrences; linear recurrences
6. **Counting**: basic counting rules; counting with overlaps and repeated choices
7. **Probability**: sample spaces and events; conditional probability; independence; random variables
8. **Expectation and deviation**: expected value and linearity; expectation of products and applications; large deviation bounds; random walks

*Notes:* Read from the Fall 2010 edition, with the same lecturers, since Spring 2010 is only on web.archive.org (see Editions); its order may differ slightly. The number theory units are grouped from lecture titles.

### 7. 6.006 Introduction to Algorithms
Topic order from: [OCW, Spring 2008 calendar](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2008/pages/calendar/)
Lectures: 25.

1. **Foundations**: algorithm analysis via document distance; asymptotic notation (revisits 6.042J); mergesort and its recurrence
2. **Binary search trees**: BST operations; scheduling example; balancing with AVL trees and rotations
3. **Hashing**: hash tables with chaining; hash functions; table doubling; rolling hash and Karp-Rabin; open addressing
4. **Sorting**: heaps and priority queues; heapsort; comparison-sort lower bound; counting sort; radix sort and stability
5. **Graph searching**: graph representations; breadth-first search; depth-first search; topological sort
6. **Shortest paths**: shortest-path basics and relaxation; Bellman-Ford and negative cycles; Dijkstra; Dijkstra speedups
7. **Dynamic programming**: memoization and the Fibonacci example; guessing and subproblems; longest common subsequence; text justification and parenthesization; knapsack and pseudopolynomial time; DP on trees; vertex cover and dominating set
8. **Numerics**: numeric algorithms and precision; fast multiplication and Newton-style methods; matrix multiplication ideas
9. **Where to go next**: follow-on classes; geometric folding algorithms

*Notes:* The calendar names the two numerics lectures only as Numerics I and II, so their concepts are inferred from the recitations, which name Strassen's matrix multiplication. Lecture 25 is a look ahead, not a concept.

### 8. 18.06 Linear Algebra
Topic order from: [OCW, Spring 2010](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/)

1. **Solving linear equations**: Linear combinations; Row and column pictures; Elimination; Matrix multiplication; Inverse matrices; LU factorization; Transposes and permutations
2. **Vector spaces and subspaces**: Vector spaces and subspaces; Column space; Nullspace; Rank and the complete solution; Independence, basis and dimension; The four fundamental subspaces; Rank one matrices; Graphs and incidence matrices
3. **Orthogonality**: Orthogonal vectors and subspaces; Projections; Least squares; Orthonormal bases and Gram–Schmidt
4. **Determinants**: Properties of the determinant; Determinant formulas and cofactors; Cramer's rule, inverses and volume
5. **Eigenvalues and eigenvectors**: Eigenvalues and eigenvectors; Diagonalization and powers; Differential equations and the matrix exponential; Markov matrices; Fourier series
6. **Symmetric and positive definite matrices**: Symmetric matrices; Complex matrices and the fast Fourier transform; Positive definite matrices; Similar matrices and Jordan form
7. **Singular values and linear transformations**: The singular value decomposition; Linear transformations; Change of basis and compression; Left, right and pseudoinverses

*Notes:* Taken from luaturtleweb's `/compsci` page (`public/compsci/courses/18-06.json`), where this course is already filled in with summaries, equations, metaphors and applications.

### 9. 6.041 Probabilistic Systems Analysis
Topic order from: [OCW, Spring 2006 calendar](https://ocw.mit.edu/courses/6-041-probabilistic-systems-analysis-and-applied-probability-spring-2006/pages/calendar/)
Lectures: 24.

1. **Probability basics**: probability models and axioms; conditional probability and Bayes' rule; independence; counting
2. **Discrete random variables**: PMFs and expectation; conditional expectation; multiple discrete random variables and joint PMFs
3. **Continuous random variables**: PDFs and CDFs; derived distributions; convolution and sums of independent variables; transforms (moment generating functions)
4. **Expectation tools and estimation**: iterated expectations and conditional variance; sum of a random number of random variables; prediction; covariance and correlation
5. **Limit theorems**: weak law of large numbers; central limit theorem; strong law of large numbers
6. **Random processes**: Bernoulli process; Poisson process; Markov chains (classification, steady state, absorption)

*Notes:* Lectures 1–23 plus 13A, on a sum of a random number of random variables.

### 10. 6.002 Circuits and Electronics
Topic order from: [OCW, 6.002 Spring 2007 calendar](https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/pages/calendar/)
Lectures: 25.

1. **Circuit fundamentals**: lumped abstraction; KVL and KCL; nodal analysis; linearity and superposition; Thevenin equivalents
2. **Digital abstraction and MOS devices**: digital abstraction; MOS switch models; MOS gate design; nonlinear resistors and networks; small-signal analysis
3. **Amplifiers**: dependent sources and analog amplification; MOS SCS model; large-signal amplifier analysis; small-signal amplifier analysis; small-signal circuit models
4. **Energy storage and dynamics**: capacitors and first-order circuits; intuitive analysis of first-order systems; digital memory and state; second-order transients; damped second-order systems
5. **Sinusoidal steady state**: frequency response; impedance methods; filters and Q factor
6. **Op-amps and feedback**: op-amp abstraction; feedback and the noninverting amplifier; summing, integrating, differentiating circuits; stability, oscillators, clocking
7. **Power and limits of abstraction**: energy and power; breaking the abstraction barrier

*Notes:* Quizzes and recitations are left out.

### 11. 6.046J Design and Analysis of Algorithms
Topic order from: [OCW, Spring 2015 calendar](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/pages/calendar/)
Lectures: 24.

1. **Divide and conquer**: course overview and interval scheduling; convex hull; median finding; fast Fourier transform; van Emde Boas trees
2. **Amortization and randomization**: amortized analysis; randomized matrix multiply; randomized quicksort; skip lists; universal and perfect hashing
3. **Dynamic programming and augmentation**: range trees; advanced dynamic programming; all-pairs shortest paths
4. **Greedy and incremental improvement**: minimum spanning trees; max flow and min cut; bipartite matching
5. **Linear programming and complexity**: linear programming and simplex; P, NP, and NP-completeness reductions; approximation algorithms; fixed-parameter algorithms
6. **Distributed algorithms**: synchronous symmetry breaking; synchronous shortest-path spanning trees; asynchronous shortest-path spanning trees
7. **Cryptography**: cryptographic hash functions; encryption
8. **Cache-oblivious algorithms**: cache-oblivious medians and matrix multiplication; cache-oblivious searching and sorting

*Notes:* Recitations are left out. Lecture 9, range trees, comes before the dynamic programming lectures and shares their unit. NP-completeness touches 6.006 and 6.042J only lightly, so it is not marked as a revisit.

### 12. 6.034 Artificial Intelligence
Topic order from: [OCW, Fall 2010 calendar](https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/pages/calendar/)
Lectures: 23.

1. **Reasoning and search**: goal trees and problem reduction; rule-based expert systems; depth-first, hill climbing and beam search; optimal search, branch and bound, A*; game playing with minimax and alpha-beta
2. **Constraints**: line drawing interpretation; constraint search and domain reduction; visual object recognition
3. **Learning**: nearest neighbors; identification trees and disorder; neural nets and backpropagation; genetic algorithms; sparse spaces and phonology; near misses and felicity conditions; support vector machines; boosting
4. **Representations and architectures**: classes, trajectories and transitions; cognitive architectures (GPS, SOAR, Subsumption, Society of Mind); the AI business
5. **Probabilistic inference**: probabilistic inference and Bayes nets (revisits 6.041); model merging and cross-modal coupling

*Notes:* Lecture 1, the introduction, is left out.

### 13. 6.003 Signals and Systems
Topic order from: [OCW, 6.003 Fall 2011 calendar](https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/pages/calendar/)
Lectures: 25.

1. **Discrete-time systems and feedback**: signals and systems; difference equations and block diagrams; feedback, poles, and fundamental modes
2. **Continuous-time systems**: differential equations and block diagrams; Z transform; Laplace transform; discrete approximation of continuous-time systems; convolution
3. **Frequency response and control**: frequency response; feedback and control; Bode plots; continuous-time feedback and control
4. **Fourier representations**: Fourier series; Fourier transform; discrete-time Fourier representations; relations among Fourier representations; applications of Fourier transforms
5. **Sampling and modulation**: sampling; quantization; amplitude modulation; audio CD as a worked system

*Notes:* Read from the Fall 2011 edition, since Spring 2010 is only on web.archive.org (see Editions); its order may differ. Concepts inside each unit are inferred from lecture titles.

### 14. 6.004 Computation Structures
Topic order from: [OCW, Spring 2009](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2009/pages/calendar/)
Lectures: 25.

1. **Digital foundations**: information and encoding; the digital abstraction and voltage-based signaling; combinational logic; CMOS gates and timing; canonical forms, synthesis and simplification
2. **Sequential logic and timing**: sequential circuits; storage elements; finite state machines; synchronization and metastability; pipelining, throughput and latency; multiplier design case study
3. **Instruction set architecture**: the Beta instruction set; compilation to machine code; machine-language programming issues; models of computation and programmable architectures; stacks and procedure calls
4. **Processor implementation**: non-pipelined Beta datapath and control; pipelined Beta and bypassing; pipeline hazards, delay slots, annulment; exceptions in pipelines
5. **Memory hierarchy**: multilevel memories, locality and performance; cache organization; cache design tradeoffs; virtual memory mapping, protection and contexts
6. **Operating system and I/O**: virtual machines and timesharing; OS kernels and supervisor calls; device I/O and interrupt handlers; preemptive interrupts and real-time constraints; buses, networks and protocols
7. **Concurrency and parallelism**: communicating processes; semaphores and synchronization; atomicity and deadlock; parallel processing, shared memory and cache coherence; memory consistency criteria

*Notes:* Lecture 1, an overview, and lecture 25, a wrap-up, add little of their own.

### 15. 24.241 Logic I
Topic order from: [OCW, Fall 2009](https://ocw.mit.edu/courses/24-241-logic-i-fall-2009/pages/calendar/)
Lectures: 25.

1. **Sentential logic basics**: arguments and logical connectives (revisits 6.042J); truth-functionality; syntax and semantics of sentential logic; translating English into sentential logic; trouble with conditionals
2. **Truth tables and semantic properties**: truth tables for compound sentences; logical properties (tautology, contradiction, contingency); entailment, validity and equivalence via truth tables (revisits 6.042J)
3. **Sentential derivations**: natural-deduction derivations (SD); extended derivation rules (SD+); proving theorems
4. **Metatheory of sentential logic**: metatheory and mathematical induction (revisits 6.042J); soundness of SD/SD+; completeness of SD/SD+
5. **Predicate logic and translation**: quantifiers, variables, constants, predicates, universe of discourse; open sentences, free and bound variables, scope; multiple quantifiers; definite descriptions; properties of relations; identity; functions; translating to and from predicate logic, "most" and donkey sentences
6. **Predicate logic semantics**: informal semantics (interpretations, quantificational truth, consistency, equivalence, validity); formal semantics (extensions, variable assignments, satisfaction)
7. **Predicate derivations**: derivations in PD; PD+ and identity rules (PDE); derivation strategy in PDE
8. **Metatheory of predicate logic**: soundness of PD, PD+, PDE; completeness of PD; completeness for PD+ and PDE

*Notes:* Lecture 25 is a review and lecture 8 partly one; both are left out.

### 16. 6.033 Computer System Engineering
Topic order from: [6.033 Spring 2009 course schedule (MIT web site)](https://web.mit.edu/6.033/2009/wwwdocs/schedule.shtml)
Lectures: 26.

1. **Complexity and modularity**: what systems are; sources of complexity; abstraction; naming; client/server modularity; operating system structure; clients and servers within one computer; threads and virtualizing processors; performance
2. **Networking**: network basics; layering and the link layer; network layer and routing; end-to-end layer; congestion control; distributed naming
3. **Fault tolerance and transactions**: reliability; atomicity concepts; recoverability and logging; isolation; multi-site atomicity; consistency and replication
4. **Security**: security threats and goals; authentication; cryptographic protocols; authorization and confidentiality
5. **Design wrap-up**: systems design experience; managing complexity revisited

*Notes:* Read from the course's own Spring 2009 schedule on web.mit.edu, since the OCW pages for that edition are gone (see Editions).

### 17. 24.242 Logic II
Topic order from: [OCW, Spring 2004](https://ocw.mit.edu/courses/24-242-logic-ii-spring-2004/pages/lecture-notes/)
Lectures: 25.

1. **Computability foundations**: why study computability; key computability concepts (recursive functions and computable sets); Church-Turing thesis
2. **Arithmetic and its models**: the language of arithmetic; nonstandard models of arithmetic; Robinson's arithmetic; Peano arithmetic
3. **Coding syntax**: Gödel numbering; coding proofs inside arithmetic
4. **Incompleteness**: self-reference (diagonal) lemma; first incompleteness theorem; second incompleteness theorem
5. **Truth and interpretation**: interpretations between theories; Tarski's theory of truth and undefinability; Gödel, mechanism, and the mind (Lucas, Benacerraf)
6. **Modal and provability logic**: introduction to modal logic; provability logic; defining exponentiation in arithmetic

*Notes:* Read from the lecture notes page, since the calendar is gone; the syllabus lists the same 25 topics. Lecture 25, on defining exponentiation in arithmetic, is a technical result placed last only to keep the order.

### 18. 6.011 Communication, Control and Signal Processing
Topic order from: [OCW, Spring 2010 calendar](https://ocw.mit.edu/courses/6-011-introduction-to-communication-control-and-signal-processing-spring-2010/pages/calendar/)
Lectures: 26.

1. **Signals and LTI systems**: LTI systems (revisits 6.003); Fourier transform classes and energy spectral density (revisits 6.003); sampling and interpolation; discrete-time processing of continuous-time signals; group delay
2. **State-space models and control**: state-space models; equilibria and linearization; modes of LTI state-space systems; reachability and observability; hidden modes and minimality; state observers; feedback and observer-based control; discrete-time control of continuous-time systems
3. **Estimation and random processes**: MMSE and linear MMSE estimation; random processes and wide-sense stationarity; ergodicity; LMMSE prediction from data; LTI filtering of WSS processes; power spectral density; noncausal Wiener filtering; causal Wiener prediction; spectral estimation and periodogram averaging
4. **Communication**: oversampled noise modulation; pulse-amplitude modulation and zero-ISI Nyquist condition; binary detection and minimum error probability; likelihood ratio and Neyman-Pearson detection; QAM and modems; detection in white Gaussian noise; pulse compression; information theory and coding basics
5. **Application**: clinical monitoring, estimation and prediction

### 19. 6.005 Elements of Software Construction
Topic order from: [OCW, Fall 2008](https://ocw.mit.edu/courses/6-005-elements-of-software-construction-fall-2008/pages/calendar/)
Lectures: 23.

1. **Classes, types and interfaces**: introduction to software construction; classes; subclassing and interfaces; decoupling and interfaces
2. **State machines and invariants**: designing state machines; implementing state machines; state machine invariants; rep invariants; equality; mutable types
3. **Stream processing and languages**: stream processors; little languages; visitors
4. **Testing and debugging**: testing and coverage; debugging
5. **Case study: SAT solver**: designing a SAT solver; implementing and refining the design
6. **Applications and interaction**: event-based programming; designing and implementing a photo organizer; usability
7. **Concurrency and data**: concurrency; relational databases

*Notes:* Of 23 sessions, the last is a conclusion. The SAT solver and photo organizer case studies each span several sessions, and sessions that teach two ideas are split.

### 20. 6.801 Machine Vision
Topic order from: [OCW, Fall 2004 calendar](https://ocw.mit.edu/courses/6-801-machine-vision-fall-2004/pages/calendar/)
Lectures: 25.

1. **Image formation and motion basics**: pinhole camera model; Lambertian surfaces; image motion field; constant brightness equation; binocular stereo
2. **Shading and shape**: reflectance map and surface orientation; photometric stereo; BRDF; shape from shading; shape from gradient (integration)
3. **Binary images**: binary image processing methods and applications; connected components and geometric properties; Euler number
4. **Motion and optical flow**: optical flow; motion field; direct motion vision
5. **Object representation and orientation**: extended Gaussian images; tessellations and Platonic solids; quaternions; operations on EGIs
6. **Photogrammetry**: absolute orientation; exterior and interior orientation; relative orientation
7. **Efficient processing**: parallel networks for image processing

*Notes:* Lecture 14, on Euler equations, is placed under binary images by a guess (the Euler number); it may belong with shape from shading.

### 21. 6.837 Computer Graphics
Topic order from: [OCW, Fall 2012 offering (the Fall 2003 course URL redirects here)](https://ocw.mit.edu/courses/6-837-computer-graphics-fall-2012/pages/calendar/)
Lectures: 25.

1. **Curves, surfaces and transformations**: Bezier curves and splines; curve properties and conversion; surface representations; coordinates and transformations; hierarchical modeling
2. **Color and animation**: color; skinning and enveloping; particle systems and ODEs; ODE solvers; mass-spring modeling; implicit integration; collision detection and response
3. **Ray casting and tracing**: ray casting and rendering; ray tracing; acceleration structures
4. **Appearance and light**: shading and material appearance; texture mapping and shaders; sampling, aliasing and mipmaps; global illumination and Monte Carlo; image-based rendering and lighting
5. **Rasterization and hardware**: output devices; graphics pipeline and rasterization; real-time shadows; graphics hardware and games

*Notes:* Read from the Fall 2012 edition, since the Fall 2003 calendar is only on web.archive.org (see Editions), and the 2003 order may differ. Lecture 0, an introduction, is counted; the two exams are not.

### 22. Theory of Computation (Georgetown COSC 545)
Topic order from: [Archived course page, 2014-01-31 snapshot](https://web.archive.org/web/20140131080651/http://cs.georgetown.edu/~cnewport/teaching/cosc545-spring12/)
Lectures: unknown.

Not yet read.

*Notes:* The topic order is still to be read: the course page survives only on web.archive.org (see Editions), and its live address now shows a department page. No syllabus has been guessed in its place.
