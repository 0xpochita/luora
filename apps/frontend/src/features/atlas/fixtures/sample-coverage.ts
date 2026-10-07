import type { AtlasCoverage } from "../types";

/**
 * Coverage of the sample contract, as `foundry/luora-coverage.mjs` folds it from lcov: the vault's
 * happy paths are tested, flashLoan / emergencyWithdraw never run and setOracle only ever reverts.
 */
export const SAMPLE_COVERAGE: AtlasCoverage = {
  tool: "forge coverage (sample)",
  lines: {
    hit: 45,
    found: 56,
  },
  branches: {
    hit: 8,
    found: 13,
  },
  functions: {
    hit: 11,
    found: 14,
  },
  hits: {
    "25": 3,
    "26": 3,
    "30": 260,
    "31": 260,
    "35": 9,
    "36": 9,
    "37": 9,
    "38": 9,
    "39": 9,
    "40": 9,
    "41": 9,
    "46": 180,
    "47": 179,
    "48": 179,
    "49": 179,
    "50": 179,
    "51": 179,
    "54": 80,
    "55": 80,
    "56": 80,
    "57": 80,
    "58": 80,
    "59": 80,
    "60": 80,
    "61": 80,
    "64": 0,
    "65": 0,
    "66": 0,
    "67": 0,
    "68": 0,
    "71": 3,
    "72": 3,
    "73": 3,
    "76": 2,
    "77": 2,
    "78": 2,
    "79": 2,
    "80": 2,
    "81": 2,
    "82": 2,
    "85": 1,
    "86": 0,
    "87": 0,
    "90": 0,
    "91": 0,
    "94": 179,
    "95": 179,
    "96": 167,
    "99": 247,
    "100": 247,
    "103": 0,
    "104": 0,
    "107": 3,
    "108": 3,
    "109": 3,
    "110": 3,
  },
  branchHits: {
    "26": [1, 2],
    "31": [1, 259],
    "55": [null, 80],
    "58": [null, 80],
    "68": [null, null],
    "78": [null, 2],
    "95": [12],
  },
  pieces: {
    deposit: {
      lines: {
        hit: 5,
        found: 5,
      },
      branches: {
        hit: 0,
        found: 0,
      },
      calls: 180,
    },
    withdraw: {
      lines: {
        hit: 7,
        found: 7,
      },
      branches: {
        hit: 2,
        found: 4,
      },
      calls: 80,
    },
    flashLoan: {
      lines: {
        hit: 0,
        found: 4,
      },
      branches: {
        hit: 0,
        found: 2,
      },
      calls: 0,
    },
    harvest: {
      lines: {
        hit: 2,
        found: 2,
      },
      branches: {
        hit: 0,
        found: 0,
      },
      calls: 3,
    },
    harvestRewards: {
      lines: {
        hit: 6,
        found: 6,
      },
      branches: {
        hit: 1,
        found: 2,
      },
      calls: 2,
    },
    setOracle: {
      lines: {
        hit: 0,
        found: 2,
      },
      branches: {
        hit: 0,
        found: 0,
      },
      calls: 1,
    },
    emergencyWithdraw: {
      lines: {
        hit: 0,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
      calls: 0,
    },
    whenNotPaused: {
      lines: {
        hit: 1,
        found: 1,
      },
      branches: {
        hit: 2,
        found: 2,
      },
      calls: 260,
    },
    onlyOwner: {
      lines: {
        hit: 1,
        found: 1,
      },
      branches: {
        hit: 2,
        found: 2,
      },
      calls: 3,
    },
    ctor: {
      lines: {
        hit: 6,
        found: 6,
      },
      branches: {
        hit: 0,
        found: 0,
      },
      calls: 9,
    },
    _computeShares: {
      lines: {
        hit: 2,
        found: 2,
      },
      branches: {
        hit: 1,
        found: 1,
      },
      calls: 179,
    },
    _price: {
      lines: {
        hit: 1,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
      calls: 247,
    },
    _sendOut: {
      lines: {
        hit: 0,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
      calls: 0,
    },
    _accrueFee: {
      lines: {
        hit: 3,
        found: 3,
      },
      branches: {
        hit: 0,
        found: 0,
      },
      calls: 3,
    },
    cTransferFrom: {
      lines: {
        hit: 1,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
    },
    cCall: {
      lines: {
        hit: 1,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
    },
    cOnFlash: {
      lines: {
        hit: 0,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
    },
    cInvest: {
      lines: {
        hit: 1,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
    },
    cPrice: {
      lines: {
        hit: 1,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
    },
    cTransfer: {
      lines: {
        hit: 0,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
    },
    cApprove: {
      lines: {
        hit: 1,
        found: 1,
      },
      branches: {
        hit: 1,
        found: 2,
      },
    },
    cSwap: {
      lines: {
        hit: 1,
        found: 1,
      },
      branches: {
        hit: 0,
        found: 0,
      },
    },
  },
};
