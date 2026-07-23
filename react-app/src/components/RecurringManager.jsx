import { useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { formatCurrency } from "./SummaryDashboard.jsx";

function SwipeableRecurringRow({
  template,
  isOpen,
  busy,
  onOpen,
  onClose,
  onEdit,
  onToggle,
  onDelete,
}) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const draggingRef = useRef(false);
  const horizontalSwipeRef = useRef(false);

  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const ACTION_WIDTH = 216;
  const actionsVisible = isOpen || isSwiping;

  function updateDragOffset(value) {
    dragOffsetRef.current = value;
    setDragOffset(value);
  }

  function handlePointerDown(event) {
    if (
      event.target.closest(
        "button, select, option, input, textarea, a"
      )
    ) {
      return;
    }

    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    dragOffsetRef.current = 0;

    draggingRef.current = true;
    horizontalSwipeRef.current = false;
  }

  function handlePointerMove(event) {
    if (!draggingRef.current) return;

    const deltaX = event.clientX - startXRef.current;
    const deltaY = event.clientY - startYRef.current;

    if (!horizontalSwipeRef.current) {
      // Preserve normal vertical scrolling.
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      if (Math.abs(deltaX) > 6) {
        horizontalSwipeRef.current = true;
        setIsSwiping(true);

        event.currentTarget.setPointerCapture?.(
          event.pointerId
        );
      }
    }

    if (!horizontalSwipeRef.current) return;

    const offset = isOpen
      ? Math.max(0, Math.min(ACTION_WIDTH, deltaX))
      : Math.max(-ACTION_WIDTH, Math.min(0, deltaX));

    updateDragOffset(offset);
  }

  function handlePointerEnd(event) {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    if (
      event.currentTarget.hasPointerCapture?.(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture?.(
        event.pointerId
      );
    }

    if (!horizontalSwipeRef.current) {
      updateDragOffset(0);
      setIsSwiping(false);
      return;
    }

    const finalOffset = dragOffsetRef.current;

    if (isOpen) {
      if (finalOffset > ACTION_WIDTH / 3) {
        onClose();
      } else {
        onOpen(template.id);
      }
    } else if (finalOffset < -ACTION_WIDTH / 3) {
      onOpen(template.id);
    } else {
      onClose();
    }

    updateDragOffset(0);
    setIsSwiping(false);
    horizontalSwipeRef.current = false;
  }

  let translateX;

  if (draggingRef.current) {
    translateX = isOpen
      ? -ACTION_WIDTH + dragOffset
      : dragOffset;
  } else {
    translateX = isOpen ? -ACTION_WIDTH : 0;
  }

  function runAction(action) {
    onClose();
    action(template);
  }

  return (
    <div className="recurring-swipe-row">
      <div
        className={`recurring-swipe-actions ${
          actionsVisible ? "is-visible" : ""
        }`}
        aria-hidden={!actionsVisible}
      >
        <button
          type="button"
          className="recurring-swipe-edit"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => runAction(onEdit)}
          aria-label={`Edit ${template.desc}`}
        >
          <span aria-hidden="true">✎</span>
          Edit
        </button>

        <button
          type="button"
          className={
            template.active
              ? "recurring-swipe-pause"
              : "recurring-swipe-resume"
          }
          tabIndex={isOpen ? 0 : -1}
          disabled={busy}
          onClick={() => runAction(onToggle)}
          aria-label={
            template.active
              ? `Pause ${template.desc}`
              : `Resume ${template.desc}`
          }
        >
          <span aria-hidden="true">
            {template.active ? "Ⅱ" : "▶"}
          </span>

          {template.active ? "Pause" : "Resume"}
        </button>

        <button
          type="button"
          className="recurring-swipe-delete"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => runAction(onDelete)}
          aria-label={`Delete ${template.desc}`}
        >
          <span aria-hidden="true">⌫</span>
          Delete
        </button>
      </div>

      <article
        className={`recurring-template-card recurring-swipe-foreground ${
          isOpen ? "is-open" : ""
        } ${isSwiping ? "is-swiping" : ""}`}
        style={{
          transform: `translate3d(${translateX}px, 0, 0)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div>
          <h3>{template.desc}</h3>

          <p>
            Day {template.recurringDay} ·{" "}
            {formatCurrency(template.amount)}
          </p>

          <span
            className={`template-state ${
              template.active ? "active" : "paused"
            }`}
          >
            {template.active ? "● Active" : "Ⅱ Paused"}
          </span>
        </div>

       
      </article>
    </div>
  );
}

function RecurringManager({ templates, loading, busyId, onClose, onAdd, onEdit, onToggle, onDelete }) {

  const [openTemplateId, setOpenTemplateId] =
  useState(null);

  return (
    <Modal title="Manage Recurring" onClose={onClose}>
      <div className="recurring-manager-toolbar">
        <p>Swipe each card to the left to edit, pause/resume, and delete recurring expense.</p>
        <button className="primary-button" type="button" onClick={onAdd}>+ Add Recurring</button>
      </div>
      {loading ? (
        <div className="manager-loading">Loading recurring expenses…</div>
      ) : templates.length === 0 ? (
        <div className="transaction-empty compact"><span aria-hidden="true">↻</span><h3>No recurring expenses</h3><p>Add your first monthly bill or payment.</p></div>
      ) : (
        <div className="recurring-template-list">
  {templates.map((template) => (
    <SwipeableRecurringRow
      key={template.id}
      template={template}
      isOpen={openTemplateId === template.id}
      busy={busyId === template.id}
      onOpen={setOpenTemplateId}
      onClose={() => setOpenTemplateId(null)}
      onEdit={onEdit}
      onToggle={onToggle}
      onDelete={onDelete}
    />
  ))}
</div>
      )}
    </Modal>
  );
}

export default RecurringManager;
