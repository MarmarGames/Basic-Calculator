let current = '';
let calc_hist = [];
let isDark = false;

function toggleTheme() {
  if (isDark) {
    isDark = false;
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('themeIcon').textContent = '☀️';
    document.getElementById('themeLabel').textContent = 'Light';
  } else {
    isDark = true;
    document.documentElement.setAttribute("data-theme", "dark");
    document.getElementById('themeIcon').textContent = '🌙';
    document.getElementById("themeLabel").textContent = 'Dark';
  }
}

function refocusInput() {
  document.getElementById('manualInput').focus({ preventScroll: true });
}

function renderExpr() {
  document.getElementById('expr').textContent = current;
}

function setResult(val, err) {
  if (!err) err = '';
  document.getElementById('result').textContent = val || '0';
  document.getElementById('err').textContent = err;
}

function append(ch) {
  current += ch;
  renderExpr();
  setResult(current);
  document.getElementById('err').textContent = '';
  refocusInput();
}

function backspace() {
  if (current.endsWith('sqrt(')) {
    current = current.slice(0, -5);
  } else if (current.endsWith('√(')) {
    current = current.slice(0, -2);
  } else {
    current = current.slice(0, -1);
  }
  renderExpr();
  setResult(current || '0');
  refocusInput();
}

function clearAll() {
  current = '';
  renderExpr();
  setResult('0');
  refocusInput();
}

function smartParen() {
  let depth = 0;
  for (let i = 0; i < current.length; i++) {
    if (current[i] === '(') depth++;
    else if (current[i] === ')') depth--;
  }
  if (depth > 0) {
    append(')');
  } else {
    append('(');
  }
}

function calculate() {
  if (!current) return;
  let expr = current;
  let res = evaluate(expr);
  if (res.error) {
    setResult('Error', res.error);
  } else {
    let f = formatNum(res.result);
    addHistory(expr, f);
    setResult(f);
    current = f;
    renderExpr();
  }
  refocusInput();
}

function evalManual() {
  let inp = document.getElementById('manualInput').value.trim();
  if (!inp) return;
  let res = evaluate(inp);
  current = inp;
  renderExpr();
  if (res.error) {
    setResult('Error', res.error);
  } else {
    let f = formatNum(res.result);
    addHistory(inp, f);
    setResult(f);
    current = f;
    renderExpr();
  }
  document.getElementById('manualInput').value = '';
}

function addHistory(expr, result) {
  calc_hist.unshift({ expr: expr, result: result });
  if (calc_hist.length > 20) calc_hist.pop();
  renderHistory();
}

function renderHistory() {
  let list = document.getElementById('historyList');
  list.innerHTML = '';

  for (let i = 0; i < calc_hist.length; i++) {
    let entry = calc_hist[i];
    let item = document.createElement('div');
    item.className = 'history-item';
    item.title = 'Click to restore expression';
    item.innerHTML = '<span class="history-expr">' + entry.expr + '</span><span class="history-val">= ' + entry.result + '</span>';
    item.onclick = (function(e) {
      return function() {
        current = e.expr;
        renderExpr();
        setResult(e.expr);
      };
    })(entry);
    list.appendChild(item);
  }
}

function clearHistory() {
  calc_hist = [];
  renderHistory();
}

var KB_MAP = {
  '0': 'btn-0', '1': 'btn-1', '2': 'btn-2', '3': 'btn-3', '4': 'btn-4',
  '5': 'btn-5', '6': 'btn-6', '7': 'btn-7', '8': 'btn-8', '9': 'btn-9',
  '.': 'btn-dot', '+': 'btn-add', '-': 'btn-sub', '*': 'btn-mul',
  '/': 'btn-div', '^': 'btn-exp', '(': 'btn-par', ')': 'btn-par',
  'Enter': 'btn-eq', '=': 'btn-eq',
  'Backspace': 'btn-bk', 'Delete': 'btn-bk', 'Escape': 'btn-ac',
  'p': 'btn-pi', 'P': 'btn-pi',
  's': 'btn-sqr', 'S': 'btn-sqr',
  '!': 'btn-fact'
};

document.addEventListener('keydown', function(e) {
  if (document.activeElement === document.getElementById('manualInput')) return;
  let id = KB_MAP[e.key];
  if (!id) return;
  e.preventDefault();
  let btn = document.getElementById(id);
  if (btn) {
    btn.style.opacity = '0.5';
    setTimeout(function() { btn.style.opacity = '1'; }, 120);
  }
  switch (e.key) {
    case 'Enter':
    case '=':
      calculate();
      break;
    case 'Backspace':
    case 'Delete':
      backspace();
      break;
    case 'Escape':
      clearAll();
      break;
    case '(':
      append('(');
      break;
    case ')':
      append(')');
      break;
    case '*':
      append('x');
      break;
    case 'p':
    case 'P':
      append('π');
      break;
    case 's':
    case 'S':
      append('sqrt(');
      break;
    case '!':
      append('!');
      break;
    default:
      append(e.key);
  }
});

function multifactorial(n, step) {
  if (!Number.isInteger(n) || n < 0) throw new Error('Factorial requires a non-negative integer');
  if (n > 170) throw new Error('Result too large to display (overflow)');
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let k = n; k > 0; k -= step) result *= k;
  return result;
}

function formatNum(n) {
  if (!isFinite(n)) return 'Error';
  return String(parseFloat(n.toPrecision(12)));
}

function evaluate(expr) {
  try {
    let tokens = tokenize(expr);
    let val = parseExpr(tokens);
    if (tokens.pos < tokens.length) throw new Error('Unexpected token');
    return { result: val };
  } catch(e) {
    return { error: e.message };
  }
}

function tokenize(expr) {
  let s = expr.replace(/\s+/g, '');
  let toks = [];
  let i = 0;

  while (i < s.length) {
    let ch = s[i];

    if (ch >= '0' && ch <= '9' || ch === '.') {
      let n = '';
      while (i < s.length && (s[i] >= '0' && s[i] <= '9' || s[i] === '.')) {
        n += s[i];
        i++;
      }
      toks.push({ type: 'num', val: parseFloat(n) });

    } else if (s.slice(i, i+4).toLowerCase() === 'sqrt') {
      toks.push({ type: 'fn', val: 'sqrt' });
      i += 4;

    } else if (ch === '√') {
      toks.push({ type: 'fn', val: 'sqrt' });
      i++;

    } else if (ch === 'π') {
      toks.push({ type: 'num', val: Math.PI });
      i++;

    } else if (ch === 'e') {
      let next = s[i+1] || '';
      if (next >= 'a' && next <= 'z' || next >= 'A' && next <= 'Z') {
        throw new Error('Unknown character: ' + ch);
      }
      toks.push({ type: 'num', val: Math.E });
      i++;

    } else if ('+-x*/^()!'.indexOf(ch) !== -1) {
      toks.push({ type: 'op', val: ch });
      i++;

    } else {
      throw new Error('Unknown character: ' + ch);
    }
  }

  toks.pos = 0;
  toks.peek = function() { return toks[toks.pos]; };
  toks.consume = function() { return toks[toks.pos++]; };
  return toks;
}

function parseExpr(t) {
  return parseAddSub(t);
}

function parseAddSub(t) {
  let left = parseMulDiv(t);
  while (t.peek() && t.peek().type === 'op' && (t.peek().val === '+' || t.peek().val === '-')) {
    let op = t.consume().val;
    let right = parseMulDiv(t);
    if (op === '+') {
      left = left + right;
    } else {
      left = left - right;
    }
  }
  return left;
}

function isImplicitMulNext(t) {
  let tok = t.peek();
  if (!tok) return false;
  if (tok.type === 'num') return true;
  if (tok.type === 'fn') return true;
  if (tok.type === 'op' && tok.val === '(') return true;
  return false;
}

function parseMulDiv(t) {
  let left = parseUnary(t);

  while (true) {
    let tok = t.peek();
    if (!tok) break;

    if (tok.type === 'op' && (tok.val === 'x' || tok.val === '*' || tok.val === '/')) {
      let op = t.consume().val;
      let right = parseUnary(t);
      if (op === 'x' || op === '*') {
        left = left * right;
      } else {
        if (right === 0) throw new Error('Undefined, expression is unsolvable, cannot divide by ZERO');
        left = left / right;
      }
    } else if (isImplicitMulNext(t)) {
      left = left * parseUnary(t);
    } else {
      break;
    }
  }
  return left;
}

function parseExp(t) {
  let base = parseAtom(t);

  let bangs = 0;
  while (t.peek() && t.peek().type === 'op' && t.peek().val === '!') {
    t.consume();
    bangs++;
  }
  if (bangs > 0) {
    base = multifactorial(base, bangs);
  }

  if (t.peek() && t.peek().type === 'op' && t.peek().val === '^') {
    t.consume();
    let exp = parseUnary(t);
    if (base === 0 && exp === 0) throw new Error('Indeterminate: 0^0');
    return Math.pow(base, exp);
  }
  return base;
}

function parseUnary(t) {
  if (t.peek() && t.peek().type === 'op' && t.peek().val === '-') {
    t.consume();
    return -parseExp(t);
  }
  if (t.peek() && t.peek().type === 'op' && t.peek().val === '+') {
    t.consume();
    return parseExp(t);
  }
  return parseExp(t);
}

function parseAtom(t) {
  let tok = t.peek();
  if (!tok) throw new Error('Unexpected end of expression');

  if (tok.type === 'num') {
    t.consume();
    return tok.val;
  }

  if (tok.type === 'fn' && tok.val === 'sqrt') {
    t.consume();
    let arg;
    if (t.peek() && t.peek().type === 'op' && t.peek().val === '(') {
      t.consume();
      arg = parseExpr(t);
      if (!t.peek() || t.peek().val !== ')') throw new Error('Missing closing )');
      t.consume();
    } else {
      arg = parseAtom(t);
    }
    if (arg < 0) throw new Error('Cannot take square root of a negative number');
    return Math.sqrt(arg);
  }

  if (tok.type === 'op' && tok.val === '(') {
    t.consume();
    let val = parseExpr(t);
    if (!t.peek() || t.peek().val !== ')') throw new Error('Missing closing )');
    t.consume();
    return val;
  }

  throw new Error('Unexpected token: ' + tok.val);
}
