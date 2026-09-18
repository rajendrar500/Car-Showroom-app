type FlipDigitsProps = {
  value: string;
  label?: string;
};

export function FlipDigits({ value, label }: FlipDigitsProps) {
  return (
    <span className="flip-row" aria-label={label}>
      {value.split('').map((char, index) => (
        char === ':' || char === ' '
          ? <span className="flip-sep" key={`sep-${index}`}>{char === ' ' ? '' : ':'}</span>
          : <span className="flip-digit" key={`${index}-${char}`}><i>{char}</i></span>
      ))}
    </span>
  );
}
