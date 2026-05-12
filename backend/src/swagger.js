import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Aditya University — AI Exam Evaluation API",
      version: "1.0.0",
      description:
        "REST API for the AI-powered answer-booklet evaluation system. " +
        "Authentication uses httpOnly cookies (sameSite: strict). " +
        "All protected endpoints require a valid session cookie.",
    },
    servers: [{ url: "/api", description: "Application server" }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "au_token" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { message: { type: "string" } },
        },
        ValidationError: {
          type: "object",
          properties: {
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  msg:   { type: "string" },
                  field: { type: "string" },
                },
              },
            },
          },
        },
        UserPublic: {
          type: "object",
          properties: {
            id:    { type: "string" },
            email: { type: "string", format: "email" },
            name:  { type: "string" },
            role:  { type: "string" },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
    tags: [
      { name: "Auth",            description: "Authentication & session management" },
      { name: "Exam Events",     description: "Exam event lifecycle" },
      { name: "Answer Booklets", description: "Booklet upload, assignment & tracking" },
      { name: "Evaluation",      description: "AI & faculty evaluation of booklets" },
      { name: "Revaluation",     description: "Student revaluation workflow" },
      { name: "CIE Marks",       description: "Continuous Internal Evaluation marks" },
      { name: "Results",         description: "Final result computation & declaration" },
    ],
    paths: {
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login and receive session cookie",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email:    { type: "string", format: "email", example: "admin@aditya.ac.in" },
                    password: { type: "string", format: "password", example: "secret123" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful — sets au_token and au_refresh httpOnly cookies",
              content: {
                "application/json": {
                  schema: { type: "object", properties: { user: { $ref: "#/components/schemas/UserPublic" } } },
                },
              },
            },
            401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Exchange refresh cookie for a new access token",
          security: [],
          responses: {
            200: { description: "New access token cookie issued" },
            401: { description: "Refresh token missing or expired" },
          },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current authenticated user profile",
          responses: {
            200: {
              description: "Authenticated user data",
              content: {
                "application/json": {
                  schema: { type: "object", properties: { user: { $ref: "#/components/schemas/UserPublic" } } },
                },
              },
            },
            401: { description: "Not authenticated" },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Clear session cookies and log out",
          responses: {
            200: { description: "Logged out successfully" },
          },
        },
      },
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user (admin only in production)",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "name", "role"],
                  properties: {
                    email:    { type: "string", format: "email" },
                    password: { type: "string" },
                    name:     { type: "string" },
                    role:     { type: "string", enum: ["admin","faculty","student","examcell","clerk","dce","ce","scrutinizer","external","hod","principal","vc","chairman","subject_coordinator"] },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "User created successfully" },
            409: { description: "Email already registered" },
          },
        },
      },
      "/answer-booklets": {
        get: {
          tags: ["Answer Booklets"],
          summary: "List answer booklets with optional filters",
          parameters: [
            { name: "examEvent", in: "query", schema: { type: "string" } },
            { name: "faculty",   in: "query", schema: { type: "string" } },
            { name: "status",    in: "query", schema: { type: "string" } },
            { name: "subject",   in: "query", schema: { type: "string" } },
            { name: "student",   in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Array of booklet objects" } },
        },
      },
      "/answer-booklets/bulk-assign": {
        post: {
          tags: ["Answer Booklets"],
          summary: "Bulk-assign booklets to a faculty member",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["bookletIds", "facultyId"],
                  properties: {
                    bookletIds: { type: "array", items: { type: "string" } },
                    facultyId:  { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Booklets assigned" },
            422: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
          },
        },
      },
      "/revaluation/request": {
        post: {
          tags: ["Revaluation"],
          summary: "Submit a revaluation request",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["bookletId", "studentId", "subjectId", "examEventId"],
                  properties: {
                    bookletId:    { type: "string" },
                    studentId:    { type: "string" },
                    subjectId:    { type: "string" },
                    examEventId:  { type: "string" },
                    reason:       { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Revaluation request created" },
            409: { description: "Request already exists" },
            422: { description: "Validation error" },
          },
        },
      },
      "/revaluation/{requestId}/declare": {
        post: {
          tags: ["Revaluation"],
          summary: "Declare final revaluation result (DCE/admin only)",
          description:
            "Runs inside a Mongoose ACID transaction. " +
            "Final marks = arithmetic mean of original + second evaluator + third evaluator (where present). " +
            "FinalResult is updated only when finalMarks > originalMarks.",
          parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Result declared" },
            404: { description: "Request not found" },
          },
        },
      },
      "/cie-marks/compute": {
        post: {
          tags: ["CIE Marks"],
          summary: "Compute CIE totals for all students in a subject",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["subjectId"],
                  properties: { subjectId: { type: "string" } },
                },
              },
            },
          },
          responses: {
            200: { description: "CIE computed" },
            422: { description: "Validation error" },
          },
        },
      },
      "/results/compute": {
        post: {
          tags: ["Results"],
          summary: "Compute final result for a single student-subject pair",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["studentId", "subjectId"],
                  properties: {
                    studentId: { type: "string" },
                    subjectId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Result computed" }, 422: { description: "Validation error" } },
        },
      },
      "/results/compute-bulk": {
        post: {
          tags: ["Results"],
          summary: "Bulk compute results for an exam event",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["examEventId"],
                  properties: { examEventId: { type: "string" } },
                },
              },
            },
          },
          responses: { 200: { description: "Bulk results computed" }, 422: { description: "Validation error" } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
