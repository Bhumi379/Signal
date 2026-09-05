function InfoTip({ label, children }) {
  return (
    <span className="info-tip" tabIndex="0" role="note" aria-label={label}>
      <span className="info-tip-icon" aria-hidden="true">i</span>
      <span className="info-tip-popover">{children}</span>
    </span>
  );
}

export default InfoTip;
