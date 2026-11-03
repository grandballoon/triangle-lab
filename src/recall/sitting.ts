// The review sitting under way in this tab, held for whichever page shows it:
// the recall page (page.ts), or a lesson page the learner took it to while
// checking an answer (beside.ts). It is kept in the tab's sessionStorage at
// every change, so a reload, or going between the recall page and the
// lesson, carries on where the learner was. The rules are session.ts; this
// holds the state, keeps it, and has Claude read the answer.

import { addCard, cleanQuestion, editCard, newCard, type Card, type Grade } from "./deck.ts";
import { newId } from "./id.ts";
import type { RecallSync } from "./remote.ts";
import {
  askReview,
  currentCard,
  dropReview,
  editAnswer,
  freshSitting,
  gradeCurrent,
  loadSitting,
  prune,
  reveal,
  settleReview,
  skipCurrent,
  startSession,
  wantsReview,
  type Editor,
  type Session,
  type Sitting,
} from "./session.ts";
import { placeLabel } from "./labels.ts";
import type { RecallStore } from "./store.ts";

/** Where the sitting under way is kept for the tab (session.ts `Sitting`). */
export const SITTING_KEY = "triangle-lab:recall-sitting";

export class HeldSitting {
  private kept: Sitting | null;
  /** Whether the browser kept every question written while checking the answer on show. */
  writtenKept = true;
  /** The height the learner dragged the answer box to for this card, kept over redraws; null to fit the answer. */
  answerHeight: number | null = null;
  /** An editor was opened, or opened afresh, and takes the focus at the next redraw. */
  editorOpened = false;

  /**
   * `changed` hears every change the page should redraw for: the learner's
   * own, other than typing, a reply from Claude, and the card being checked
   * removed elsewhere.
   */
  constructor(
    private readonly store: RecallStore,
    private readonly sync: RecallSync,
    private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
    private readonly changed: () => void,
  ) {
    this.kept = this.read();
    store.subscribe((deck) => {
      // Changes from other tabs reach a sitting only when they remove the card
      // being asked; anything else would wipe what is being written.
      if (!this.kept) return;
      const next = prune(this.kept.session, deck);
      if (next === this.kept.session) return;
      this.kept = next.phase === "check" ? { ...this.kept, session: next } : { ...freshSitting(next), draft: this.kept.draft };
      if (next.phase !== "check") this.leaveCard();
      this.keep();
      this.changed();
    });
    // A sitting kept while its answer was being read lost that request with the page.
    this.reviewIfWanted();
  }

  /** The sitting under way, or null for none. */
  get sitting(): Sitting | null {
    return this.kept;
  }

  get session(): Session | null {
    return this.kept?.session ?? null;
  }

  /** The card being asked or checked, or null. */
  card(): Card | null {
    return this.kept && currentCard(this.kept.session, this.store.get());
  }

  /** Whether Claude can read answers: the browser has the sync key. */
  canCheck(): boolean {
    return this.sync.canCheck();
  }

  /** Take the sitting up again as kept, as when the browser brings back a page it held while another used the sitting. */
  restore(): void {
    this.kept = this.read();
    this.leaveCard();
    this.reviewIfWanted();
  }

  begin(cards: readonly Card[]): void {
    this.kept = freshSitting(startSession(cards));
    this.leaveCard();
    this.keep();
  }

  end(): void {
    this.kept = null;
    this.keep();
  }

  /** The learner typed in the answer box: the draft while asked, the answer once checked. Not redrawn. */
  type(text: string): void {
    if (!this.kept) return;
    const { session } = this.kept;
    this.kept = session.phase === "ask" ? { ...this.kept, draft: text } : { ...this.kept, session: editAnswer(session, text) };
    this.keep();
  }

  /** Check: the answer, as written, is shown to be corrected, and read by Claude. */
  check(): void {
    if (!this.kept) return;
    this.set(reveal(this.kept.session, this.kept.draft));
    this.reviewIfWanted();
  }

  /** Have the answer read again as corrected. */
  checkAgain(): void {
    this.review();
  }

  grade(grade: Grade): void {
    if (!this.kept) return;
    let next = this.kept.session;
    this.store.update((deck) => {
      const result = gradeCurrent(next, deck, grade, Date.now());
      next = result.session;
      return result.deck;
    });
    this.kept = freshSitting(next);
    this.leaveCard();
    this.keep();
  }

  /** Move on from the card on show without answering it; its place in the deck is untouched. */
  skip(): void {
    if (!this.kept) return;
    this.kept = freshSitting(skipCurrent(this.kept.session));
    this.leaveCard();
    this.keep();
  }

  /** Start rewording the question being checked, or writing a new question. */
  openEditor(kind: Editor["kind"]): void {
    const card = this.card();
    if (!this.kept || !card) return;
    this.kept = { ...this.kept, editor: { kind, text: kind === "question" ? card.question : "" } };
    this.editorOpened = true;
    this.keep();
  }

  /** The learner typed in the editor. Not redrawn. */
  typeEditor(text: string): void {
    if (!this.kept?.editor) return;
    this.kept = { ...this.kept, editor: { ...this.kept.editor, text } };
    this.keep();
  }

  closeEditor(): void {
    if (!this.kept) return;
    this.kept = { ...this.kept, editor: null };
    this.keep();
  }

  /**
   * Save what the editor holds. A reworded question has Claude read the answer
   * afresh; a new question is added at the same lesson step, and the editor
   * stays open for another. A blank question is not saved.
   */
  saveEditor(): void {
    const card = this.card();
    const editor = this.kept?.editor;
    if (!this.kept || !editor || !card || !cleanQuestion(editor.text)) return;
    if (editor.kind === "question") {
      this.store.update((d) => editCard(d, card.id, editor.text, Date.now()));
      const reworded = this.card()?.question !== card.question;
      this.kept = { ...this.kept, session: reworded ? dropReview(this.kept.session) : this.kept.session, editor: null };
    } else {
      const fresh = newCard(newId(), editor.text, card, Date.now())!;
      const saved = this.store.update((d) => addCard(d, fresh));
      this.writtenKept &&= saved;
      this.kept = { ...this.kept, written: [...this.kept.written, fresh.question], editor: { kind: "new", text: "" } };
      this.editorOpened = true;
    }
    this.keep();
    this.reviewIfWanted();
  }

  /** Take the answer being checked to the lesson, or bring it back to the recall page. */
  inLesson(on: boolean): void {
    if (!this.kept || this.kept.inLesson === on) return;
    this.kept = { ...this.kept, inLesson: on && this.kept.session.phase === "check" };
    this.keep();
  }

  private set(session: Session): void {
    if (!this.kept) return;
    this.kept = { ...this.kept, session };
    this.keep();
  }

  /** Forget what was being written for the card checked, as the sitting moves off it. */
  private leaveCard(): void {
    this.answerHeight = null;
    this.writtenKept = true;
  }

  /** Have Claude read the answer being checked if it is waiting to be read unasked (`wantsReview`). */
  private reviewIfWanted(): void {
    if (this.session && wantsReview(this.session)) this.review();
  }

  /**
   * Have Claude read the answer being checked, as it now stands, unless it
   * has already been, or is being. Nothing is asked without the sync key.
   * The reply is heard as a change.
   */
  private review(): void {
    const session = this.session;
    const card = this.card();
    if (!session || !card || !this.sync.canCheck()) return;
    const asked = askReview(session);
    if (asked === session) return;
    this.set(asked);
    const answer = asked.answer;
    const { id, question } = card;
    void this.sync.check({ question, where: placeLabel(card), answer }).then((review) => {
      const now = this.session;
      if (!now) return;
      const next = settleReview(now, this.store.get(), { id, question, answer }, review);
      if (next === now) return;
      this.set(next);
      this.changed();
    });
  }

  private read(): Sitting | null {
    try {
      const text = this.storage?.getItem(SITTING_KEY);
      const sitting = text ? loadSitting(JSON.parse(text)) : null;
      if (!sitting) return null;
      const session = prune(sitting.session, this.store.get());
      if (session === sitting.session) return sitting;
      return session.phase === "check" ? { ...sitting, session } : { ...freshSitting(session), draft: sitting.draft };
    } catch {
      return null;
    }
  }

  private keep(): void {
    try {
      if (this.kept) this.storage?.setItem(SITTING_KEY, JSON.stringify(this.kept));
      else this.storage?.removeItem(SITTING_KEY);
    } catch {
      // Storage blocked: a reload starts from the overview, as before.
    }
  }
}
