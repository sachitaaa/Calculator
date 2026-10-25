const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const labelEl = document.getElementById("displayLabel");
const keypad = document.getElementById("keypad");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");

let expression = "";
let justCalculated = false;
let history = [];

const operators = ["+", "−", "×", "÷"];

function prettyExpression(value) {
  return value || "0";
}

function render() {
  expressionEl.textContent = prettyExpression(expression);
  resultEl.textContent = expression ? preview(expression) : "0";
}

function preview(value) {
  try {
    const result = calculate(value);
    return Number.isFinite(result) ? formatNumber(result) : "—";
  } catch {
    return "—";
  }
}

function formatNumber(number) {
  if (!Number.isFinite(number)) return "Error";
  if (Object.is(number, -0)) number = 0;
  return Number(number.toPrecision(11)).toString();
}

function appendValue(value) {
  if (justCalculated && !operators.includes(value)) expression = "";
  justCalculated = false;

  if (operators.includes(value)) {
    if (!expression) {
      if (value === "−") expression = "−";
      else return;
    } else if (operators.includes(expression.slice(-1))) {
      expression = expression.slice(0, -1) + value;
    } else {
      expression += value;
    }
  } else {
    const currentNumber = expression.split(/[+−×÷]/).pop();
    if (value === "." && currentNumber.includes(".")) return;
    if (value === "." && (!currentNumber || operators.includes(expression.slice(-1)))) {
      expression += "0.";
    } else {
      expression += value;
    }
  }
  labelEl.textContent = "READY WHEN YOU ARE";
  render();
}

function calculate(input) {
  // Parse only calculator tokens; never execute arbitrary JavaScript.
  const normalized = input.replaceAll("×", "*").replaceAll("÷", "/").replaceAll("−", "-");
  const tokens = normalized.match(/(?:\d*\.\d+|\d+\.?\d*|[+*/-])/g);
  if (!tokens || tokens.join("") !== normalized.replace(/\s/g, "")) throw new Error("Invalid expression");

  let position = 0;
  function factor() {
    if (tokens[position] === "-") {
      position++;
      return -factor();
    }
    if (tokens[position] === "+") {
      position++;
      return factor();
    }
    const token = tokens[position++];
    const number = Number(token);
    if (!token || !Number.isFinite(number)) throw new Error("Invalid number");
    return number;
  }
  function term() {
    let value = factor();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++];
      const right = factor();
      if (operator === "/" && right === 0) throw new Error("Cannot divide by zero");
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }
  function sum() {
    let value = term();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];
      const right = term();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  const result = sum();
  if (position !== tokens.length) throw new Error("Incomplete expression");
  return result;
}

function showError(message = "Check your expression") {
  labelEl.textContent = message.toUpperCase();
  resultEl.textContent = "Oops!";
}

function equals() {
  if (!expression) return;
  try {
    const answer = calculate(expression);
    if (!Number.isFinite(answer)) throw new Error("Invalid result");
    history.unshift({ expression, answer: formatNumber(answer) });
    history = history.slice(0, 8);
    renderHistory();
    expression = formatNumber(answer);
    labelEl.textContent = "CALCULATION COMPLETE";
    justCalculated = true;
    render();
  } catch (error) {
    showError(error.message === "Cannot divide by zero" ? "Cannot divide by zero" : "Check your expression");
  }
}

function clearAll() {
  expression = "";
  justCalculated = false;
  labelEl.textContent = "READY WHEN YOU ARE";
  resultEl.textContent = "0";
  expressionEl.textContent = "0";
}

function backspace() {
  if (justCalculated) {
    clearAll();
    return;
  }
  expression = expression.slice(0, -1);
  render();
}

function changeSign() {
  if (!expression) {
    expression = "−";
  } else {
    const match = expression.match(/(\d*\.?\d+)$/);
    if (!match) return;
    const start = match.index;
    const before = expression.slice(0, start);
    const number = match[0];
    if (before.endsWith("−") && (before.length === 1 || operators.includes(before.slice(-2, -1)))) {
      expression = before.slice(0, -1) + number;
    } else {
      expression = before + "−" + number;
    }
  }
  justCalculated = false;
  render();
}

function percent() {
  const match = expression.match(/(\d*\.?\d+)$/);
  if (!match) return;
  const start = match.index;
  const number = Number(match[0]) / 100;
  expression = expression.slice(0, start) + formatNumber(number);
  justCalculated = false;
  render();
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<p class="empty-history">Your calculations will appear here.</p>';
    return;
  }
  historyList.replaceChildren();
  history.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";
    const expression = document.createElement("span");
    expression.textContent = item.expression;
    const answer = document.createElement("strong");
    answer.textContent = `= ${item.answer}`;
    row.append(expression, answer);
    historyList.append(row);
  });
}

keypad.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const { value, action } = button.dataset;
  if (value !== undefined) appendValue(value);
  else if (action === "clear") clearAll();
  else if (action === "backspace") backspace();
  else if (action === "decimal") appendValue(".");
  else if (action === "sign") changeSign();
  else if (action === "percent") percent();
  else if (action === "equals") equals();
});

document.getElementById("historyToggle").addEventListener("click", () => {
  historyPanel.hidden = !historyPanel.hidden;
});
document.getElementById("clearHistory").addEventListener("click", () => {
  history = [];
  renderHistory();
});

document.addEventListener("keydown", event => {
  if (/^[0-9]$/.test(event.key)) appendValue(event.key);
  else if (event.key === ".") appendValue(".");
  else if (event.key === "+") appendValue("+");
  else if (event.key === "-") appendValue("−");
  else if (event.key === "*") appendValue("×");
  else if (event.key === "/") { event.preventDefault(); appendValue("÷"); }
  else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); equals(); }
  else if (event.key === "Backspace") backspace();
  else if (event.key === "Escape") clearAll();
  else if (event.key === "%") percent();
});

render();
