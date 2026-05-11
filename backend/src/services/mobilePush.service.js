/**
 * Mobile Push Notification Service
 *
 * Delivers push notifications to Android and iOS devices via Firebase Cloud
 * Messaging (FCM). Extends the in-app notification system to reach students,
 * faculty, and administrators on their mobile devices in real time.
 *
 * Required env vars:
 *   FCM_SERVER_KEY   — Firebase server key (legacy HTTP v1 or service account JSON path)
 *   FCM_PROJECT_ID   — Firebase project ID
 */

const FCM_URL        = "https://fcm.googleapis.com/fcm/send";
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || "";
const FCM_PROJECT_ID = process.env.FCM_PROJECT_ID || "";

const NOTIFICATION_TEMPLATES = {
  freeze: {
    title: "Answer Sheet Evaluated",
    body:  "Your answer sheet has been evaluated. Review window: 48 hours.",
  },
  revaluation_assigned: {
    title: "Revaluation Assigned",
    body:  "Your revaluation request has been assigned to an evaluator.",
  },
  revaluation_declared: {
    title: "Revaluation Result Declared",
    body:  "Your revaluation result has been declared. Check your result now.",
  },
  result_declared: {
    title: "Results Declared",
    body:  "Your semester results have been declared. View them in AEES.",
  },
  scrutinizer_flag: {
    title: "Booklet Flagged by Scrutinizer",
    body:  "A booklet has been flagged and returned for re-evaluation.",
  },
  dce_approved: {
    title: "DCE Approved Your Evaluation",
    body:  "The Deputy Central Examiner has approved your submitted evaluation.",
  },
};

async function sendFCMRequest(payload) {
  if (!FCM_SERVER_KEY) {
    console.warn("[MobilePush] FCM_SERVER_KEY not configured — push skipped");
    return { skipped: true };
  }

  const res = await fetch(FCM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM error [${res.status}]: ${text}`);
  }
  return res.json();
}

/**
 * Send a push notification to a single device token.
 */
export const sendToDevice = async (deviceToken, type, extraData = {}) => {
  const template = NOTIFICATION_TEMPLATES[type] || {
    title: "AEES Notification",
    body:  "You have a new notification in AEES.",
  };

  return sendFCMRequest({
    to: deviceToken,
    notification: {
      title: template.title,
      body:  template.body,
      sound: "default",
      badge: 1,
    },
    data: {
      type,
      projectId: FCM_PROJECT_ID,
      ...extraData,
    },
    priority: "high",
  });
};

/**
 * Send a push notification to multiple device tokens (up to 500 per FCM batch).
 */
export const sendToMultipleDevices = async (deviceTokens, type, extraData = {}) => {
  if (!deviceTokens?.length) return { skipped: true, reason: "no_tokens" };
  const template = NOTIFICATION_TEMPLATES[type] || {
    title: "AEES Notification",
    body:  "You have a new notification in AEES.",
  };

  const chunks = [];
  for (let i = 0; i < deviceTokens.length; i += 500) {
    chunks.push(deviceTokens.slice(i, i + 500));
  }

  const results = [];
  for (const chunk of chunks) {
    const res = await sendFCMRequest({
      registration_ids: chunk,
      notification: {
        title: template.title,
        body:  template.body,
        sound: "default",
      },
      data: { type, projectId: FCM_PROJECT_ID, ...extraData },
      priority: "high",
    });
    results.push(res);
  }
  return results;
};

/**
 * Send a notification to a topic (e.g., "results_declared_2024_sem1").
 * Students subscribe to their semester topic from the mobile app.
 */
export const sendToTopic = async (topic, type, extraData = {}) => {
  const template = NOTIFICATION_TEMPLATES[type] || {
    title: "AEES Notification",
    body:  "You have a new notification in AEES.",
  };

  return sendFCMRequest({
    to: `/topics/${topic}`,
    notification: {
      title: template.title,
      body:  template.body,
      sound: "default",
    },
    data: { type, projectId: FCM_PROJECT_ID, ...extraData },
    priority: "high",
  });
};

/**
 * Notify all students in a subject when their results are declared.
 * Looks up device tokens stored in the Student model's deviceTokens array.
 */
export const notifyResultsDeclared = async (studentDocs, subjectCode, academicYear) => {
  const tokens = studentDocs
    .flatMap(s => s.deviceTokens || [])
    .filter(Boolean);

  if (!tokens.length) {
    const topic = `results_${subjectCode}_${academicYear}`.replace(/\s+/g, "_");
    return sendToTopic(topic, "result_declared", { subjectCode, academicYear });
  }

  return sendToMultipleDevices(tokens, "result_declared", { subjectCode, academicYear });
};
