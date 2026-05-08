import { useState } from "react";
import Icon from "../ui/Icon";
import { ProgressBar } from "../ui/Charts";
import { GoldBtn, OutlineBtn } from "../ui/Buttons";
import C from "../../constants/colors";
import "./EvalModal.css";

const EvalModal = ({ sheet, onClose, modMarks, setModMarks, toast }) => {
  const [editMode, setEditMode]   = useState(false);
  const [tempMarks, setTempMarks] = useState(sheet.facMarks || sheet.aiMarks);
  const [comment, setComment]     = useState("");
  const cur = modMarks[sheet.id] !== undefined ? modMarks[sheet.id] : (sheet.facMarks || sheet.aiMarks);

  const approve = () => {
    if (editMode && parseInt(tempMarks) !== sheet.aiMarks) {
      setModMarks((m) => ({ ...m, [sheet.id]: parseInt(tempMarks) }));
      toast(`Marks updated to ${tempMarks}/${sheet.max}. Flagged as modified by teacher.`);
    } else {
      toast("Evaluation approved!");
    }
    onClose();
  };

  return (
    <div className="eval-overlay">
      <div className="eval-modal">
        {/* Header */}
        <div className="eval-modal-header">
          <div>
            <div className="eval-modal-header-title">AI Evaluation Review</div>
            <div className="eval-modal-header-sub">
              {sheet.student} &bull; {sheet.roll} &bull; {sheet.exam}
            </div>
          </div>
          <button className="eval-modal-close" onClick={onClose}>
            <Icon name="close" size={16} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        <div className="eval-modal-body">
          {/* Marks cards */}
          <div className="eval-marks-grid">
            <div className="eval-marks-card" style={{ borderTopColor: C.navy }}>
              <div className="eval-marks-label">AI Marks</div>
              <div className="eval-marks-value" style={{ color: C.navy }}>{sheet.aiMarks}</div>
              <div className="eval-marks-sub">out of {sheet.max}</div>
            </div>
            <div
              className="eval-marks-card"
              style={{ borderTopColor: editMode ? C.warning : C.success, background: editMode ? C.warningBg : C.bg, border: `1px solid ${editMode ? C.warning : C.border}` }}
            >
              <div className="eval-marks-label">Faculty Marks</div>
              {editMode ? (
                <input
                  type="number" min="0" max={sheet.max}
                  value={tempMarks}
                  onChange={(e) => setTempMarks(e.target.value)}
                  className="eval-marks-input"
                  style={{ color: C.warning }}
                />
              ) : (
                <div className="eval-marks-value" style={{ color: C.success }}>{cur}</div>
              )}
              <div className="eval-marks-sub">out of {sheet.max}</div>
              {modMarks[sheet.id] !== undefined && (
                <div className="eval-marks-flag">⚑ Modified by teacher</div>
              )}
            </div>
            <div className="eval-marks-card" style={{ borderTopColor: C.blue }}>
              <div className="eval-marks-label" style={{ marginBottom:"10px" }}>AI Quality Scores</div>
              <ProgressBar val={sheet.ai.gram}  max={100} color={C.navy} label="Grammar"  />
              <ProgressBar val={sheet.ai.spell} max={100} color={C.blue} label="Spelling" />
            </div>
          </div>

          {/* Analysis */}
          <div className="eval-analysis-grid">
            <div className="eval-analysis-box" style={{ background: C.successBg, border:"1px solid #b7e4c9" }}>
              <div className="eval-analysis-head" style={{ color: C.success }}>
                <Icon name="check" size={12} color={C.success} /> STRONG POINTS
              </div>
              {sheet.ai.strong.map((p, i) => (
                <div key={i} className="eval-analysis-point" style={{ borderLeftColor: C.success }}>{p}</div>
              ))}
            </div>
            <div className="eval-analysis-box" style={{ background: C.dangerBg, border:"1px solid #f5c2be" }}>
              <div className="eval-analysis-head" style={{ color: C.danger }}>
                <Icon name="close" size={12} color={C.danger} /> WEAK POINTS
              </div>
              {sheet.ai.weak.map((p, i) => (
                <div key={i} className="eval-analysis-point" style={{ borderLeftColor: C.danger }}>{p}</div>
              ))}
            </div>
          </div>

          <div className="eval-suggest">
            <div className="eval-suggest-head">🤖 AI Suggestion</div>
            <p className="eval-suggest-text">{sheet.ai.note}</p>
          </div>

          {/* Comment */}
          <label className="eval-comment-label">Faculty Comment (optional)</label>
          <textarea
            className="eval-comment-area"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add feedback for the student..."
          />

          {/* Actions */}
          <div className="eval-actions">
            {!editMode ? (
              <button className="btn-modify" onClick={() => setEditMode(true)}>
                <Icon name="edit" size={14} color={C.warning} /> Modify Marks
              </button>
            ) : (
              <OutlineBtn onClick={() => setEditMode(false)}>Cancel Edit</OutlineBtn>
            )}
            <button className="btn-approve" onClick={approve}>
              <Icon name="check" size={14} color="#fff" />
              {editMode ? "Save & Approve" : "Approve Evaluation"}
            </button>
            <OutlineBtn onClick={onClose} style={{ marginLeft:"auto" }}>Close</OutlineBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvalModal;
