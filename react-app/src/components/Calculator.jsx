import { useState } from "react";
import Modal from "./Modal.jsx";

const operatorSymbols = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

function calculate(left, right, operator) {
  if (operator === "add") return left + right;
  if (operator === "subtract") return left - right;
  if (operator === "multiply") return left * right;

  if (operator === "divide") {
    return right === 0 ? null : left / right;
  }

  return right;
}

function normalizeResult(value) {
  return String(
    Number(Number(value).toPrecision(12))
  );
}

function formatDisplay(value) {
  if (value === "Error") return value;

  const [whole, decimal] = String(value).split(".");
  const numericWhole = Number(whole || 0);

  const formattedWhole =
    Number.isFinite(numericWhole)
      ? numericWhole.toLocaleString("en-US")
      : whole;

  return decimal !== undefined
    ? `${formattedWhole}.${decimal}`
    : formattedWhole;
}

function Calculator({ onClose }) {
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] =
    useState(null);

  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] =
    useState(false);

  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState([]);
  const [copyMessage, setCopyMessage] = useState("");

  function inputDigit(digit) {
    setCopyMessage("");

    if (
      waitingForOperand ||
      display === "0" ||
      display === "Error"
    ) {
      setDisplay(digit);
      setWaitingForOperand(false);
      return;
    }

    if (display.replace("-", "").replace(".", "").length >= 12) {
      return;
    }

    setDisplay((current) => `${current}${digit}`);
  }

  function inputDecimal() {
    setCopyMessage("");

    if (waitingForOperand || display === "Error") {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }

    if (!display.includes(".")) {
      setDisplay((current) => `${current}.`);
    }
  }

  function selectOperator(nextOperator) {
    setCopyMessage("");

    const inputValue = Number(display);

    if (operator && waitingForOperand) {
      setOperator(nextOperator);

      setExpression(
        `${formatDisplay(storedValue)} ${
          operatorSymbols[nextOperator]
        }`
      );

      return;
    }

    if (storedValue !== null && operator) {
      const result = calculate(
        storedValue,
        inputValue,
        operator
      );

      if (result === null) {
        setDisplay("Error");
        setStoredValue(null);
        setOperator(null);
        setExpression("Cannot divide by zero");
        return;
      }

      const normalized = normalizeResult(result);

      setDisplay(normalized);
      setStoredValue(Number(normalized));

      setExpression(
        `${formatDisplay(normalized)} ${
          operatorSymbols[nextOperator]
        }`
      );
    } else {
      setStoredValue(inputValue);

      setExpression(
        `${formatDisplay(display)} ${
          operatorSymbols[nextOperator]
        }`
      );
    }

    setOperator(nextOperator);
    setWaitingForOperand(true);
  }

  function calculateResult() {
    if (
      operator === null ||
      storedValue === null ||
      display === "Error"
    ) {
      return;
    }

    const inputValue = Number(display);

    const result = calculate(
      storedValue,
      inputValue,
      operator
    );

    if (result === null) {
      setDisplay("Error");
      setStoredValue(null);
      setOperator(null);
      setWaitingForOperand(true);
      setExpression("Cannot divide by zero");
      return;
    }

    const normalized = normalizeResult(result);

    const historyText =
      `${formatDisplay(storedValue)} ` +
      `${operatorSymbols[operator]} ` +
      `${formatDisplay(display)} = ` +
      `${formatDisplay(normalized)}`;

    setHistory((current) => [
      historyText,
      ...current.slice(0, 3),
    ]);

    setDisplay(normalized);
    setExpression(historyText);
    setStoredValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }

  function clearCalculator() {
    setDisplay("0");
    setStoredValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression("");
    setCopyMessage("");
  }

  function eraseDigit() {
    setCopyMessage("");

    if (
      waitingForOperand ||
      display === "Error"
    ) {
      return;
    }

    setDisplay((current) => {
      if (
        current.length <= 1 ||
        (current.startsWith("-") &&
          current.length === 2)
      ) {
        return "0";
      }

      return current.slice(0, -1);
    });
  }

  function applyPercentage() {
    if (display === "Error") return;

    const result = Number(display) / 100;
    const normalized = normalizeResult(result);

    setDisplay(normalized);
    setWaitingForOperand(false);
    setCopyMessage("");
  }

  async function copyResult() {
    if (display === "Error") return;

    try {
      await navigator.clipboard.writeText(display);
      setCopyMessage("Result copied");
    } catch {
      setCopyMessage("Unable to copy");
    }
  }

  return (
    <Modal
      title="Calculator"
      onClose={onClose}
      className="calculator-modal"
    >
      <div className="calculator">
        <section
          className="calculator-display"
          aria-live="polite"
        >
          <div className="calculator-display-top">
            <span>{expression || "Ready"}</span>

            <button
              type="button"
              onClick={copyResult}
              disabled={display === "Error"}
            >
              Copy
            </button>
          </div>

          <strong>{formatDisplay(display)}</strong>

          {copyMessage && (
            <small role="status">
              {copyMessage}
            </small>
          )}
        </section>

        {history.length > 0 && (
          <section className="calculator-history">
            <span>Recent calculations</span>

            <div>
              {history.map((item, index) => (
                <button
                  type="button"
                  key={`${item}-${index}`}
                  onClick={() => {
                    const result =
                      item.split(" = ").at(-1);

                    setDisplay(
                      result.replaceAll(",", "")
                    );

                    setWaitingForOperand(true);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="calculator-keypad">
          <button
            className="calculator-clear"
            type="button"
            onClick={clearCalculator}
          >
            AC
          </button>

          <button
            className="calculator-utility"
            type="button"
            onClick={eraseDigit}
            aria-label="Erase last digit"
          >
            ⌫
          </button>

          <button
            className="calculator-utility"
            type="button"
            onClick={applyPercentage}
          >
            %
          </button>

          <button
            className="calculator-operator"
            type="button"
            onClick={() => selectOperator("divide")}
          >
            ÷
          </button>

          {[7, 8, 9].map((digit) => (
            <button
              type="button"
              key={digit}
              onClick={() => inputDigit(String(digit))}
            >
              {digit}
            </button>
          ))}

          <button
            className="calculator-operator"
            type="button"
            onClick={() => selectOperator("multiply")}
          >
            ×
          </button>

          {[4, 5, 6].map((digit) => (
            <button
              type="button"
              key={digit}
              onClick={() => inputDigit(String(digit))}
            >
              {digit}
            </button>
          ))}

          <button
            className="calculator-operator"
            type="button"
            onClick={() => selectOperator("subtract")}
          >
            −
          </button>

          {[1, 2, 3].map((digit) => (
            <button
              type="button"
              key={digit}
              onClick={() => inputDigit(String(digit))}
            >
              {digit}
            </button>
          ))}

          <button
            className="calculator-operator"
            type="button"
            onClick={() => selectOperator("add")}
          >
            +
          </button>

          <button
            className="calculator-zero"
            type="button"
            onClick={() => inputDigit("0")}
          >
            0
          </button>

          <button
            type="button"
            onClick={inputDecimal}
          >
            .
          </button>

          <button
            className="calculator-equals"
            type="button"
            onClick={calculateResult}
          >
            =
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default Calculator;