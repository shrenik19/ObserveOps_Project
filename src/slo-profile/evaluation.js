// Evaluation Logic, with no DOM in it. An SLO profile carries exactly ONE redundancy group, or it
// is Strict; the group IS the member set, so `of M` is the Source count and nothing sits outside.
//
// The quorum runs 1..M-1. Asking for all M of them is what Strict is for, and the row above says
// so — which is why there is no invalid state here to warn about. See phase 1 D9.
//
// Redundancy needs at least two members: one monitor cannot back itself up, and at M = 1 the
// quorum range 1..M-1 is empty. Callers must offer Strict instead. This factory throws RangeError
// if members < 2.

const fails = (k) => `${k} ${k === 1 ? 'failure' : 'failures'}`

export function createEvaluation({ members, mode = 'redundant', quorum = 2 }) {
  // Redundancy needs at least two members: one monitor cannot back itself up, and at M = 1
  // the quorum range 1..M-1 is empty. Callers must offer Strict instead.
  if (!(members >= 2)) {
    throw new RangeError(`createEvaluation needs at least 2 members, got ${members}`)
  }

  const api = {
    mode,
    quorum,
    maxQuorum: () => members - 1,

    setMode(next) { api.mode = next },

    setQuorum(n) {
      // A non-finite n (NaN from a cleared or non-numeric field) would propagate through both
      // Math.min and Math.max and surface as "tolerates NaN failures". Keep the last good value.
      if (!Number.isFinite(n)) return
      api.quorum = Math.max(1, Math.min(api.maxQuorum(), n))
    },

    bump(delta) { api.setQuorum(api.quorum + delta) },

    lead: () =>
      `Decides how the ${members} monitors you added under Source combine into a single SLO ` +
      'result — whether every one of them has to stay up, or whether they can cover for each other.',

    rule: (m) =>
      m === 'strict'
        ? 'Every member must stay up. A single failure degrades the SLO.'
        : 'Members back each other up. Only a drop below your threshold degrades the SLO.',

    // Read on BOTH rows, so the mode you are not on still states what it would cost. From inside
    // Strict, Redundant advertises its ceiling instead of a quorum you have not chosen.
    meta(m) {
      if (m === 'strict') return 'tolerates 0 failures'
      return api.mode === 'redundant'
        ? `tolerates ${fails(members - api.quorum)}`
        : `tolerates up to ${fails(api.maxQuorum())}`
    },

    sentence(m) {
      if (m === 'strict') return `All ${members} monitors added under Source must stay up.`
      const slack = members - api.quorum
      return `${api.quorum} of the ${members} monitors added under Source must stay up — ` +
        `survives ${slack} simultaneous ${slack === 1 ? 'failure' : 'failures'}.`
    },
  }
  api.setQuorum(quorum)
  return api
}
