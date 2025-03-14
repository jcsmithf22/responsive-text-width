// Precompiled regex expressions and constants
const WHITESPACE_REGEX = /\s+/g;
const TOKEN_REGEX = /(-?\d*\.?\d+)|[()+\-*/]/g;
const UNIT_REGEX = /([a-z%]+)$/i;

const OPERATOR_PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
};

type Unit = "px" | "em" | "rem" | "%" | "none";

interface ValueWithUnit {
  value: number;
  unit: Unit;
}

function evaluateBasicMath(expr: string): number {
  // Remove all whitespace
  expr = expr.replace(WHITESPACE_REGEX, "");

  // Extract tokens using the precompiled regex
  const tokens: string[] = expr.match(TOKEN_REGEX) || [];

  const output: string[] = [];
  const operators: string[] = [];

  // Process tokens with an inline check to combine '-' with the next numeric token.
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];

    // If token is '-' used as a unary operator, combine with following number.
    if (
      token === "-" &&
      (i === 0 || ["(", "+", "-", "*", "/"].includes(tokens[i - 1])) &&
      i + 1 < tokens.length &&
      !isNaN(+tokens[i + 1])
    ) {
      token = "-" + tokens[i + 1];
      i++; // Skip the next token since it's combined.
    }

    if (!isNaN(+token)) {
      // Token is a number.
      output.push(token);
    } else if (token === "(") {
      operators.push(token);
    } else if (token === ")") {
      // Pop until we find the corresponding '('.
      while (operators.length && operators[operators.length - 1] !== "(") {
        output.push(operators.pop()!);
      }
      operators.pop(); // Remove the '('.
    } else {
      // Token is an operator.
      while (
        operators.length &&
        operators[operators.length - 1] !== "(" &&
        OPERATOR_PRECEDENCE[operators[operators.length - 1]] >=
          OPERATOR_PRECEDENCE[token]
      ) {
        output.push(operators.pop()!);
      }
      operators.push(token);
    }
  }

  // Drain any remaining operators.
  while (operators.length) {
    output.push(operators.pop()!);
  }

  // Evaluate the postfix (RPN) expression.
  const stack: number[] = [];
  for (const token of output) {
    if (!isNaN(+token)) {
      stack.push(+token);
    } else {
      const b = stack.pop()!;
      const a = stack.pop()!;
      switch (token) {
        case "+":
          stack.push(a + b);
          break;
        case "-":
          stack.push(a - b);
          break;
        case "*":
          stack.push(a * b);
          break;
        case "/":
          if (b === 0) throw new Error("Division by zero");
          stack.push(a / b);
          break;
      }
    }
  }
  return stack[0];
}

export function evaluateExpression(expr: string): ValueWithUnit {
  expr = expr.trim();

  // Extract the unit from the end of the expression.
  const unitMatch = expr.match(UNIT_REGEX);
  const unit = (unitMatch?.[1] || "none") as Unit;

  // Remove the unit from the math expression.
  const mathExpr =
    unitMatch && unitMatch.index !== undefined
      ? expr.slice(0, unitMatch.index)
      : expr;

  try {
    const result = evaluateBasicMath(mathExpr);
    if (isNaN(result) || !isFinite(result)) {
      throw new Error("Invalid expression");
    }
    return { value: result, unit };
  } catch (err) {
    throw new Error("Invalid expression");
  }
}
