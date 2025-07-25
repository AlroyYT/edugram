import React, { useState, useEffect, useCallback } from 'react';


interface CalculatorPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalculatorPopup: React.FC<CalculatorPopupProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState<string>('0');
  const [previousValue, setPreviousValue] = useState<string>('');
  const [operation, setOperation] = useState<string>('');
  const [waitingForNewValue, setWaitingForNewValue] = useState<boolean>(false);

  // Handle number input
  const inputNumber = useCallback((num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  }, [display, waitingForNewValue]);

  // Handle decimal point
  const inputDecimal = useCallback(() => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  }, [display, waitingForNewValue]);

  // Clear calculator
  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue('');
    setOperation('');
    setWaitingForNewValue(false);
  }, []);

  // Backspace function
  const backspace = useCallback(() => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display]);

  // Handle basic operations
  const performOperation = useCallback((nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === '') {
      setPreviousValue(display);
    } else if (operation && !waitingForNewValue) {
      const currentValue = parseFloat(previousValue);
      let result: number;

      switch (operation) {
        case '+':
          result = currentValue + inputValue;
          break;
        case '-':
          result = currentValue - inputValue;
          break;
        case '×':
          result = currentValue * inputValue;
          break;
        case '÷':
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
        case '^':
          result = Math.pow(currentValue, inputValue);
          break;
        default:
          return;
      }

      const resultString = result.toString();
      setDisplay(resultString);
      setPreviousValue(resultString);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  }, [display, previousValue, operation, waitingForNewValue]);

  // Calculate result
  const calculate = useCallback(() => {
    performOperation('');
    setOperation('');
    setPreviousValue('');
    setWaitingForNewValue(true);
  }, [performOperation]);

  // Scientific functions
  const scientificOperation = useCallback((func: string) => {
    const inputValue = parseFloat(display);
    let result: number;

    switch (func) {
      case 'sin':
        result = Math.sin(inputValue * Math.PI / 180); // Convert to radians
        break;
      case 'cos':
        result = Math.cos(inputValue * Math.PI / 180);
        break;
      case 'tan':
        result = Math.tan(inputValue * Math.PI / 180);
        break;
      case 'log':
        result = Math.log10(inputValue);
        break;
      case 'ln':
        result = Math.log(inputValue);
        break;
      case '√':
        result = Math.sqrt(inputValue);
        break;
      case '!':
        result = factorial(Math.floor(inputValue));
        break;
      default:
        return;
    }

    setDisplay(result.toString());
    setWaitingForNewValue(true);
  }, [display]);

  // Factorial function
  const factorial = (n: number): number => {
    if (n < 0) return 0;
    if (n === 0 || n === 1) return 1;
    return n * factorial(n - 1);
  };

  // Insert constants
  const insertConstant = useCallback((constant: string) => {
    let value: string;
    switch (constant) {
      case 'π':
        value = Math.PI.toString();
        break;
      case 'e':
        value = Math.E.toString();
        break;
      default:
        return;
    }
    setDisplay(value);
    setWaitingForNewValue(true);
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isOpen) return;

      const { key } = event;
      
      if (key >= '0' && key <= '9') {
        inputNumber(key);
      } else if (key === '.') {
        inputDecimal();
      } else if (key === '+' || key === '-') {
        performOperation(key);
      } else if (key === '*') {
        performOperation('×');
      } else if (key === '/') {
        event.preventDefault();
        performOperation('÷');
      } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculate();
      } else if (key === 'Escape') {
        clear();
      } else if (key === 'Backspace') {
        backspace();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, inputNumber, inputDecimal, performOperation, calculate, clear, backspace]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="calculator-backdrop" onClick={handleBackdropClick}>
      <div className="calculator-popup">
        {/* Header */}
        <div className="calculator-header">
          <h3>Scientific Calculator</h3>
          <button className="close-button" onClick={onClose} aria-label="Close calculator">
            ×
          </button>
        </div>

        {/* Display */}
        <div className="calculator-display">
          <div className="display-text">{display}</div>
        </div>

        {/* Button Grid */}
        <div className="calculator-buttons">
          {/* Row 1 - Scientific Functions */}
          <button className="btn btn-scientific" onClick={() => scientificOperation('sin')}>sin</button>
          <button className="btn btn-scientific" onClick={() => scientificOperation('cos')}>cos</button>
          <button className="btn btn-scientific" onClick={() => scientificOperation('tan')}>tan</button>
          <button className="btn btn-scientific" onClick={() => scientificOperation('log')}>log</button>
          <button className="btn btn-scientific" onClick={() => scientificOperation('ln')}>ln</button>

          {/* Row 2 - More Scientific Functions */}
          <button className="btn btn-scientific" onClick={() => scientificOperation('√')}>√</button>
          <button className="btn btn-scientific" onClick={() => performOperation('^')}>x^y</button>
          <button className="btn btn-scientific" onClick={() => scientificOperation('!')}>x!</button>
          <button className="btn btn-scientific" onClick={() => insertConstant('π')}>π</button>
          <button className="btn btn-scientific" onClick={() => insertConstant('e')}>e</button>

          {/* Row 3 - Clear and Backspace */}
          <button className="btn btn-clear" onClick={clear}>C</button>
          <button className="btn btn-backspace" onClick={backspace}>⌫</button>
          <div className="btn-spacer"></div>
          <div className="btn-spacer"></div>
          <button className="btn btn-operator" onClick={() => performOperation('÷')}>÷</button>

          {/* Row 4 - Numbers 7,8,9 and × */}
          <button className="btn btn-number" onClick={() => inputNumber('7')}>7</button>
          <button className="btn btn-number" onClick={() => inputNumber('8')}>8</button>
          <button className="btn btn-number" onClick={() => inputNumber('9')}>9</button>
          <div className="btn-spacer"></div>
          <button className="btn btn-operator" onClick={() => performOperation('×')}>×</button>

          {/* Row 5 - Numbers 4,5,6 and - */}
          <button className="btn btn-number" onClick={() => inputNumber('4')}>4</button>
          <button className="btn btn-number" onClick={() => inputNumber('5')}>5</button>
          <button className="btn btn-number" onClick={() => inputNumber('6')}>6</button>
          <div className="btn-spacer"></div>
          <button className="btn btn-operator" onClick={() => performOperation('-')}>-</button>

          {/* Row 6 - Numbers 1,2,3 and + */}
          <button className="btn btn-number" onClick={() => inputNumber('1')}>1</button>
          <button className="btn btn-number" onClick={() => inputNumber('2')}>2</button>
          <button className="btn btn-number" onClick={() => inputNumber('3')}>3</button>
          <div className="btn-spacer"></div>
          <button className="btn btn-operator" onClick={() => performOperation('+')}>+</button>

          {/* Row 7 - 0, decimal, and equals */}
          <button className="btn btn-number btn-zero" onClick={() => inputNumber('0')}>0</button>
          <button className="btn btn-number" onClick={inputDecimal}>.</button>
          <div className="btn-spacer"></div>
          <div className="btn-spacer"></div>
          <button className="btn btn-equals" onClick={calculate}>=</button>
        </div>
      </div>
    </div>
  );
};

export default CalculatorPopup;