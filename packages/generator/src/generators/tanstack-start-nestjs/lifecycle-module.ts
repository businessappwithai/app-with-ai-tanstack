/**
 * The fixed half of the generated backend's `src/common/lifecycle.ts`.
 *
 * `renderLifecycle` writes one entry per business table between these two;
 * everything that reads an entry — the phase of a value, the moves out of a
 * state, whether a record is locked — is here, once, so the bus service, the
 * transition service and the access guard cannot read a lifecycle differently.
 * The vocabulary is language/state-field.ts's.
 */

export const LIFECYCLE_MODULE_HEAD = `/**
 * Every business table's lifecycle — generated from the model, do not edit.
 *
 * A record is saved into Draft. With no status flow, a save that its rules and
 * workflows accept moves it to Final; one they refuse leaves it in Error with the
 * reason, and saving it again runs them again. With a status flow, the accepted
 * save moves it to the flow's first status, and from there it moves only when
 * someone presses a move along an edge the diagram drew. Every end state of a
 * flow is Final and locked: Reopen (a role the model names, or the
 * administrator) takes it back to Draft. A record with no flow is never locked:
 * each save of it runs Draft → Final again.
 *
 * Who may press a move is not stated here: that is sys_access_grant, which an
 * administrator can change in the running application.
 */

export type LifecyclePhase = 'draft' | 'active' | 'final' | 'error';

export interface LifecycleEdge {
  from: string;
  to: string;
  /** The edge's event, in one token (\`close_won\`); '' when the diagram did not label it. */
  event: string;
  /** What the button says. */
  label: string;
}

export interface Lifecycle {
  /** The column the lifecycle is stored in: the state field, else doc_status. */
  column: string;
  hasMachine: boolean;
  /** The value Draft is stored as. */
  draft: string;
  /** Where an accepted save sends a Draft record: the flow's first status, else 'final'. */
  afterDraft: string;
  /** The Final values: every state the diagram ends. */
  terminal: string[];
  /** The drawn edges, the only moves a record makes. */
  edges: LifecycleEdge[];
  /** Every value the column may hold. */
  values: string[];
}

export const LIFECYCLE_DRAFT = 'draft';
export const LIFECYCLE_FINAL = 'final';
export const LIFECYCLE_ERROR = 'error';
export const REOPEN_EVENT = 'reopen';

export const LIFECYCLES: Readonly<Record<string, Lifecycle>> = {
`;

export const LIFECYCLE_MODULE_TAIL = `
};

/** A table's lifecycle. Every business table has one. */
export function lifecycleOf(tableName: string): Lifecycle | undefined {
  return LIFECYCLES[tableName];
}

/** Where a value sits: Draft, part-way along the flow, Final, or Error. */
export function phaseOf(lifecycle: Lifecycle, value: unknown): LifecyclePhase {
  const text = value == null ? '' : String(value);
  if (text === LIFECYCLE_ERROR) return 'error';
  if (lifecycle.terminal.includes(text)) return 'final';
  if (text === '' || text === lifecycle.draft) return 'draft';
  return lifecycle.hasMachine ? 'active' : 'draft';
}

/** True when a record in this state is Final. */
export function isFinal(lifecycle: Lifecycle, value: unknown): boolean {
  return phaseOf(lifecycle, value) === 'final';
}

/**
 * True when a record in this state is locked: an end state of a flow. A record
 * with no flow is Final after every accepted save and stays editable — saving it
 * again is how it changes.
 */
export function isLocked(lifecycle: Lifecycle, value: unknown): boolean {
  return lifecycle.hasMachine && isFinal(lifecycle, value);
}

/**
 * Where a save goes, decided by where the record is. Draft and Error re-run the
 * save pipeline from Draft; part-way along the flow a save is an edit in place;
 * Final refuses it.
 */
export function saveMode(lifecycle: Lifecycle, value: unknown): 'pipeline' | 'in-place' | 'locked' {
  if (isLocked(lifecycle, value)) return 'locked';
  if (phaseOf(lifecycle, value) === 'active') return 'in-place';
  return 'pipeline';
}

export interface LifecycleMove extends LifecycleEdge {
  kind: 'move' | 'reopen';
}

/**
 * Every move out of a value: the drawn edges, and Reopen from a locked end state
 * back to Draft unless the diagram draws its own way out of that state.
 */
export function movesFrom(lifecycle: Lifecycle, value: unknown): LifecycleMove[] {
  const from = value == null ? '' : String(value);
  const moves: LifecycleMove[] = lifecycle.edges
    .filter((edge) => edge.from === from)
    .map((edge) => ({ ...edge, kind: 'move' as const }));
  if (isLocked(lifecycle, from) && !moves.some((move) => move.to === lifecycle.draft)) {
    moves.push({ from, to: lifecycle.draft, event: REOPEN_EVENT, label: 'Reopen', kind: 'reopen' });
  }
  return moves;
}

/** The move a request names, by its event or by the state it goes to. */
export function findMove(
  lifecycle: Lifecycle,
  value: unknown,
  wanted: { event?: string; to?: string },
): LifecycleMove | undefined {
  const event = wanted.event ? wanted.event.trim().toLowerCase().replace(/[\\s-]+/g, '_') : '';
  const moves = movesFrom(lifecycle, value);
  if (event && wanted.to) return moves.find((move) => move.event === event && move.to === wanted.to);
  if (event) {
    const named = moves.filter((move) => move.event === event);
    return named.length === 1 ? named[0] : undefined;
  }
  if (wanted.to) {
    const reaching = moves.filter((move) => move.to === wanted.to);
    return reaching.length === 1 ? reaching[0] : undefined;
  }
  return undefined;
}
`;
