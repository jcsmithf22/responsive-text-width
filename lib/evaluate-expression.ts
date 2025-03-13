type Unit = "px" | "em" | "rem" | "%" | "none"

interface ValueWithUnit {
  value: number
  unit: Unit
}

// Convert units to pixels for calculation
const unitToPixels: Record<Unit, number> = {
  px: 1,
  em: 16, // Assuming default font size
  rem: 16, // Assuming default font size
  "%": 1, // Percentage is handled separately
  none: 1
}

function evaluateBasicMath(expr: string): number {
  // Remove all whitespace
  expr = expr.replace(/\s+/g, '')
  
  // Match numbers (including decimals), operators, and parentheses
  const tokens = expr.match(/(\d*\.?\d+)|[()+\-*/]/g) || []
  
  // Convert infix to postfix using Shunting Yard algorithm
  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2
  }
  
  const output: string[] = []
  const operators: string[] = []
  
  for (const token of tokens) {
    if (!isNaN(Number(token))) {
      output.push(token)
    } else if (token === '(') {
      operators.push(token)
    } else if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop()!)
      }
      operators.pop() // Remove '('
    } else {
      while (
        operators.length > 0 &&
        operators[operators.length - 1] !== '(' &&
        precedence[operators[operators.length - 1]] >= precedence[token]
      ) {
        output.push(operators.pop()!)
      }
      operators.push(token)
    }
  }
  
  while (operators.length > 0) {
    output.push(operators.pop()!)
  }
  
  // Evaluate postfix expression
  const stack: number[] = []
  
  for (const token of output) {
    if (!isNaN(Number(token))) {
      stack.push(Number(token))
    } else {
      const b = stack.pop()!
      const a = stack.pop()!
      switch (token) {
        case '+':
          stack.push(a + b)
          break
        case '-':
          stack.push(a - b)
          break
        case '*':
          stack.push(a * b)
          break
        case '/':
          if (b === 0) throw new Error('Division by zero')
          stack.push(a / b)
          break
      }
    }
  }
  
  return stack[0]
}

export function evaluateExpression(expr: string): ValueWithUnit {
  // Remove all spaces
  expr = expr.trim()
  
  // Extract unit from the end of the expression
  const unitMatch = expr.match(/([a-z%]+)$/i)
  const unit = (unitMatch?.[1] || 'none') as Unit
  
  // Remove unit from expression
  const mathExpr = expr.replace(/[a-z%]+$/i, '')
  
  try {
    const result = evaluateBasicMath(mathExpr)
    if (isNaN(result) || !isFinite(result)) {
      throw new Error('Invalid expression')
    }
    return { value: result, unit }
  } catch (err) {
    throw new Error('Invalid expression')
  }
}
