// Used in place of a photo on the What's On "Services" card.
export default function ServiceTimesGraphic() {
  return (
    <div className="service-times-graphic">
      <span className="service-times-graphic-title">Sunday services</span>
      <dl>
        <div>
          <dt>Morning</dt>
          <dd>10:30am</dd>
        </div>
        <div>
          <dt>Evening</dt>
          <dd>5:30pm</dd>
        </div>
      </dl>
    </div>
  );
}
