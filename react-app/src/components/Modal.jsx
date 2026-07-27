import { useEffect, useRef } from "react";

function Modal({
  title,
  children,
  onClose,
  closeLabel = "Close",
  className = "",
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousActiveElement =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      previousActiveElement?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className={`modal-backdrop ${
        className ? `${className}-backdrop` : ""
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={`react-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={dialogRef}
        tabIndex="-1"
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
          >
            ×
          </button>
        </header>

        {children}
      </section>
    </div>
  );
}

export default Modal;