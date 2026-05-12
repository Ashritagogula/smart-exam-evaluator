import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import {
  validateRequest,
  requestRevaluation,
  listRequests,
  myRequests,
  assignSecondEvaluator,
  submitSecondEval,
  assignThirdEvaluator,
  submitThirdEval,
  declareResult,
  rejectRequest,
} from "../controllers/revaluation.controller.js";

const router = express.Router();
router.use(authenticate);

router.post("/request",                   authorize("student", "examcell", "admin"),            ...validateRequest, requestRevaluation);
router.get("/",                           authorize("dce", "examcell", "admin", "ce"),          listRequests);
router.get("/my",                         authorize("student"),                                  myRequests);
router.post("/:requestId/assign-second",  authorize("dce", "admin"),                            assignSecondEvaluator);
router.post("/:requestId/second-eval",    authorize("faculty", "external", "examcell"),         submitSecondEval);
router.post("/:requestId/assign-third",   authorize("dce", "admin"),                            assignThirdEvaluator);
router.post("/:requestId/third-eval",     authorize("faculty", "external", "examcell"),         submitThirdEval);
router.post("/:requestId/declare",        authorize("dce", "admin"),                            declareResult);
router.post("/:requestId/reject",         authorize("dce", "admin"),                            rejectRequest);

export default router;
