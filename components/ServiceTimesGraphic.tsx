import { serviceTimes } from "@/lib/content";

// Used in place of a photo on the What's On "Services" card.
export default function ServiceTimesGraphic() {
  return (
    <div className="service-times-graphic">
      <span className="service-times-graphic-title">Sunday services</span>
      <dl>
        <div>
          <dt>Morning</dt>
          <dd>{serviceTimes.morning}</dd>
        </div>
        <div>
          <dt>Evening</dt>
          <dd>{serviceTimes.evening}</dd>
        </div>
      </dl>
    </div>
  );
}
