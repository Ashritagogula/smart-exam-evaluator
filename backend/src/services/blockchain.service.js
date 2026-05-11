/**
 * Blockchain Result Verification Service
 *
 * Issues tamper-proof digital credentials for declared exam results using a
 * blockchain notarization API (compatible with Ethereum, Hyperledger Fabric,
 * or any REST-based notarization provider).
 *
 * Each result hash is computed from the canonical result payload and stored
 * on-chain. Students and third parties can verify authenticity using the
 * returned transaction hash without accessing AEES directly.
 *
 * Required env vars:
 *   BLOCKCHAIN_API_URL  — base URL of the notarization provider
 *   BLOCKCHAIN_API_KEY  — API key for the notarization service
 *   BLOCKCHAIN_NETWORK  — network identifier (e.g., "mainnet", "polygon", "fabric-channel-1")
 */

import crypto from "crypto";

const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || "";
const BLOCKCHAIN_API_KEY = process.env.BLOCKCHAIN_API_KEY || "";
const BLOCKCHAIN_NETWORK = process.env.BLOCKCHAIN_NETWORK || "testnet";

/**
 * Compute a SHA-256 hash of the canonical result payload.
 * This hash is what gets notarized — it uniquely identifies this result record.
 */
export const computeResultHash = (result) => {
  const canonical = JSON.stringify({
    rollNumber:   result.student?.rollNumber,
    courseCode:   result.subject?.courseCode,
    academicYear: result.academicYear?.year,
    semester:     result.semester?.number,
    grandTotal:   result.grandTotal,
    grade:        result.grade,
    gradePoints:  result.gradePoints,
    isPassed:     result.isPassed,
    declaredAt:   result.declaredAt,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
};

/**
 * Notarize a single result on the blockchain.
 * Returns the transaction hash and block reference for audit storage.
 */
export const notarizeResult = async (result) => {
  if (!BLOCKCHAIN_API_URL) {
    console.warn("[Blockchain] BLOCKCHAIN_API_URL not configured — notarization skipped");
    return { skipped: true, resultHash: computeResultHash(result) };
  }

  const resultHash = computeResultHash(result);

  const res = await fetch(`${BLOCKCHAIN_API_URL}/api/v1/notarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": BLOCKCHAIN_API_KEY,
    },
    body: JSON.stringify({
      documentHash: resultHash,
      network:      BLOCKCHAIN_NETWORK,
      metadata: {
        issuer:   "AEES",
        type:     "ExamResult",
        issuedAt: new Date().toISOString(),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blockchain notarization failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  return {
    resultHash,
    transactionHash: data.txHash || data.transactionHash,
    blockNumber:     data.blockNumber,
    network:         BLOCKCHAIN_NETWORK,
    notarizedAt:     new Date(),
  };
};

/**
 * Batch notarize multiple results (e.g., after CE declares an entire subject).
 */
export const batchNotarizeResults = async (results) => {
  const outcomes = [];
  for (const result of results) {
    try {
      const outcome = await notarizeResult(result);
      outcomes.push({ resultId: result._id, ...outcome, success: true });
    } catch (err) {
      outcomes.push({ resultId: result._id, success: false, error: err.message });
    }
  }
  return {
    total:      results.length,
    successful: outcomes.filter(o => o.success).length,
    failed:     outcomes.filter(o => !o.success).length,
    outcomes,
  };
};

/**
 * Verify a result using its transaction hash and the expected result payload.
 * Returns whether the on-chain hash matches the locally recomputed hash.
 */
export const verifyResult = async (result, transactionHash) => {
  const localHash = computeResultHash(result);

  if (!BLOCKCHAIN_API_URL) {
    return {
      verified:     false,
      localHash,
      reason:       "Blockchain API not configured",
    };
  }

  const res = await fetch(
    `${BLOCKCHAIN_API_URL}/api/v1/verify?txHash=${transactionHash}&network=${BLOCKCHAIN_NETWORK}`,
    { headers: { "X-Api-Key": BLOCKCHAIN_API_KEY } }
  );

  if (!res.ok) throw new Error(`Blockchain verification failed [${res.status}]`);

  const data = await res.json();
  const onChainHash = data.documentHash;

  return {
    verified:     onChainHash === localHash,
    localHash,
    onChainHash,
    transactionHash,
    network:      BLOCKCHAIN_NETWORK,
    verifiedAt:   new Date(),
  };
};
