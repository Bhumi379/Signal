function SignalMark({ className = '' }) {
  return (
    <svg className={`signal-mark ${className}`.trim()} viewBox="0 0 28 28" role="img" aria-label="Signal">
      <path d="M3 16.5h4l2.2-8 4.1 13 2.4-8H25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      <circle cx="3" cy="16.5" r="1.5" fill="currentColor" />
      <circle cx="25" cy="13.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default SignalMark;